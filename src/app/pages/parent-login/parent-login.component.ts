import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-parent-login',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './parent-login.component.html',
  styleUrl: './parent-login.component.css',
})
export class ParentLoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly errorMessage = signal('');

  async loginWithGoogle(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      await this.authService.loginWithGoogle();
      await this.router.navigate(['/parent/dashboard']);
    } catch {
      this.errorMessage.set('Unable to login with Google. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }
}
