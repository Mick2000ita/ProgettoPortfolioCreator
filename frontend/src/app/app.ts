import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CookieConsentService } from './services/cookie-consent.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly cookieConsentService = inject(CookieConsentService);
  protected readonly title = signal('frontend');
}
