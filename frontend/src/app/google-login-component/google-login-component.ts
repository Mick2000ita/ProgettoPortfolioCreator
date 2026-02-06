import { Component, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

declare var google: any;

@Component({
  selector: 'app-google-login',
  template: `<div id="google-btn"></div>`
})
export class GoogleLoginComponent implements AfterViewInit {

  constructor(private http: HttpClient) {}

  ngAfterViewInit(): void {
    google.accounts.id.initialize({
      client_id: 'GOOGLE_CLIENT_ID.apps.googleusercontent.com',
      callback: (response: any) => this.login(response.credential)
    });

    google.accounts.id.renderButton(
      document.getElementById('google-btn'),
      { theme: 'outline', size: 'large' }
    );
  }

  login(idToken: string) {
    this.http.post('http://localhost:8080/api/auth/google', {
      token: idToken
    }).subscribe(res => {
      console.log('Login OK', res);
    });
  }
}