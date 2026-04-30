import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthApiService, LoginResponseDto } from './auth-api.service';

const ACCESS_TOKEN_COOKIE = 'portfolio_creator_access_token';
const REFRESH_TOKEN_COOKIE = 'portfolio_creator_refresh_token';
const USER_COOKIE = 'portfolio_creator_user';
const PROVIDER_COOKIE = 'portfolio_creator_provider';
const REMEMBER_ME_COOKIE = 'portfolio_creator_remember_me';
const SESSION_STORAGE_KEY = 'portfolio_creator_session';
const REMEMBERED_SESSION_STORAGE_KEY = 'portfolio_creator_remembered_session';
const THIRTY_DAYS_IN_SECONDS = 60 * 60 * 24 * 30;

export interface SessionUser {
  email?: string | null;
  username: string;
  avatarUrl?: string | null;
}

interface SessionState {
  accessToken?: string | null;
  refreshToken?: string | null;
  provider: 'credentials' | 'google';
  rememberMe: boolean;
  user: SessionUser;
}

@Injectable({
  providedIn: 'root',
})
export class AuthSessionService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly authApiService = inject(AuthApiService);

  private readonly sessionState = signal<SessionState | null>(null);
  private refreshInFlight: Promise<string | null> | null = null;

  readonly user = computed(() => this.sessionState()?.user ?? null);
  readonly authenticated = computed(() => this.sessionState() !== null);
  readonly provider = computed(() => this.sessionState()?.provider ?? 'credentials');
  readonly isGoogleSession = computed(() => this.provider() === 'google');

  async initializeSession() {
    if (!this.isBrowser()) {
      return;
    }

    const accessToken = this.readCookie(ACCESS_TOKEN_COOKIE);
    const refreshToken = this.readCookie(REFRESH_TOKEN_COOKIE);
    const storedSession = this.readStoredSession();
    const sessionAccessToken = accessToken ?? storedSession?.accessToken ?? null;
    const sessionRefreshToken = refreshToken ?? storedSession?.refreshToken ?? null;
    const rememberedSession = this.readRememberedSessionFlag(sessionRefreshToken, storedSession);
    const user = storedSession?.user ?? this.readUserCookie() ?? null;
    const provider = this.readProviderCookie(storedSession?.provider);

    if (sessionAccessToken && user && !this.isJwtExpired(sessionAccessToken)) {
      this.sessionState.set({
        accessToken: sessionAccessToken,
        refreshToken: sessionRefreshToken,
        provider,
        rememberMe: rememberedSession,
        user,
      });
      return;
    }

    if (sessionRefreshToken) {
      try {
        const response = await firstValueFrom(
          this.authApiService.refreshSession(sessionRefreshToken),
        );
        this.saveLoginSession(response, {
          rememberMe: rememberedSession,
          provider,
        });
        return;
      } catch {
        this.clearSession();
        return;
      }
    }

    this.clearSession();
  }

  saveLoginSession(
    response: LoginResponseDto,
    options?: { rememberMe?: boolean; provider?: 'credentials' | 'google' },
  ) {
    const rememberMe = Boolean(options?.rememberMe);
    const session: SessionState = {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      provider: options?.provider ?? 'credentials',
      rememberMe,
      user: {
        email: response.user.email,
        username: response.user.username,
        avatarUrl: response.user.avatarUrl,
      },
    };

    this.persistSession(session);
  }

  getUser() {
    return this.user();
  }

  isAuthenticated() {
    return this.authenticated();
  }

  updateSessionUser(user: SessionUser) {
    const currentSession = this.sessionState();
    if (!currentSession) {
      return;
    }

    this.persistSession({
      ...currentSession,
      user: {
        ...currentSession.user,
        ...user,
      },
    });
  }

  getAccessToken() {
    return this.sessionState()?.accessToken ?? this.readCookie(ACCESS_TOKEN_COOKIE);
  }

  getRefreshToken() {
    return this.sessionState()?.refreshToken ?? this.readCookie(REFRESH_TOKEN_COOKIE);
  }

  async refreshAccessToken() {
    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }

    this.refreshInFlight = this.performTokenRefresh();

    try {
      return await this.refreshInFlight;
    } finally {
      this.refreshInFlight = null;
    }
  }

  clearSession() {
    if (this.isBrowser()) {
      this.deleteCookie(ACCESS_TOKEN_COOKIE);
      this.deleteCookie(REFRESH_TOKEN_COOKIE);
      this.deleteCookie(USER_COOKIE);
      this.deleteCookie(PROVIDER_COOKIE);
      this.deleteCookie(REMEMBER_ME_COOKIE);
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      window.localStorage.removeItem(REMEMBERED_SESSION_STORAGE_KEY);
    }

    this.sessionState.set(null);
  }

  private persistSession(session: SessionState) {
    if (!this.isBrowser()) {
      this.sessionState.set(session);
      return;
    }

    const maxAge = session.rememberMe ? THIRTY_DAYS_IN_SECONDS : undefined;

    if (session.accessToken) {
      this.writeCookie(ACCESS_TOKEN_COOKIE, session.accessToken, maxAge);
    } else {
      this.deleteCookie(ACCESS_TOKEN_COOKIE);
    }

    if (session.refreshToken) {
      this.writeCookie(REFRESH_TOKEN_COOKIE, session.refreshToken, maxAge);
    } else {
      this.deleteCookie(REFRESH_TOKEN_COOKIE);
    }

    this.writeCookie(USER_COOKIE, JSON.stringify(this.toCookieUser(session.user)), maxAge);
    this.writeCookie(PROVIDER_COOKIE, session.provider, maxAge);
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));

    if (session.rememberMe) {
      this.writeCookie(REMEMBER_ME_COOKIE, 'true', THIRTY_DAYS_IN_SECONDS);
      window.localStorage.setItem(REMEMBERED_SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      this.deleteCookie(REMEMBER_ME_COOKIE);
      window.localStorage.removeItem(REMEMBERED_SESSION_STORAGE_KEY);
    }

    this.sessionState.set(session);
  }

  private async performTokenRefresh() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.clearSession();
      return null;
    }

    const storedSession = this.readStoredSession();
    const rememberMe = this.readRememberedSessionFlag(refreshToken, storedSession);
    const provider = this.readProviderCookie(storedSession?.provider);

    try {
      const response = await firstValueFrom(this.authApiService.refreshSession(refreshToken));
      this.saveLoginSession(response, {
        rememberMe,
        provider,
      });
      return response.accessToken;
    } catch {
      this.clearSession();
      return null;
    }
  }

  private writeCookie(name: string, value: string, maxAgeSeconds?: number) {
    const secureAttribute =
      typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
    const maxAgeAttribute = typeof maxAgeSeconds === 'number' ? `; Max-Age=${maxAgeSeconds}` : '';

    this.document.cookie =
      `${name}=${encodeURIComponent(value)}; Path=/; SameSite=Lax` +
      `${maxAgeAttribute}${secureAttribute}`;
  }

  private readCookie(name: string) {
    if (!this.isBrowser()) {
      return null;
    }

    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = this.document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  }

  private deleteCookie(name: string) {
    this.document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
  }

  private readUserCookie() {
    const rawUser = this.readCookie(USER_COOKIE);
    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(rawUser) as SessionUser;
    } catch {
      this.deleteCookie(USER_COOKIE);
      return null;
    }
  }

  private readStoredSession() {
    return this.readSessionStorageSession() ?? this.readRememberedSession();
  }

  private readSessionStorageSession() {
    if (!this.isBrowser()) {
      return null;
    }

    const rawSession = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!rawSession) {
      return null;
    }

    try {
      return JSON.parse(rawSession) as SessionState;
    } catch {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
  }

  private toCookieUser(user: SessionUser): SessionUser {
    const cookieUser = { ...user };
    const serializedUser = JSON.stringify(cookieUser);

    if (serializedUser.length > 3000) {
      cookieUser.avatarUrl = null;
    }

    return cookieUser;
  }

  private readProviderCookie(
    fallback: 'credentials' | 'google' = 'credentials',
  ): 'credentials' | 'google' {
    const provider = this.readCookie(PROVIDER_COOKIE);
    if (provider === 'google' || provider === 'credentials') {
      return provider;
    }
    return fallback;
  }

  private isJwtExpired(token: string) {
    try {
      const payload = this.readJwtPayload<{ exp?: number }>(token);
      if (!payload.exp) {
        return true;
      }

      return payload.exp * 1000 <= Date.now();
    } catch {
      return true;
    }
  }

  private readRememberedSessionFlag(
    refreshToken?: string | null,
    storedSession?: SessionState | null,
  ) {
    if (this.readCookie(REMEMBER_ME_COOKIE) === 'true' || storedSession?.rememberMe) {
      return true;
    }

    if (!refreshToken) {
      return false;
    }

    try {
      const payload = this.readJwtPayload<{ rememberMe?: boolean | string }>(refreshToken);
      return payload.rememberMe === true || payload.rememberMe === 'true';
    } catch {
      return false;
    }
  }

  private readRememberedSession() {
    if (!this.isBrowser()) {
      return null;
    }

    const rawSession = window.localStorage.getItem(REMEMBERED_SESSION_STORAGE_KEY);
    if (!rawSession) {
      return null;
    }

    try {
      return JSON.parse(rawSession) as SessionState;
    } catch {
      window.localStorage.removeItem(REMEMBERED_SESSION_STORAGE_KEY);
      return null;
    }
  }

  private readJwtPayload<T extends object>(token: string) {
    const payloadSegment = token.split('.')[1];
    if (!payloadSegment) {
      throw new Error('JWT payload is missing');
    }

    return JSON.parse(this.decodeBase64Url(payloadSegment)) as T;
  }

  private decodeBase64Url(value: string) {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return window.atob(padded);
  }

  private isBrowser() {
    return isPlatformBrowser(this.platformId);
  }
}
