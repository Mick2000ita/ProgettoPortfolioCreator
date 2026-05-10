import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Output,
  ViewChild,
  effect,
  inject,
  signal,
} from '@angular/core';
import { input } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { AuthApiService } from '../services/auth-api.service';
import { AuthSessionService } from '../services/auth-session.service';
import { CookieConsentService } from '../services/cookie-consent.service';

declare var google: any;

let googleIdentityScriptPromise: Promise<void> | null = null;

@Component({
  selector: 'app-google-login',
  templateUrl: './google-login-component.html',
  styleUrl: './google-login-component.scss'
})
export class GoogleLoginComponent implements AfterViewInit {
  @ViewChild('googleButtonHost', { static: true }) googleButtonHost!: ElementRef<HTMLDivElement>;
  @Output() loginError = new EventEmitter<string>();
  readonly rememberMe = input(false);

  private readonly router = inject(Router);
  private readonly authApiService = inject(AuthApiService);
  private readonly authSessionService = inject(AuthSessionService);
  protected readonly cookieConsentService = inject(CookieConsentService);
  protected readonly googleLoginMessage = signal(
    'Accetta i cookie per usare il login Google.',
  );
  private hasInitializedGoogleButton = false;
  private viewInitialized = false;

  private readonly consentEffect = effect(() => {
    if (this.cookieConsentService.hasAccepted() && this.viewInitialized) {
      void this.renderGoogleButton();
    }
  });

  ngAfterViewInit(): void {
    this.viewInitialized = true;

    if (typeof window === 'undefined') {
      return;
    }

    if (this.cookieConsentService.hasAccepted()) {
      void this.renderGoogleButton();
    }
  }

  protected acceptCookiesForGoogleLogin() {
    this.cookieConsentService.accept();
  }

  private async renderGoogleButton() {
    if (this.hasInitializedGoogleButton || typeof window === 'undefined') {
      return;
    }

    const hostElement = this.googleButtonHost.nativeElement;
    const clientId = environment.googleClientId?.trim();

    if (!clientId) {
      this.loginError.emit('Google Login non configurato: client ID mancante');
      return;
    }

    this.googleLoginMessage.set('Sto preparando Google Login...');

    try {
      await this.loadGoogleIdentityScript();
    } catch {
      this.googleLoginMessage.set('Non e stato possibile caricare Google Login.');
      this.loginError.emit('Non e stato possibile caricare Google Login');
      return;
    }

    if (typeof google === 'undefined') {
      this.googleLoginMessage.set('Google Login non disponibile.');
      return;
    }

    hostElement.innerHTML = '';
    this.hasInitializedGoogleButton = true;

    google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: any) => this.login(response.credential),
    });

    google.accounts.id.renderButton(hostElement, {
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      width: hostElement.clientWidth || 320,
    });
  }

  private loadGoogleIdentityScript() {
    if (typeof google !== 'undefined') {
      return Promise.resolve();
    }

    if (googleIdentityScriptPromise) {
      return googleIdentityScriptPromise;
    }

    googleIdentityScriptPromise = new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[src="https://accounts.google.com/gsi/client"]',
      );

      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener('error', () => reject(), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.addEventListener('load', () => resolve(), { once: true });
      script.addEventListener('error', () => reject(), { once: true });
      document.head.appendChild(script);
    });

    return googleIdentityScriptPromise;
  }

  login(idToken: string) {
    this.authApiService
      .loginWithGoogle({
        token: idToken,
        rememberMe: this.rememberMe()
      })
      .subscribe({
        next: (response) => {
          this.authSessionService.saveLoginSession(response, {
            rememberMe: this.rememberMe(),
            provider: 'google'
          });
          void this.router.navigate(['/analytics']);
        },
        error: () => {
          this.loginError.emit('Non è stato possibile completare il login con Google');
        }
      });
  }
}
