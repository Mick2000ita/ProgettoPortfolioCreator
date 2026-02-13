import { NgIf } from '@angular/common';
import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { LoginPage } from "./login-page/login-page";
import { ReactiveBg } from "./reactive-bg/reactive-bg";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LoginPage, ReactiveBg],  
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('frontend');
}
