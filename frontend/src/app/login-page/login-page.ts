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
  // rimuove eventuale toast precedente
  this.messageService.clear('registerToast');

  if (!this.password || !this.confirmPassword) {
     this.messageService.add({ 
       key: 'registerToast',
       severity: 'warn', 
       summary: 'Warning', 
       detail: 'Inserisci entrambe le password' 
     });
    return;
  }

  if (this.password !== this.confirmPassword) {
     this.messageService.add({ 
       key: 'registerToast',
       severity: 'warn', 
       summary: 'Warning', 
       detail: 'Le password non corrispondono' 
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
