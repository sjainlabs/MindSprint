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
    void this.handleRedirectLogin();
  }

  async loginWithGoogle(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      await this.authService.startGoogleRedirectLogin();
    } catch {
      this.errorMessage.set('Unable to login with Google. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  private async handleRedirectLogin(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const user = await this.authService.handleRedirectLogin();
      if (user) {
        await this.router.navigate(['/parent/dashboard']);
      }
    } catch {
      this.errorMessage.set('Unable to complete Google login. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }
}
