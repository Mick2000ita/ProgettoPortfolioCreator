import { Component, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

declare var google: any;

@Component({
  selector: 'app-google-login',
  template: `<div id="google-btn"></div>`
})
export class GoogleLoginComponent implements AfterViewInit {

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) private platformId: object) {}

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
    this.http.post(`${environment.apiUrl}/api/auth/google`, {
      token: idToken
    }).subscribe(res => {
      console.log('Login OK', res);
    });
  }
}