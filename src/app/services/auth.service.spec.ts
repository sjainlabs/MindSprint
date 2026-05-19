import { TestBed } from '@angular/core/testing';
import * as firebaseAuth from 'firebase/auth';
import * as firestore from 'firebase/firestore';
import { AuthService } from './auth.service';

describe('AuthService redirect login handling', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthService],
    });
    service = TestBed.inject(AuthService);
    spyOn(firestore, 'getDoc').and.resolveTo({
      exists: () => true,
    } as never);
  });

  it('handles redirect login success from getRedirectResult', async () => {
    const redirectedUser = { uid: 'parent-redirect', email: 'parent@example.com' } as firebaseAuth.User;
    spyOn(firebaseAuth, 'getRedirectResult').and.resolveTo({ user: redirectedUser } as never);
    spyOn(firebaseAuth, 'onAuthStateChanged').and.returnValue(() => {});

    const result = await service.handleRedirectLogin();

    expect(result).toBe(redirectedUser);
    expect(firebaseAuth.getRedirectResult).toHaveBeenCalled();
  });

  it('handles delayed restored session from auth state listener', async () => {
    const restoredUser = { uid: 'parent-restored', email: 'restored@example.com' } as firebaseAuth.User;
    spyOn(firebaseAuth, 'getRedirectResult').and.resolveTo(null as never);
    spyOn(firebaseAuth, 'onAuthStateChanged').and.callFake((_auth, nextOrObserver) => {
      const timerId = setTimeout(() => {
        nextOrObserver(restoredUser);
      }, 20);
      return () => clearTimeout(timerId);
    });

    const result = await service.handleRedirectLogin();

    expect(result).toBe(restoredUser);
    expect(firebaseAuth.onAuthStateChanged).toHaveBeenCalled();
  });
});
