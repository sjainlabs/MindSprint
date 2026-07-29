import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-parent-login-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="page">
      <section class="card">
        <h1>Parent Login</h1>
        <p>Sign in with Google to create and manage student accounts.</p>
        <button class="button" (click)="login()" [disabled]="loading()">
          {{ loading() ? 'Signing in...' : 'Continue with Google' }}
        </button>
        <p class="error" *ngIf="errorMessage()">{{ errorMessage() }}</p>
        <a routerLink="/" class="link">Back to home</a>
      </section>
    </main>
  `,
  styles: [
    `
      .page { max-width: 480px; margin: 0 auto; padding: 16px; }
      .card { background: #fff; border-radius: 16px; padding: 20px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08); display: grid; gap: 12px; }
      h1 { margin: 0; }
      p { margin: 0; color: #334155; }
      .button { border: 0; border-radius: 12px; background: #2563eb; color: #fff; padding: 14px; font-weight: 700; font-size: 1rem; }
      .button:disabled { opacity: 0.7; }
      .error { color: #b91c1c; }
      .link { color: #1d4ed8; text-decoration: none; font-weight: 600; }
    `,
  ],
})
export class ParentLoginPageComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly errorMessage = signal('');

  async login(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const user = await this.authService.loginParentWithGoogle();
      if (user) {
        await this.router.navigate(['/parent/dashboard']);
      }
    } catch {
      this.errorMessage.set('Unable to sign in with Google. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }
}
