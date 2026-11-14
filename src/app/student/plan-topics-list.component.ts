import { Component, computed, input, model, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PlanStatus, STATUS_LABELS, TopicStanding, gradeLabel } from '../services/learning-plan.service';

const STATUS_ORDER: PlanStatus[] = ['needs-work', 'learning', 'strong', 'mastered', 'not-started'];
const TREND_ICONS: Record<string, string> = { improving: '↑', slipping: '↓' };

/** Topics with their standing, grouped by grade, with a status filter. No loading of its own. */
@Component({
  selector: 'app-plan-topics-list',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="chip-row filters" role="group" aria-label="Show topics">
      <button type="button" class="chip" [class.active]="filter() === null" [attr.aria-pressed]="filter() === null" (click)="filter.set(null)">
        All ({{ inGrade().length }})
      </button>
      @for (s of statuses; track s) {
        @if (counts()[s]) {
          <button type="button" class="chip" [class.active]="filter() === s" [attr.aria-pressed]="filter() === s" (click)="filter.set(s)">
            <span class="dot" [class]="s"></span> {{ labels[s] }} ({{ counts()[s] }})
          </button>
        }
      }
    </div>

    @for (g of groups(); track g.grade) {
      <section class="card">
        <h2>Grade {{ gradeLabel(g.grade) }} <span class="muted small">· {{ g.topics.length }}</span></h2>
        <ul class="topic-list">
          @for (t of g.topics; track t.topicId) {
            <li>
              <span class="dot" [class]="t.status" aria-hidden="true"></span>
              @if (readOnly()) {
                <span class="name">{{ t.topicName }}</span>
              } @else {
                <a class="name" [routerLink]="['/study-guides/topic', t.topicId]">{{ t.topicName }}</a>
              }
              @if (t.band) { <span class="tag">Band {{ t.band }}</span> }
              @if (t.testState === 'eligible') {
                <span class="tag test-ready">🏁 Test ready</span>
              } @else if (t.testState === 'locked') {
                <span class="tag test-locked" title="Another topic's test has to be passed or finished first">🔒 Test waits</span>
              }
              <span class="muted small right">
                {{ labels[t.status] }}@if (t.score !== null) { · {{ t.score }}% }
                @if (trend(t); as icon) { <span [attr.aria-label]="t.trend">{{ icon }}</span> }
                @if (t.slow) { · 🐢 }
              </span>
            </li>
          }
        </ul>
      </section>
    } @empty {
      <section class="card"><p class="muted">{{ topics().length ? 'No topics with this status.' : 'No topics yet.' }}</p></section>
    }
  `,
  styleUrls: ['../tests/test-pages.css', './plan-shared.css'],
  styles: [
    `
      :host { display: grid; gap: 16px; min-width: 0; }
      .filters { margin: 0; }
      .filters .chip { display: inline-flex; align-items: center; gap: 6px; min-height: 38px; }
      .topic-list li { flex-wrap: wrap; padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
      .topic-list .name { text-decoration: none; }
      .topic-list a.name:hover { text-decoration: underline; }
      .right { margin-left: auto; }
      .tag.test-ready { background: #dcfce7; color: #166534; }
      .tag.test-locked { background: #f1f5f9; color: #475569; }
    `,
  ],
})
export class PlanTopicsListComponent {
  readonly topics = input.required<TopicStanding[]>();
  /** Only this grade's topics (a level-card ladder row), or every grade. */
  readonly grade = model<number | null>(null);
  /** Guest analyst: topic names are plain text, not study-guide links. */
  readonly readOnly = input(false);

  readonly statuses = STATUS_ORDER;
  readonly labels = STATUS_LABELS;
  readonly gradeLabel = gradeLabel;
  readonly filter = signal<PlanStatus | null>(null);

  readonly inGrade = computed(() => {
    const g = this.grade();
    return g === null ? this.topics() : this.topics().filter((t) => t.grade === g);
  });

  readonly counts = computed(() => {
    const c: Partial<Record<PlanStatus, number>> = {};
    for (const t of this.inGrade()) c[t.status] = (c[t.status] ?? 0) + 1;
    return c;
  });

  readonly groups = computed(() => {
    const f = this.filter();
    const byGrade = new Map<number, TopicStanding[]>();
    for (const t of this.inGrade()) {
      if (f && t.status !== f) continue;
      byGrade.set(t.grade, [...(byGrade.get(t.grade) ?? []), t]);
    }
    return [...byGrade.entries()].sort((a, b) => a[0] - b[0]).map(([grade, topics]) => ({ grade, topics }));
  });

  trend(t: TopicStanding): string {
    return TREND_ICONS[t.trend] ?? '';
  }
}
