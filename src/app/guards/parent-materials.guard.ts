import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ParentAccessService } from '../services/parent-access.service';

export const parentMaterialsGuard: CanActivateFn = () => {
  const parentAccessService = inject(ParentAccessService);
  const router = inject(Router);

  if (parentAccessService.hasValidatedAccess()) {
    return true;
  }

  return router.createUrlTree(['/parent/dashboard']);
};
