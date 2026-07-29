import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-access-code-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './access-code-page.component.html',
  styleUrls: ['./access-code-page.component.css'],
})
export class AccessCodePageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  code = '';
  errorMessage = '';
  isValid = false;

  onCodeChange(): void {
    this.code = this.code.replace(/\D/g, '').slice(0, 6);
    this.isValid = /^\d{6}$/.test(this.code);
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

  goBack(): void {
    this.router.navigate(['/']);
  }
}
