import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ANALYST_CODE_LENGTH } from '../analyst/analyst-code';

/** Students log in with 6 characters; an 8-character code is one a parent shared with an analyst. */
const STUDENT_CODE_LENGTH = 6;
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
    // Student codes are 6 letters and numbers (K7P2QX); analyst codes are 8 (WDTS7QEK).
    this.code = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, ANALYST_CODE_LENGTH);
    if (input.value !== this.code) input.value = this.code;
    this.isValid = this.code.length === STUDENT_CODE_LENGTH || this.isAnalystCode;
    this.errorMessage = '';
  }

  get isAnalystCode(): boolean {
    return this.code.length === ANALYST_CODE_LENGTH;
  }

  async submitCode(): Promise<void> {
    if (!this.isValid) return;
    if (this.isAnalystCode) {
      // The analyst page checks the code as soon as it opens with ?code=.
      this.router.navigate(['/auth/analyst'], { queryParams: { code: this.code } });
      return;
    }

    try {
      const student = await this.auth.loginStudentWithCode(this.code);
      this.router.navigate(['/student/dashboard']);
    } catch (err: any) {
      this.errorMessage = err?.message ?? 'Invalid access code.';
    }
  }
}
