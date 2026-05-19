import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
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

  it('allows navigation when parent is logged in', async () => {
    spyOn(authServiceMock, 'handleRedirectLogin').and.resolveTo({ uid: 'parent-user' } as never);
    spyOn(authServiceMock, 'isParentLoggedIn').and.returnValue(true);

    const result = await TestBed.runInInjectionContext(() => parentAuthGuard({} as never, {} as never));

    expect(result).toBeTrue();
    expect(authServiceMock.handleRedirectLogin).toHaveBeenCalled();
  });

  it('redirects to parent login when parent is logged out', async () => {
    const router = TestBed.inject(Router);
    spyOn(authServiceMock, 'handleRedirectLogin').and.resolveTo(null);
    spyOn(authServiceMock, 'isParentLoggedIn').and.returnValue(false);

    const result = await TestBed.runInInjectionContext(() => parentAuthGuard({} as never, {} as never));

    expect(result).toEqual(router.createUrlTree(['/login/parent']));
    expect(authServiceMock.handleRedirectLogin).toHaveBeenCalled();
  });
});
