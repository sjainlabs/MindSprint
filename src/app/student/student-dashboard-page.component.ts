import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { LearningApiService } from '../services/learning-api.service';
import { OnboardingFlowService } from '../services/onboarding-flow.service';
import { DailyChallengeService, localDate } from '../services/daily-challenge.service';

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
          <a routerLink="/daily" class="button daily">
            🎯 Daily Challenge
            @if (dailyBadge(); as b) {
              <span class="badge" [class.done]="b.done">{{ b.text }}</span>
            }
          </a>
          <a routerLink="/practice/hub" class="button">Practice Hub</a>
          <a routerLink="/tests" class="button">Tests</a>
          <a routerLink="/insights" class="button">Insights</a>
          <a routerLink="/study-guides" class="button">📘 Study guides</a>
          <a routerLink="/progression/overview" class="button">View Your Progress</a>

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
      .button.daily { background: #6c63ff; color: #fff; display: flex; justify-content: center; align-items: center; gap: 8px; flex-wrap: wrap; }
      .badge { background: #fef3c7; color: #92400e; border-radius: 999px; padding: 2px 10px; font-size: 0.8rem; }
      .badge.done { background: #dcfce7; color: #166534; }
      h1, p { margin: 0; }
      p { margin-top: 8px; color: #334155; }
    `,
  ],
})
export class StudentDashboardPageComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly api = inject(LearningApiService);
  private readonly onboarding = inject(OnboardingFlowService);
  private readonly daily = inject(DailyChallengeService);

  readonly recommendedWorksheet = signal('Loading...');
  readonly nextScheduledTest = signal('Loading...');
  readonly masterySummary = signal('Building profile');
  /** A gentle nudge toward today's 30 minutes; never a block. */
  readonly dailyBadge = signal<{ text: string; done: boolean } | null>(null);

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

    this.loadDailyBadge(studentId);

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

  private async loadDailyBadge(studentId: string): Promise<void> {
    try {
      const history = await this.daily.daily(studentId, 1);
      const goal = history.dailyGoalMinutes;
      const today = history.sessions.find((s) => s.date === localDate());
      const minutes = Math.floor(today?.activeMinutes ?? 0);
      this.dailyBadge.set(
        today?.goalReached
          ? { text: '✓ Done today', done: true }
          : { text: minutes > 0 ? `${goal - minutes} min to go` : `${goal} min today`, done: false },
      );
    } catch {
      // No badge if the server can't be reached; the button still works.
    }
  }
}
