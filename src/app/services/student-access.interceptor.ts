import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { auth } from '../firebase/firebase.config';
import { AuthService } from './auth.service';

export const STUDENT_SESSION_HEADER = 'X-Student-Session';
/** /auth/access-code?expired=1 asks the child to enter their code again */
export const SESSION_EXPIRED_QUERY = 'expired';
const SESSION_REQUIRED = 'STUDENT_SESSION_REQUIRED';

/**
 * The backend only shows a student's work to the child, their parent or a linked teacher. So every API
 * call carries the child's session from their access-code login and, when a parent or teacher is signed
 * in, their Firebase ID token. The analyst pages send their own code instead and are left alone.
 *
 * Children logged in before sessions existed have none: the first refused call sends them back to the
 * access-code page to log in once more.
 */
export const studentAccessInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl) || req.url.startsWith(`${environment.apiUrl}/analyst`)) {
    return next(req);
  }

  const authService = inject(AuthService);
  const router = inject(Router);
  const session = authService.getStudentSession();
  const user = auth.currentUser;

  const token$ = from(user && !req.headers.has('Authorization') ? user.getIdToken().catch(() => null) : Promise.resolve(null));
  return token$.pipe(
    switchMap((token) => {
      const headers: Record<string, string> = {};
      if (session && !req.headers.has(STUDENT_SESSION_HEADER)) headers[STUDENT_SESSION_HEADER] = session;
      if (token) headers['Authorization'] = `Bearer ${token}`;
      return next(Object.keys(headers).length ? req.clone({ setHeaders: headers }) : req);
    }),
    catchError((err: unknown) => {
      // The free trial stopped this request: explain it on its own page
      const code = err instanceof HttpErrorResponse ? err.error?.error?.code : null;
      if (code === 'TRIAL_ENDED' || code === 'REPORTS_CLOSED') {
        void router.navigate(['/trial-ended'], { queryParams: { reason: code, message: err instanceof HttpErrorResponse ? err.error?.error?.message : '' } });
      }
      // A child with no (or an old) session: log in again. A parent or teacher sees the error instead.
      if (err instanceof HttpErrorResponse && err.status === 401 && err.error?.error?.code === SESSION_REQUIRED && !auth.currentUser) {
        authService.logoutStudent();
        void router.navigate(['/auth/access-code'], { queryParams: { [SESSION_EXPIRED_QUERY]: 1 } });
      }
      return throwError(() => err);
    }),
  );
};
