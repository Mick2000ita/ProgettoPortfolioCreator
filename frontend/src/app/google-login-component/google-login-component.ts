import { AfterViewInit, Component, ElementRef, EventEmitter, Output, ViewChild, inject } from '@angular/core';
import { input } from '@angular/core';
import { Router } from '@angular/router';
import { AuthApiService } from '../services/auth-api.service';
import { AuthSessionService } from '../services/auth-session.service';

declare var google: any;

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

  ngAfterViewInit(): void {
    if (typeof window === 'undefined' || typeof google === 'undefined') {
      return;
    }

    const hostElement = this.googleButtonHost.nativeElement;
    hostElement.innerHTML = '';

    google.accounts.id.initialize({
      client_id: '707290238106-bu0h2h60r609ib3k2ia53cr0cbaaofer.apps.googleusercontent.com',
      callback: (response: any) => this.login(response.credential)
    });

    google.accounts.id.renderButton(hostElement, {
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      width: hostElement.clientWidth || 320
    });
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
          void this.router.navigate(['/home']);
        },
        error: () => {
          this.loginError.emit('Non è stato possibile completare il login con Google');
        }
      });
  }
}
