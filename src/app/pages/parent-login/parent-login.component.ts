import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-parent-login',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './parent-login.component.html',
  styleUrl: './parent-login.component.css',
})
export class ParentLoginComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private authStateUnsubscribe: (() => void) | null = null;

  readonly loading = signal(false);
  readonly restoringSession = signal(false);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    console.log('[ParentLogin] Component initialized');

    if (this.authService.shouldRedirectParentFromLogin()) {
      void this.router.navigate(['/parent/dashboard']);
      return;
    }

    const shouldAttemptRestore = this.authService.shouldAttemptParentSessionRestore();
    this.restoringSession.set(shouldAttemptRestore);
    this.loading.set(this.restoringSession());

    this.authStateUnsubscribe = this.authService.onAuthStateChanged(async (user) => {
      console.log('[ParentLogin] Auth state changed:', user?.email ?? 'no user');
      if (user) {
        this.restoringSession.set(false);
        this.loading.set(true);
        console.log('[ParentLogin] User authenticated from auth state, navigating to dashboard');
        try {
          await this.router.navigate(['/parent/dashboard']);
          console.log('[ParentLogin] Navigation succeeded');
        } catch (err) {
          console.error('[ParentLogin] Navigation failed:', err);
          this.loading.set(false);
        }
        return;
      }

      if (!this.authService.isParentRedirectPending()) {
        this.restoringSession.set(false);
        this.loading.set(false);
      }
    });

    if (shouldAttemptRestore) {
      console.log('[ParentLogin] Calling handleRedirectLogin...');
      void this.restoreRedirectSession();
    } else {
      console.log('[ParentLogin] No redirect restore needed on init');
    }
  }

  ngOnDestroy(): void {
    this.authStateUnsubscribe?.();
    this.authStateUnsubscribe = null;
  }

  private async restoreRedirectSession(): Promise<void> {
    const hadPendingRedirect = this.authService.isParentRedirectPending();

    try {
      const user = await this.authService.handleRedirectLogin();
      console.log('[ParentLogin] handleRedirectLogin resolved with user:', user?.email ?? 'no user');

      if (user) {
        this.restoringSession.set(false);
        this.loading.set(true);
        console.log('[ParentLogin] User authenticated from redirect, navigating to dashboard');
        await this.router.navigate(['/parent/dashboard']);
        return;
      }

      if (hadPendingRedirect) {
        this.errorMessage.set('Google redirect did not complete. Please tap Login with Google again.');
      }
    } catch (error) {
      console.error('[ParentLogin] Redirect restore failed:', error);
      this.errorMessage.set('Unable to complete Google sign-in. Please try again.');
    }

    this.restoringSession.set(false);
    this.loading.set(false);
  }

  async loginWithGoogle(): Promise<void> {
    console.log('[ParentLogin] Login with Google clicked');
    this.loading.set(true);
    this.restoringSession.set(false);
    this.errorMessage.set('');

    try {
      console.log('[ParentLogin] Calling loginParentWithGoogle...');
      const user = await this.authService.loginParentWithGoogle();

      if (user) {
        console.log('[ParentLogin] Popup login succeeded, navigating to dashboard');
        await this.router.navigate(['/parent/dashboard']);
        return;
      }

      console.log('[ParentLogin] Redirect login started');
    } catch (error) {
      console.error('[ParentLogin] Login error:', error);
      this.errorMessage.set('Unable to login with Google. Please try again.');
      this.loading.set(false);
    }
  }
}
