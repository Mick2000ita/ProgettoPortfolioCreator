import { APP_INITIALIZER, ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import nora from '@primeuix/themes/nora';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './interceptors/auth.interceptor';
import { AuthSessionService } from './services/auth-session.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes), provideClientHydration(withEventReplay()),
    provideHttpClient(withInterceptors([authInterceptor])),
    providePrimeNG({theme: {preset: nora}})
    ,
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: (authSessionService: AuthSessionService) => () =>
        authSessionService.initializeSession(),
      deps: [AuthSessionService]
    }
  ]
};
