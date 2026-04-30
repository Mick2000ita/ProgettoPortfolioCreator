import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';

export type CookieConsentStatus = 'pending' | 'accepted' | 'rejected';

const COOKIE_CONSENT_STORAGE_KEY = 'portfolio_creator_cookie_consent';

@Injectable({
  providedIn: 'root',
})
export class CookieConsentService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly consentStatus = signal<CookieConsentStatus>(this.readStoredConsent());

  readonly status = this.consentStatus.asReadonly();
  readonly hasAccepted = computed(() => this.consentStatus() === 'accepted');
  readonly hasRejected = computed(() => this.consentStatus() === 'rejected');
  readonly shouldShowBanner = computed(() => this.consentStatus() === 'pending');

  accept() {
    this.setConsent('accepted');
  }

  reject() {
    this.setConsent('rejected');
  }

  reset() {
    if (this.isBrowser()) {
      window.localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY);
    }
    this.consentStatus.set('pending');
  }

  private setConsent(status: CookieConsentStatus) {
    this.consentStatus.set(status);

    if (!this.isBrowser()) {
      return;
    }

    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, status);
  }

  private readStoredConsent(): CookieConsentStatus {
    if (!this.isBrowser()) {
      return 'pending';
    }

    const storedConsent = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    return storedConsent === 'accepted' || storedConsent === 'rejected'
      ? storedConsent
      : 'pending';
  }

  private isBrowser() {
    return isPlatformBrowser(this.platformId);
  }
}
