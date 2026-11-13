import { inject } from '@angular/core';
import { CanActivateFn, RedirectFunction, Router } from '@angular/router';
import { AnalystSessionService } from './analyst-session.service';

/** The analyst pages need a saved code that hasn't expired. */
export const analystGuard: CanActivateFn = () => {
  if (inject(AnalystSessionService).isActive()) return true;
  return inject(Router).createUrlTree(['/auth/analyst']);
};

/** /analyst (the share link) goes to the code page, keeping ?code=. */
export const toAnalystEntry: RedirectFunction = ({ queryParams }) =>
  inject(Router).createUrlTree(['/auth/analyst'], { queryParams });
