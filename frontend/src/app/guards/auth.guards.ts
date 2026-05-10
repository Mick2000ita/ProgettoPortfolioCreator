import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthSessionService } from '../services/auth-session.service';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const authSessionService = inject(AuthSessionService);

  return authSessionService.isAuthenticated() ? true : router.createUrlTree(['/']);
};

export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);
  const authSessionService = inject(AuthSessionService);

  return authSessionService.isAuthenticated() ? router.createUrlTree(['/analytics']) : true;
};
