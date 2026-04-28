import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap, catchError, throwError } from 'rxjs';
import { AuthSessionService } from '../services/auth-session.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const isAuthRequest =
    request.url.includes('/api/auth/login') ||
    request.url.includes('/api/auth/google') ||
    request.url.includes('/api/auth/refresh') ||
    request.url.includes('/api/user/register');

  if (request.headers.has('Authorization') || isAuthRequest) {
    return next(request);
  }

  const authSessionService = inject(AuthSessionService);
  const accessToken = authSessionService.getAccessToken();
  const authenticatedRequest = accessToken
    ? request.clone({
        setHeaders: {
          Authorization: `Bearer ${accessToken}`
        }
      })
    : request;

  return next(authenticatedRequest).pipe(
    catchError((error) => {
      if ((error.status !== 401 && error.status !== 403) || !authSessionService.getRefreshToken()) {
        return throwError(() => error);
      }

      return from(authSessionService.refreshAccessToken()).pipe(
        switchMap((nextAccessToken) => {
          if (!nextAccessToken) {
            return throwError(() => error);
          }

          return next(
            request.clone({
              setHeaders: {
                Authorization: `Bearer ${nextAccessToken}`
              }
            })
          );
        }),
        catchError(() => throwError(() => error))
      );
    })
  );
};
