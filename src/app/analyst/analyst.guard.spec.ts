import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { analystGuard } from './analyst.guard';
import { AnalystSessionService } from './analyst-session.service';

describe('analystGuard', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  const run = () => TestBed.runInInjectionContext(() => analystGuard({} as never, {} as never));

  it('allows a saved session that has not expired', () => {
    TestBed.inject(AnalystSessionService).save({
      code: 'ABCDEFGH',
      studentId: 's1',
      studentName: 'Maya',
      grade: '3',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });

    expect(run()).toBe(true);
  });

  it('redirects to /auth/analyst without a session', () => {
    const router = TestBed.inject(Router);
    expect(run()).toEqual(router.createUrlTree(['/auth/analyst']));
  });

  it('redirects to /auth/analyst when the session has expired', () => {
    const router = TestBed.inject(Router);
    TestBed.inject(AnalystSessionService).save({
      code: 'ABCDEFGH',
      studentId: 's1',
      studentName: 'Maya',
      grade: '3',
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    });

    expect(run()).toEqual(router.createUrlTree(['/auth/analyst']));
  });
});
