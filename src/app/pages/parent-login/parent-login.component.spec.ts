import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
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

  it('navigates to dashboard when redirect login resolves with user', async () => {
    spyOn(authServiceMock, 'handleRedirectLogin').and.resolveTo({ uid: 'parent-user' } as never);
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    fixture = TestBed.createComponent(ParentLoginComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenCalledWith(['/parent/dashboard']);
  });

  it('starts google redirect login when button is clicked', async () => {
    spyOn(authServiceMock, 'handleRedirectLogin').and.resolveTo(null);
    const loginSpy = spyOn(authServiceMock, 'loginWithGoogle').and.resolveTo(undefined);

    fixture = TestBed.createComponent(ParentLoginComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const loginButton = fixture.debugElement.query(By.css('.google-btn'));
    loginButton.nativeElement.click();
    await fixture.whenStable();

    expect(loginSpy).toHaveBeenCalled();
  });
});
