import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { GradePickerComponent } from '../components/grade-picker/grade-picker.component';
import {
  LearningPlanError,
  LearningPlanService,
  PlanStatus,
  STATUS_LABELS,
  TopicStanding,
  gradeLabel,
} from '../services/learning-plan.service';

const STATUS_ORDER: PlanStatus[] = ['needs-work', 'learning', 'strong', 'mastered', 'not-started'];
const TREND_ICONS: Record<string, string> = { improving: '↑', slipping: '↓' };

/** Every topic with its standing, grouped by grade, with a status filter. */
@Component({
  selector: 'app-plan-topics-page',
  standalone: true,
  imports: [RouterLink, GradePickerComponent],
  template: `
    <main class="page">
      <div class="row-between">
        <h1>All topics</h1>
        @if (gradeFilter() !== null) {
          <button type="button" class="chip active" (click)="gradeFilter.set(null)" aria-label="Show every grade">
            Grade {{ gradeLabel(gradeFilter()!) }} ✕
          </button>
        }
      </div>

      @if (loading()) {
        <section class="card center" aria-busy="true"><div class="spinner"></div></section>
      } @else if (needGrade()) {
        <section class="card">
          <h2>Which grade?</h2>
          <app-grade-picker (picked)="pickGrade($event)" />
        </section>
      } @else if (error()) {
        <section class="card">
          <p class="notice error" role="alert">{{ error() }}</p>
          <button type="button" class="btn primary" (click)="load()">Try again</button>
        </section>
      } @else {
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
                  <a class="name" [routerLink]="['/study-guides/topic', t.topicId]">{{ t.topicName }}</a>
                  @if (t.band) { <span class="tag">Band {{ t.band }}</span> }
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
          <section class="card"><p class="muted">No topics with this status.</p></section>
        }
      }
    </main>
  `,
  styleUrls: ['../tests/test-pages.css', './plan-shared.css'],
  styles: [
    `
      .filters { margin: 0; }
      .filters .chip { display: inline-flex; align-items: center; gap: 6px; min-height: 38px; }
      .topic-list li { flex-wrap: wrap; padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
      .topic-list .name { text-decoration: none; }
      .topic-list .name:hover { text-decoration: underline; }
      .right { margin-left: auto; }
    `,
  ],
})
export class PlanTopicsPageComponent implements OnInit {
  private readonly api = inject(LearningPlanService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly statuses = STATUS_ORDER;
  readonly labels = STATUS_LABELS;
  readonly gradeLabel = gradeLabel;

  readonly loading = signal(true);
  readonly needGrade = signal(false);
  readonly error = signal('');
  readonly topics = signal<TopicStanding[]>([]);
  readonly filter = signal<PlanStatus | null>(null);
  /** From a level-card ladder row (?grade=3). */
  readonly gradeFilter = signal<number | null>(null);
  readonly inGrade = computed(() => {
    const g = this.gradeFilter();
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

  private studentId = '';

  ngOnInit(): void {
    const query = this.route.snapshot.queryParamMap;
    this.studentId = query.get('studentId') ?? this.auth.getStoredStudentId() ?? '';
    const grade = query.get('grade');
    if (grade !== null && grade !== '' && !Number.isNaN(Number(grade))) this.gradeFilter.set(Number(grade));
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    this.needGrade.set(false);
    try {
      this.topics.set(await this.api.topics(this.studentId));
    } catch (err) {
      const e = err as LearningPlanError;
      if (e.code === 'GRADE_REQUIRED') this.needGrade.set(true);
      else this.error.set(e.message);
    } finally {
      this.loading.set(false);
    }
  }

  pickGrade(grade: string): void {
    this.api.setGrade(this.studentId, grade);
    this.load();
  }

  trend(t: TopicStanding): string {
    return TREND_ICONS[t.trend] ?? '';
  }
}
