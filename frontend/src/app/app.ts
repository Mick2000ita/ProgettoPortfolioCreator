import { NgIf } from '@angular/common';
import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TestButtonComponent } from "./test-button/test-button.component";
import { GoogleLoginComponent } from "./google-login-component/google-login-component";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TestButtonComponent, GoogleLoginComponent],  
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('frontend');
}
