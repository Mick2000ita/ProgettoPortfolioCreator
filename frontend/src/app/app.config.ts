import { ApplicationConfig, PLATFORM_ID, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import nora from '@primeuix/themes/nora';

import { routes } from './app.routes';
import { isPlatformBrowser } from '@angular/common';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { TranslateService, provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

const SUPPORTED_LANGS = ['it', 'en'];
const FALLBACK_LANG = 'it';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch()),
    providePrimeNG({ theme: { preset: nora, options: { darkModeSelector: ':root' } } }),
    provideTranslateService(),
    provideTranslateHttpLoader({ prefix: '/i18n/', suffix: '.json' }),
    provideAppInitializer(() => {
      const platformId = inject(PLATFORM_ID);
      if (!isPlatformBrowser(platformId)) return;
      const translate = inject(TranslateService);
      const browserLang = navigator.language.split('-')[0];
      const lang = SUPPORTED_LANGS.includes(browserLang) ? browserLang : FALLBACK_LANG;
      translate.use(lang);
    })
  ]
};
