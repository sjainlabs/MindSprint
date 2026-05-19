import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from '../../services/auth.service';
import { ParentLoginComponent } from './parent-login.component';

describe('ParentLoginComponent', () => {
  let fixture: ComponentFixture<ParentLoginComponent>;

  const authServiceMock = {
    loginWithGoogle: async () => undefined,
    handleRedirectLogin: async () => null,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParentLoginComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('navigates to dashboard when redirect login resolves with user', async () => {
    vi.spyOn(authServiceMock, 'handleRedirectLogin').mockResolvedValue({ uid: 'parent-user' } as never);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(ParentLoginComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenCalledWith(['/parent/dashboard']);
  });

  it('navigates to dashboard when redirect login resolves after a delay', async () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    vi.spyOn(authServiceMock, 'handleRedirectLogin').mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ uid: 'delayed-user' } as never), 20);
        }),
    );

    fixture = TestBed.createComponent(ParentLoginComponent);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 30));
    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenCalledWith(['/parent/dashboard']);
  });

  it('starts google redirect login when button is clicked', async () => {
    vi.spyOn(authServiceMock, 'handleRedirectLogin').mockResolvedValue(null);
    const loginSpy = vi.spyOn(authServiceMock, 'loginWithGoogle').mockResolvedValue(undefined);

    fixture = TestBed.createComponent(ParentLoginComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const loginButton = fixture.debugElement.query(By.css('.google-btn'));
    loginButton.nativeElement.click();
    await fixture.whenStable();

    expect(loginSpy).toHaveBeenCalled();
  });
});
