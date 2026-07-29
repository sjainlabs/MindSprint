import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const parentAuthGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  try {
    if (authService.isParentLoggedIn()) {
      return true;
    }

    const user = await authService.handleRedirectLogin();
    if (user || authService.isParentLoggedIn()) {
      return true;
    }
  } catch {
    // noop
  }

  return router.createUrlTree(['/auth/parent-login']);
};
