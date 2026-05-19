import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from '../services/auth.service';
import { parentAuthGuard } from './parent-auth.guard';

describe('parentAuthGuard', () => {
  const authServiceMock = {
    handleRedirectLogin: async () => null,
    isParentLoggedIn: () => false,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: authServiceMock,
        },
      ],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('allows navigation when parent is logged in', async () => {
    const handleRedirectLoginSpy = vi
      .spyOn(authServiceMock, 'handleRedirectLogin')
      .mockResolvedValue({ uid: 'parent-user' } as never);
    vi.spyOn(authServiceMock, 'isParentLoggedIn').mockReturnValue(true);

    const result = await TestBed.runInInjectionContext(() => parentAuthGuard({} as never, {} as never));

    expect(result).toBe(true);
    expect(handleRedirectLoginSpy).toHaveBeenCalled();
  });

  it('redirects to parent login when parent is logged out', async () => {
    const router = TestBed.inject(Router);
    const handleRedirectLoginSpy = vi.spyOn(authServiceMock, 'handleRedirectLogin').mockResolvedValue(null);
    vi.spyOn(authServiceMock, 'isParentLoggedIn').mockReturnValue(false);

    const result = await TestBed.runInInjectionContext(() => parentAuthGuard({} as never, {} as never));

    expect(result).toEqual(router.createUrlTree(['/login/parent']));
    expect(handleRedirectLoginSpy).toHaveBeenCalled();
  });
});
