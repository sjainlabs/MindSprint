import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { LearningApiService, ScheduledTestsResponse } from '../services/learning-api.service';

@Component({
  selector: 'app-scheduled-tests-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="page">
      <section class="card" *ngIf="loading()">Loading tests...</section>

      <section class="card" *ngIf="errorMessage()">{{ errorMessage() }}</section>

      <section class="card" *ngIf="tests() as tests">
        <h1>Scheduled Tests</h1>

        <h2>Bi-weekly tests</h2>
        <ul>
          <li *ngFor="let test of tests.biWeekly">{{ test }}</li>
        </ul>

        <h2>Monthly tests</h2>
        <ul>
          <li *ngFor="let test of tests.monthly">{{ test }}</li>
        </ul>

        <h2>Quarterly tests</h2>
        <ul>
          <li *ngFor="let test of tests.quarterly">{{ test }}</li>
        </ul>

        <a routerLink="/tests/surprise" class="button">Start Test</a>
      </section>
    </main>
  `,
  styles: [
    `
      .page { max-width: 760px; margin: 0 auto; padding: 16px; }
      .card { background: #fff; border-radius: 16px; padding: 16px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08); display: grid; gap: 10px; }
      ul { margin: 0; padding-left: 18px; color: #334155; }
      .button { text-decoration: none; border-radius: 12px; padding: 12px; text-align: center; font-weight: 700; background: #2563eb; color: #fff; }
      h1, h2 { margin: 0; }
    `,
  ],
})
export class ScheduledTestsPageComponent implements OnInit {
  private readonly api = inject(LearningApiService);
  private readonly authService = inject(AuthService);

  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly tests = signal<ScheduledTestsResponse | null>(null);

  async ngOnInit(): Promise<void> {
    const studentId = this.authService.getStoredStudentId();
    if (!studentId) {
      this.errorMessage.set('No active student.');
      this.loading.set(false);
      return;
    }

    try {
      this.tests.set(await this.api.getScheduledTests(studentId));
    } catch {
      this.errorMessage.set('Unable to load scheduled tests.');
    } finally {
      this.loading.set(false);
    }
  }
}
