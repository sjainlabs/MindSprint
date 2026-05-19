import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const parentAuthGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('[ParentAuthGuard] Checking parent auth...');
  try {
    const user = await authService.handleRedirectLogin();
    console.log('[ParentAuthGuard] handleRedirectLogin returned:', user?.email ?? 'no user');
    // If we got a user (from redirect or existing session), allow access
    if (user || authService.isParentLoggedIn()) {
      console.log('[ParentAuthGuard] User authenticated, allowing access');
      return true;
    }
    console.log('[ParentAuthGuard] User not authenticated');
  } catch (error) {
    console.error('[ParentAuthGuard] Error in parent auth guard:', error);
  }

  // Not authenticated, redirect to login
  console.log('[ParentAuthGuard] Redirecting to parent login');
  return router.createUrlTree(['/login/parent']);
};
