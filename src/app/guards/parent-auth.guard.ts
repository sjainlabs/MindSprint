import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const parentAuthGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await authService.handleRedirectLogin();

  if (authService.isParentLoggedIn()) {
    return true;
  }

  return router.createUrlTree(['/login/parent']);
};
