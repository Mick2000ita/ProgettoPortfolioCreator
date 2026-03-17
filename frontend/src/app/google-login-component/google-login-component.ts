import { Component, AfterViewInit, PLATFORM_ID, inject, NgZone } from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';
import { environment } from '../../environments/environment';
import { AuthService } from '../login-page/auth.service';

@Component({
  selector: 'app-google-login',
  template: `<div id="google-btn"></div>`
})
export class GoogleLoginComponent implements AfterViewInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly authService = inject(AuthService);
  private readonly ngZone = inject(NgZone);
  private readonly document = inject(DOCUMENT);

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const win = this.document.defaultView as any;

    const initialize = () => {
      win.google.accounts.id.initialize({
        client_id: environment.googleClientId,
        callback: (response: any) =>
          this.ngZone.run(() => this.handleCredential(response.credential))
      });
      win.google.accounts.id.renderButton(
        this.document.getElementById('google-btn'),
        { theme: 'outline', size: 'large', width: '100%' }
      );
    };

    if (win.google?.accounts?.id) {
      initialize();
    } else {
      win.onGoogleLibraryLoad = initialize;
    }
  }

  private handleCredential(idToken: string): void {
    this.authService.googleLogin(idToken).subscribe({
      next: res => console.log('Google login OK', res.user),
      error: err => console.error('Google login failed', err)
    });
  }
}