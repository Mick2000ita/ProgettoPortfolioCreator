import { Component } from '@angular/core';
import { TestButtonComponent } from "../test-button/test-button.component";
import { GoogleLoginComponent } from "../google-login-component/google-login-component";
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-login-page',
  imports: [TestButtonComponent, GoogleLoginComponent, CardModule],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {

  user: boolean = true;

}
