import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthSessionService } from '../services/auth-session.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.headers.has('Authorization')) {
    return next(request);
  }

  if (
    request.url.includes('/api/auth/login') ||
    request.url.includes('/api/auth/google') ||
    request.url.includes('/api/auth/refresh') ||
    request.url.includes('/api/user/register')
  ) {
    return next(request);
  }

  const authSessionService = inject(AuthSessionService);
  const accessToken = authSessionService.getAccessToken();

  if (!accessToken) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: {
        Authorization: `Bearer ${accessToken}`
      }
    })
  );
};
