import { Component, AfterViewInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../environments/environment';
import { AuthService } from '../login-page/auth.service';

declare var google: any;

@Component({
  selector: 'app-google-login',
  template: `<div id="google-btn"></div>`
})
export class GoogleLoginComponent implements AfterViewInit {
  private platformId = inject(PLATFORM_ID);
  private authService = inject(AuthService);

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (response: any) => this.login(response.credential)
    });

    google.accounts.id.renderButton(
      document.getElementById('google-btn'),
      { theme: 'outline', size: 'large' }
    );
  }

  login(idToken: string) {
    this.authService.googleLogin(idToken).subscribe({
      next: res => console.log('Google login OK', res.user),
      error: err => console.error('Google login failed', err)
    });
  }
}