import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ANALYST_API } from './analyst-api.service';
import { ANALYST_CODE_HEADER, analystInterceptor } from './analyst.interceptor';
import { AnalystSessionService } from './analyst-session.service';

describe('analystInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let sessions: AnalystSessionService;
  let router: Router;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([analystInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    sessions = TestBed.inject(AnalystSessionService);
    router = TestBed.inject(Router);
    sessions.save({
      code: 'ABCDEFGH',
      studentId: 's1',
      studentName: 'Maya',
      grade: '3',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
  });

  afterEach(() => backend.verify());

  it('adds the code header to analyst requests', () => {
    http.get(`${ANALYST_API}/learning-plan`).subscribe();
    const req = backend.expectOne(`${ANALYST_API}/learning-plan`);
    expect(req.request.headers.get(ANALYST_CODE_HEADER)).toBe('ABCDEFGH');
    req.flush({});
  });

  it('leaves parent and other requests alone', () => {
    http.get(`${ANALYST_API}/students/s1/code`).subscribe();
    http.get(`${ANALYST_API.replace('/analyst', '')}/learning-plan/s1`).subscribe();
    for (const req of backend.match(() => true)) {
      expect(req.request.headers.has(ANALYST_CODE_HEADER)).toBe(false);
      req.flush({});
    }
  });

  it('on 401 INVALID_ANALYST_CODE clears the session and goes to the code page with the message flag', async () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const result = firstValueFrom(http.get(`${ANALYST_API}/insights`)).catch((e) => e);

    backend
      .expectOne(`${ANALYST_API}/insights`)
      .flush({ error: { code: 'INVALID_ANALYST_CODE', message: 'Expired' } }, { status: 401, statusText: 'Unauthorized' });

    const err = await result;
    expect(err.status).toBe(401);
    expect(sessions.get()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/auth/analyst'], { queryParams: { expired: 1 } });
  });

  it('keeps the session on other errors', async () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const result = firstValueFrom(http.get(`${ANALYST_API}/insights`)).catch((e) => e);

    backend.expectOne(`${ANALYST_API}/insights`).flush({ error: { code: 'SERVER' } }, { status: 500, statusText: 'Error' });

    await result;
    expect(sessions.get()).not.toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not redirect when the code check itself fails (the entry page shows the error)', async () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const result = firstValueFrom(http.post(`${ANALYST_API}/session`, { code: 'WRONG' })).catch((e) => e);

    const req = backend.expectOne(`${ANALYST_API}/session`);
    expect(req.request.headers.has(ANALYST_CODE_HEADER)).toBe(false);
    req.flush({ error: { code: 'INVALID_ANALYST_CODE' } }, { status: 401, statusText: 'Unauthorized' });

    await result;
    expect(navigate).not.toHaveBeenCalled();
  });
});
