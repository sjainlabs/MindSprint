import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-student-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './student-login.component.html',
  styleUrl: './student-login.component.css',
})
export class StudentLoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly code = signal('');
  readonly loading = signal(false);
  readonly errorMessage = signal('');

  async login(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      await this.authService.loginStudentWithCode(this.code());
      await this.router.navigate(['/student/home']);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to login. Please try again.';
      this.errorMessage.set(message);
    } finally {
      this.loading.set(false);
    }
  }
}
