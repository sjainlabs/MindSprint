import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ANALYST_API, ANALYST_PARENT_API, INVALID_ANALYST_CODE } from './analyst-api.service';
import { AnalystSessionService } from './analyst-session.service';

export const ANALYST_CODE_HEADER = 'X-Analyst-Code';
/** /auth/analyst?expired=1 shows "This access code has expired or was revoked." */
export const EXPIRED_QUERY = 'expired';

/**
 * Sends the saved code with the analyst's requests, and sends the analyst back to the code page when
 * the backend says the code no longer works. Parent requests (/analyst/students/…) and the code check
 * itself (POST /analyst/session, which shows its own error) are left alone.
 */
export const analystInterceptor: HttpInterceptorFn = (req, next) => {
  const url = req.url.split('?')[0];
  if (!url.startsWith(`${ANALYST_API}/`) || url.startsWith(ANALYST_PARENT_API) || url === `${ANALYST_API}/session`) {
    return next(req);
  }

  const sessions = inject(AnalystSessionService);
  const router = inject(Router);
  const session = sessions.get();
  const request = session ? req.clone({ setHeaders: { [ANALYST_CODE_HEADER]: session.code } }) : req;

  return next(request).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401 && err.error?.error?.code === INVALID_ANALYST_CODE) {
        sessions.clear();
        void router.navigate(['/auth/analyst'], { queryParams: { [EXPIRED_QUERY]: 1 } });
      }
      return throwError(() => err);
    }),
  );
};
