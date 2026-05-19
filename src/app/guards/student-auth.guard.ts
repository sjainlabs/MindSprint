import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const studentAuthGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isStudentLoggedIn()) {
    return true;
  }

  if (authService.isParentLoggedIn() && route.queryParamMap.has('studentId')) {
    return true;
  }

  return router.createUrlTree(['/login/student']);
};
