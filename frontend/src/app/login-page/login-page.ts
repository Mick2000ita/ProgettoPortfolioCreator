import { Component, HostListener, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { GoogleLoginComponent } from "../google-login-component/google-login-component";
import { CardModule } from 'primeng/card';
import { FloatLabelModule } from 'primeng/floatlabel';
import { PasswordModule } from 'primeng/password';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-login-page',
  imports: [GoogleLoginComponent, CardModule, FloatLabelModule, PasswordModule, FormsModule, InputTextModule, ButtonModule, ToastModule, TranslateModule],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
  providers: [MessageService]
})
export class LoginPage {
  confirmPassword: string | undefined;
  password: string | undefined;
  user: string | undefined;
  email: any;
  registrationFormVisible: boolean = false;

  private messageService = inject(MessageService);
  private translate = inject(TranslateService);
  private platformId = inject(PLATFORM_ID);

  isSmallScreen = false;

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    if (isPlatformBrowser(this.platformId)) {
      this.isSmallScreen = window.innerWidth < 920;
    }
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.isSmallScreen = window.innerWidth < 920;
    }
  }

  registerUser() {
    const errors: string[] = [];

    if (!this.user) {
      errors.push(this.translate.instant('login.errors.username_required'));
    }

    if (!this.email) {
      errors.push(this.translate.instant('login.errors.email_required'));
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.email)) {
        errors.push(this.translate.instant('login.errors.email_invalid'));
      }
    }

    if (!this.password || !this.confirmPassword) {
      errors.push(this.translate.instant('login.errors.passwords_required'));
    } else if (this.password !== this.confirmPassword) {
      errors.push(this.translate.instant('login.errors.passwords_mismatch'));
    }

    this.messageService.clear('registerToast');

    if (errors.length > 0) {
      this.messageService.add({
        key: 'registerToast',
        severity: 'warn',
        summary: this.translate.instant('login.toast.warning'),
        detail: errors.join(', ')
      });
      return;
    }

    this.messageService.add({
      key: 'registerToast',
      severity: 'success',
      summary: this.translate.instant('login.toast.success'),
      detail: this.translate.instant('login.errors.registration_success')
    });
  }

  openRegisterForm() {
    this.registrationFormVisible = !this.registrationFormVisible;
  }
}
