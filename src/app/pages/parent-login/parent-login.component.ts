import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-parent-login',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './parent-login.component.html',
  styleUrl: './parent-login.component.css',
})
export class ParentLoginComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    console.log('[ParentLogin] Component initialized');

    // Listen for auth state changes AND trigger redirect
    this.authService.onAuthStateChanged(async (user) => {
      console.log('[ParentLogin] Auth state changed:', user?.email ?? 'no user');
      if (user) {
        console.log('[ParentLogin] User authenticated, navigating to dashboard');
        try {
          await this.router.navigate(['/parent/dashboard']);
          console.log('[ParentLogin] Navigation succeeded');
        } catch (err) {
          console.error('[ParentLogin] Navigation failed:', err);
        }
      }
    });

    // Check for redirect result immediately
    console.log('[ParentLogin] Calling handleRedirectLogin...');
    void this.authService.handleRedirectLogin().then((user) => {
      console.log('[ParentLogin] handleRedirectLogin resolved with user:', user?.email ?? 'no user');
    });
  }


  async loginWithGoogle(): Promise<void> {
    console.log('[ParentLogin] Login with Google clicked');
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      console.log('[ParentLogin] Calling startGoogleRedirectLogin...');
      await this.authService.startGoogleRedirectLogin();
      console.log('[ParentLogin] Redirecting to Google (if you see this, something is wrong)');
    } catch (error) {
      console.error('[ParentLogin] Login error:', error);
      this.errorMessage.set('Unable to login with Google. Please try again.');
      this.loading.set(false);
    }
  }
}
