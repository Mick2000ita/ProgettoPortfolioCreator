import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CookieConsentService } from '../services/cookie-consent.service';

@Component({
  selector: 'app-privacy-page',
  imports: [RouterLink],
  templateUrl: './privacy-page.html',
  styleUrl: './privacy-page.scss',
})
export class PrivacyPage {
  protected readonly cookieConsentService = inject(CookieConsentService);
  protected readonly lastUpdated = '30 aprile 2026';
}
