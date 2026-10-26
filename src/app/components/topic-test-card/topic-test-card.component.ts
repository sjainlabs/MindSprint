import { CommonModule } from '@angular/common';
import { Component, Input, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TopicTestStatus } from '../../services/topic-test.service';

/**
 * Shows a topic's test state: practising (progress), eligible (take test CTA) or passed (trophy).
 * Use `compact` inside dense lists such as the practice hub topic grid.
 */
@Component({
  selector: 'app-topic-test-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div
      *ngIf="status() as s"
      class="tt-card"
      [class.compact]="compact"
      [class.eligible]="s.state === 'eligible'"
      [class.passed]="s.state === 'passed'"
    >
      <!-- Practising -->
      <ng-container *ngIf="s.state === 'practising'">
        <div class="tt-head">
          <span class="tt-icon">📝</span>
          <span class="tt-title">Topic Test</span>
          <span class="tt-count">{{ s.qualifyingSheets }}/{{ s.sheetsRequired }}</span>
        </div>
        <div
          class="tt-bar"
          role="progressbar"
          [attr.aria-valuenow]="s.qualifyingSheets"
          aria-valuemin="0"
          [attr.aria-valuemax]="s.sheetsRequired"
        >
          <div class="tt-fill" [style.width.%]="progressPct()"></div>
        </div>
        <p class="tt-text">
          {{ s.sheetsRemaining }} more sheet{{ s.sheetsRemaining === 1 ? '' : 's' }} at 80%+ to unlock the test
        </p>
        <p class="tt-text tt-muted" *ngIf="s.attempts > 0 && s.lastTestAccuracy !== null">
          Last test: {{ s.lastTestAccuracy }}%. Keep practising to retry.
        </p>
        <a
          *ngIf="showGuideLink"
          class="tt-link"
          [routerLink]="['/study-guides/topic', s.topicId]"
          (click)="$event.stopPropagation()"
        >📘 Get ready for the test</a>
      </ng-container>

      <!-- Eligible -->
      <ng-container *ngIf="s.state === 'eligible'">
        <div class="tt-head">
          <span class="tt-icon">🔓</span>
          <span class="tt-title">Topic Test unlocked!</span>
        </div>
        <button class="tt-cta" type="button" (click)="$event.stopPropagation(); openTest(s.topicId)">
          Take Topic Test
        </button>
        <p class="tt-text tt-muted">20 questions · pass at 80% · one attempt</p>
      </ng-container>

      <!-- Passed -->
      <ng-container *ngIf="s.state === 'passed'">
        <div class="tt-head">
          <span class="tt-icon">🏆</span>
          <span class="tt-title">Topic mastered</span>
          <span class="tt-score" *ngIf="s.lastTestAccuracy !== null">{{ s.lastTestAccuracy }}%</span>
        </div>
        <p class="tt-text tt-muted" *ngIf="!compact && s.lastTestAt">
          Passed on {{ s.lastTestAt | date: 'mediumDate' }}
        </p>
      </ng-container>
    </div>
  `,
  styles: [
    `
      .tt-card {
        border: 2px solid #e2e8f0;
        border-radius: 14px;
        padding: 12px 14px;
        background: #f8fafc;
        display: grid;
        gap: 8px;
      }
      .tt-card.eligible { border-color: #6c63ff; background: #f1f0ff; }
      .tt-card.passed { border-color: #f5b301; background: #fff8e1; }
      .tt-card.compact { padding: 8px 10px; gap: 6px; border-radius: 12px; }
      .tt-head { display: flex; align-items: center; gap: 8px; font-weight: 700; }
      .tt-title { flex: 1; }
      .tt-count, .tt-score { font-weight: 800; color: #475569; }
      .passed .tt-score { color: #b7791f; }
      .tt-bar { height: 8px; border-radius: 999px; background: #e2e8f0; overflow: hidden; }
      .tt-fill { height: 100%; background: #6c63ff; transition: width 0.3s ease; }
      .tt-text { margin: 0; font-size: 0.9rem; color: #334155; }
      .tt-muted { color: #64748b; font-size: 0.85rem; }
      .compact .tt-text { font-size: 0.8rem; }
      .tt-cta {
        border: 0;
        border-radius: 12px;
        padding: 10px 14px;
        font-weight: 800;
        background: #6c63ff;
        color: #fff;
        cursor: pointer;
      }
      .tt-cta:hover { background: #5a52e0; }
      .tt-link { font-weight: 700; font-size: 0.9rem; color: #5a52e0; text-decoration: underline; text-underline-offset: 3px; justify-self: start; }
    `,
  ],
})
export class TopicTestCardComponent {
  private readonly router = inject(Router);

  private readonly statusSignal = signal<TopicTestStatus | null>(null);
  readonly status = this.statusSignal.asReadonly();

  @Input() set topicStatus(value: TopicTestStatus | null | undefined) {
    this.statusSignal.set(value ?? null);
  }
  @Input() compact = false;
  /** Off where the study guide is already one tap away (e.g. inside a practice card). */
  @Input() showGuideLink = true;

  readonly progressPct = computed(() => {
    const s = this.status();
    if (!s || !s.sheetsRequired) return 0;
    return Math.min(100, (s.qualifyingSheets / s.sheetsRequired) * 100);
  });

  openTest(topicId: string): void {
    this.router.navigate(['/tests/topic', topicId]);
  }
}
