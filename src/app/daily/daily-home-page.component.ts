import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import {
  DAILY_GOAL_MINUTES,
  DailyChallengeError,
  DailyChallengeService,
  DailyHistory,
  goalStreak,
  localDate,
  percent,
} from '../services/daily-challenge.service';

const RING_RADIUS = 52;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

@Component({
  selector: 'app-daily-home-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="page daily-home">
      <section class="card center">
        <h1>🎯 Daily Challenge</h1>
        <p class="muted">One question at a time. Try to practise for {{ goal() }} minutes every day.</p>

        @if (loading()) {
          <div class="spinner"></div>
        } @else {
          <div class="ring-wrap" role="img" [attr.aria-label]="minutes() + ' of ' + goal() + ' minutes practised today'">
            <svg viewBox="0 0 120 120" class="goal-ring" aria-hidden="true">
              <circle cx="60" cy="60" [attr.r]="radius" class="ring-track" />
              <circle cx="60" cy="60" [attr.r]="radius" class="ring-fill" [class.done]="goalReached()"
                      [attr.stroke-dasharray]="ringLength" [attr.stroke-dashoffset]="ringOffset()" />
            </svg>
            <div class="ring-label">
              <span class="ring-value">{{ minutes() }}</span>
              <span class="ring-unit">of {{ goal() }} min</span>
            </div>
          </div>

          <div class="stats">
            <div class="stat"><span class="stat-value">{{ accuracy() ?? '–' }}{{ accuracy() !== null ? '%' : '' }}</span><span class="stat-label">correct today</span></div>
            <div class="stat"><span class="stat-value">{{ avgSeconds() ?? '–' }}{{ avgSeconds() !== null ? 's' : '' }}</span><span class="stat-label">per question</span></div>
            <div class="stat"><span class="stat-value">{{ today()?.questions ?? 0 }}</span><span class="stat-label">questions</span></div>
          </div>

          @if (goalReached()) {
            <p class="notice success">🎉 You did your {{ goal() }} minutes today! You can keep going if you like.</p>
          } @else if (minutes() > 0) {
            <p class="notice info">⏳ {{ goal() - minutes() }} more minute{{ goal() - minutes() === 1 ? '' : 's' }} to reach today's goal.</p>
          }
          @if (error()) {
            <p class="hint">{{ error() }}</p>
          }
        }

        <a routerLink="/daily/play" class="btn primary start-btn">{{ started() ? '▶ Continue' : '▶ Start' }}</a>
      </section>

      @if (!loading() && history()) {
        <section class="card">
          <div class="streak-head">
            <h2>{{ streak() > 0 ? '🔥 ' + streak() + '-day streak' : '🔥 Start a streak today' }}</h2>
            <span class="hint">Days with {{ goal() }} minutes done</span>
          </div>
          <ol class="week" aria-label="Last 7 days">
            @for (d of week(); track d.date) {
              <li class="day" [class.reached]="d.reached" [class.some]="!d.reached && d.minutes > 0" [class.today]="d.isToday"
                  [attr.aria-label]="d.label + ': ' + (d.reached ? 'goal reached' : d.minutes + ' minutes')">
                <span class="dot" aria-hidden="true">{{ d.reached ? '✓' : '' }}</span>
                <span class="day-name" aria-hidden="true">{{ d.short }}</span>
              </li>
            }
          </ol>
        </section>
      }

      <section class="card links">
        <a routerLink="/daily/progress" class="btn outline">🗺️ My progress map</a>
        <a routerLink="/daily/chart" class="btn outline">📊 Daily chart for parents</a>
      </section>
    </main>
  `,
  styleUrls: ['../tests/test-pages.css'],
  styles: [
    `
      .daily-home { max-width: 560px; }
      .daily-home h1, .daily-home h2 { font-weight: 800; }
      .ring-wrap { position: relative; width: 180px; height: 180px; }
      .goal-ring { width: 100%; height: 100%; transform: rotate(-90deg); }
      .ring-track { fill: none; stroke: #e2e8f0; stroke-width: 12; }
      .ring-fill { fill: none; stroke: #6c63ff; stroke-width: 12; stroke-linecap: round; transition: stroke-dashoffset 0.6s ease; }
      .ring-fill.done { stroke: #16a34a; }
      .ring-label { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; }
      .ring-value { font-size: 2.6rem; font-weight: 800; line-height: 1; color: #1e1b4b; }
      .ring-unit { color: #64748b; font-weight: 700; }
      .stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; width: 100%; }
      .stat { background: #f8fafc; border-radius: 12px; padding: 10px 6px; display: grid; }
      .stat-value { font-size: 1.3rem; font-weight: 800; color: #1e1b4b; }
      .stat-label { font-size: 0.78rem; color: #64748b; }
      .notice.success { background: #ecfdf5; border-color: #bbf7d0; color: #166534; }
      .start-btn { width: 100%; font-size: 1.2rem; padding: 16px; }
      .streak-head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 6px; }
      .week { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; }
      .day { display: grid; justify-items: center; gap: 4px; }
      .dot { width: 34px; height: 34px; border-radius: 50%; background: #f1f5f9; border: 2px solid #e2e8f0; display: grid; place-items: center; color: #fff; font-weight: 800; }
      .day.some .dot { background: #e0e7ff; border-color: #c7d2fe; }
      .day.reached .dot { background: #16a34a; border-color: #16a34a; }
      .day.today .dot { outline: 3px solid #c4b5fd; outline-offset: 2px; }
      .day-name { font-size: 0.75rem; color: #64748b; font-weight: 700; }
      .links { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
    `,
  ],
})
export class DailyHomePageComponent implements OnInit {
  private readonly api = inject(DailyChallengeService);
  private readonly auth = inject(AuthService);

  readonly radius = RING_RADIUS;
  readonly ringLength = RING_LENGTH;

  readonly loading = signal(true);
  readonly error = signal('');
  readonly history = signal<DailyHistory | null>(null);

  readonly goal = computed(() => this.history()?.dailyGoalMinutes || DAILY_GOAL_MINUTES);
  readonly today = computed(() => this.history()?.sessions.find((s) => s.date === localDate()) ?? null);
  readonly minutes = computed(() => Math.floor(this.today()?.activeMinutes ?? 0));
  readonly goalReached = computed(() => this.today()?.goalReached ?? false);
  readonly started = computed(() => (this.today()?.questions ?? 0) > 0);
  readonly accuracy = computed(() => (this.started() ? percent(this.today()?.accuracy) : null));
  readonly avgSeconds = computed(() => {
    const s = this.today()?.averageSeconds;
    return this.started() && s !== null && s !== undefined ? Math.round(s * 10) / 10 : null;
  });
  readonly ringOffset = computed(() => RING_LENGTH * (1 - Math.min(1, this.minutes() / this.goal())));
  readonly streak = computed(() => goalStreak(this.history()?.sessions ?? []));

  readonly week = computed(() => {
    const byDate = new Map((this.history()?.sessions ?? []).map((s) => [s.date, s]));
    const todayKey = localDate();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = localDate(d);
      const s = byDate.get(key);
      return {
        date: key,
        isToday: key === todayKey,
        reached: !!s?.goalReached,
        minutes: Math.floor(s?.activeMinutes ?? 0),
        short: d.toLocaleDateString(undefined, { weekday: 'narrow' }),
        label: d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }),
      };
    });
  });

  async ngOnInit(): Promise<void> {
    const studentId = this.auth.getStoredStudentId();
    if (!studentId) {
      this.loading.set(false);
      return;
    }
    try {
      this.history.set(await this.api.daily(studentId, 30));
    } catch (err) {
      this.error.set((err as DailyChallengeError).message);
    } finally {
      this.loading.set(false);
    }
  }
}
