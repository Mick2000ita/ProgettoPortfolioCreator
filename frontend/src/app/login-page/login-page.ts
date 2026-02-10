import { Component } from '@angular/core';
import { GoogleLoginComponent } from "../google-login-component/google-login-component";
import { CardModule } from 'primeng/card';
import { FloatLabelModule } from 'primeng/floatlabel';
import { PasswordModule } from 'primeng/password';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-login-page',
  imports: [ GoogleLoginComponent, CardModule, FloatLabelModule, PasswordModule, FormsModule, InputTextModule],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {



  user: string | undefined;
  password: string | undefined;

}
