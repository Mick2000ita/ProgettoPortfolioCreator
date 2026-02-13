import { Component, HostListener, inject } from '@angular/core';
import { GoogleLoginComponent } from "../google-login-component/google-login-component";
import { CardModule } from 'primeng/card';
import { FloatLabelModule } from 'primeng/floatlabel';
import { PasswordModule } from 'primeng/password';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-login-page',
  imports: [ GoogleLoginComponent, CardModule, FloatLabelModule, PasswordModule, FormsModule, InputTextModule, ButtonModule, ToastModule],
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


isSmallScreen = false;

@HostListener('window:resize', ['$event'])
onResize(event: any) {
  this.isSmallScreen = window.innerWidth < 920;
}

ngOnInit() {
  this.isSmallScreen = window.innerWidth < 920;
}

registerUser() {
  const errors: string[] = [];

  if (!this.user) {
    errors.push('Inserisci il nome utente');
  }

  if (!this.email) {
    errors.push('Inserisci l\'email');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      errors.push('Email non valida');
    }
  }

  if (!this.password || !this.confirmPassword) {
    errors.push('Inserisci entrambe le password');
  } else if (this.password !== this.confirmPassword) {
    errors.push('Le password non corrispondono');
  }

  this.messageService.clear('registerToast');

  if (errors.length > 0) {
    this.messageService.add({
      key: 'registerToast',
      severity: 'warn',
      summary: 'Warning',
      detail: errors.join(', ')
    });
    return;
  }

  this.messageService.add({
    key: 'registerToast',
    severity: 'success',
    summary: 'Success',
    detail: 'Registrazione avvenuta con successo'
  });
}
  openRegisterForm() {
    this.registrationFormVisible = !this.registrationFormVisible;
  }


}
