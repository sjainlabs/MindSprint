import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { LearningApiService } from '../services/learning-api.service';
import { OnboardingFlowService } from '../services/onboarding-flow.service';

@Component({
  selector: 'app-student-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="page">
      <section class="card">
        <h1>Student Dashboard</h1>
        <p><strong>Recommended next worksheet:</strong> {{ recommendedWorksheet() }}</p>
        <p><strong>Next scheduled test:</strong> {{ nextScheduledTest() }}</p>
        <p><strong>Mastery summary:</strong> {{ masterySummary() }}</p>
      </section>

      <section class="card">
        <div class="actions">
          <a routerLink="/practice/hub" class="button">Practice Hub</a>
          <a routerLink="/tests/scheduled" class="button">Tests</a>
          <a routerLink="/insights" class="button">Insights</a>
        </div>
      </section>
    </main>
  `,
  styles: [
    `
      .page { max-width: 720px; margin: 0 auto; padding: 16px; display: grid; gap: 12px; }
      .card { background: #fff; border-radius: 16px; padding: 16px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08); }
      .actions { display: grid; gap: 10px; }
      .button { text-align: center; text-decoration: none; border-radius: 12px; padding: 14px; font-weight: 700; background: #dbeafe; color: #1e3a8a; }
      h1, p { margin: 0; }
      p { margin-top: 8px; color: #334155; }
    `,
  ],
})
export class StudentDashboardPageComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly api = inject(LearningApiService);
  private readonly onboarding = inject(OnboardingFlowService);

  readonly recommendedWorksheet = signal('Loading...');
  readonly nextScheduledTest = signal('Loading...');
  readonly masterySummary = signal('Building profile');

  async ngOnInit(): Promise<void> {
    const state = this.onboarding.getState();
    const topic = state.topics[0] ?? 'core skills';
    const grade = state.grade || 'current grade';
    this.recommendedWorksheet.set(`${topic} - ${grade}`);

    const studentId = this.authService.getStoredStudentId();
    if (!studentId) {
      this.nextScheduledTest.set('No test scheduled');
      return;
    }

    try {
      const tests = await this.api.getScheduledTests(studentId);
      const next = tests.biWeekly[0] ?? tests.monthly[0] ?? tests.quarterly[0] ?? 'No test scheduled';
      this.nextScheduledTest.set(next);
    } catch {
      this.nextScheduledTest.set('No test scheduled');
    }

    try {
      const insights = await this.api.getFullInsights(studentId);
      this.masterySummary.set(`${insights.level} (${insights.accuracy}% accuracy)`);
    } catch {
      this.masterySummary.set('Building profile');
    }
  }
}

