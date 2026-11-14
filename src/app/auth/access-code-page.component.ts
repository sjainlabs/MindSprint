import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-access-code-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './access-code-page.component.html',
  styleUrls: ['./access-code-page.component.css'],
})
export class AccessCodePageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  code = '';
  errorMessage = '';
  isValid = false;

  /**
   * Reads the box itself: with ngModel the (input) handler ran before the model updated, so it
   * cleaned up and checked the previous text and Continue stayed disabled after the 6th character.
   */
  onCodeChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Access codes are 6 letters and numbers, e.g. K7P2QX.
    this.code = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    if (input.value !== this.code) input.value = this.code;
    this.isValid = /^[A-Z0-9]{6}$/.test(this.code);
    this.errorMessage = '';
  }

  async submitCode(): Promise<void> {
    if (!this.isValid) return;

    try {
      const student = await this.auth.loginStudentWithCode(this.code);
      this.router.navigate(['/student/dashboard']);
    } catch (err: any) {
      this.errorMessage = err?.message ?? 'Invalid access code.';
    }
  }
}
