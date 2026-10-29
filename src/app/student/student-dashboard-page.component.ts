import { Component, DestroyRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { DailyChallengeService, localDate } from '../services/daily-challenge.service';
import {
  KIND_LABELS,
  LearningPlan,
  LearningPlanError,
  LearningPlanService,
  Recommendation,
  STATUS_LABELS,
  gradeBand,
  gradeLabel,
} from '../services/learning-plan.service';
import { GradePickerComponent } from '../components/grade-picker/grade-picker.component';
import { PlanActions } from './plan-actions';
import { ReviewTestCardComponent } from './review-test-card.component';
import { LevelCardComponent } from './level-card.component';
import { RewardsBarComponent } from '../rewards/rewards-bar.component';

type Phase = 'loading' | 'ready' | 'grade' | 'error';

const PLAN_OPEN_KEY = 'mindsprint.plan.open';

/**
 * The learning plan: level, what to do next, the review test and progress. A parent sees the same
 * page in parent mode (?view=parent, or ?studentId=… from their dashboard) with their own notes and settings.
 */
@Component({
  selector: 'app-student-dashboard-page',
  standalone: true,
  imports: [RouterLink, GradePickerComponent, ReviewTestCardComponent, LevelCardComponent, RewardsBarComponent],
  templateUrl: './student-dashboard-page.component.html',
  styleUrls: ['../tests/test-pages.css', './plan-shared.css', './student-dashboard-page.component.css'],
})
export class StudentDashboardPageComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly api = inject(LearningPlanService);
  private readonly daily = inject(DailyChallengeService);
  private readonly actions = inject(PlanActions);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(ReviewTestCardComponent) reviewCard?: ReviewTestCardComponent;

  readonly phase = signal<Phase>('loading');
  readonly error = signal('');
  readonly plan = signal<LearningPlan | null>(null);
  readonly gradeBusy = signal(false);
  readonly opening = signal<string | null>(null);
  /** A gentle nudge toward today's 30 minutes; never a block. */
  readonly dailyBadge = signal<{ text: string; done: boolean } | null>(null);

  readonly studentId = signal('');
  readonly parentMode = signal(false);
  /** A parent who is logged in can switch views; the kid never sees the switch. */
  readonly parentLoggedIn = this.auth.isParentLoggedIn();
  /** Starting sheets and tests only makes sense for the child signed in on this device. */
  readonly canAct = computed(() => this.studentId() === (this.auth.getStoredStudentId() ?? ''));

  readonly kindLabels = KIND_LABELS;
  readonly statusLabels = STATUS_LABELS;
  readonly gradeBand = gradeBand;

  /** The plan folds into one row; kids open it when they want it, parents see it open. */
  private readonly planOpen = signal<boolean | null>(readPlanOpen());
  /** Asking for the grade can't wait behind a closed panel. */
  readonly expanded = computed(() => this.phase() === 'grade' || (this.planOpen() ?? this.parentMode()));
  readonly teaser = computed(() => {
    const p = this.plan();
    if (this.phase() === 'loading') return 'Loading…';
    if (this.phase() === 'grade') return 'Pick a grade to build the plan';
    if (!p) return "Couldn't load the plan";
    const review = p.reviewTest.current.status;
    return [
      `Grade ${gradeLabel(p.level.workingGrade)}`,
      review === 'open' ? '📅 Review test open' : review === 'overdue' ? '📅 Review test overdue' : '',
      p.nextWorksheet ? `Up next: ${p.nextWorksheet.topicName}` : '',
    ]
      .filter(Boolean)
      .join(' · ');
  });

  readonly maxStrand = computed(() => Math.max(100, ...(this.plan()?.strands.map((s) => s.averageScore) ?? [])));
  readonly nextGrade = computed(() => {
    const p = this.plan();
    const next = p?.nextWorksheet;
    return next ? p.recommendations.find((r) => r.topicId === next.topicId)?.grade ?? null : null;
  });
  readonly activityLine = computed(() => {
    const a = this.plan()?.activity;
    if (!a) return null;
    const week = a.last7Days;
    const sheets = `${week.sheets} sheet${week.sheets === 1 ? '' : 's'}`;
    if (week.averageAccuracy === null) return { text: `This week: ${sheets}`, change: null };
    const c = a.accuracyChange;
    const change =
      c === null
        ? null
        : c === 0
          ? { dir: 'same', label: '→ same as last week', aria: 'same as last week' }
          : { dir: c > 0 ? 'up' : 'down', label: `${c > 0 ? '↑' : '↓'} ${Math.abs(c)} pts`, aria: `${c > 0 ? 'up' : 'down'} ${Math.abs(c)} points from last week` };
    return { text: `This week: ${sheets}, ${week.averageAccuracy}%`, change };
  });

  ngOnInit(): void {
    const query = this.route.snapshot.queryParamMap;
    const fromQuery = query.get('studentId');
    this.studentId.set(fromQuery ?? this.auth.getStoredStudentId() ?? '');
    this.parentMode.set(query.get('view') === 'parent' || (!!fromQuery && this.parentLoggedIn && !this.canAct()));
    if (!this.studentId()) {
      this.router.navigate(['/auth/access-code']);
      return;
    }
    if (this.canAct()) this.loadDailyBadge(this.studentId());
    this.load();
    // Sheets, tests and the daily challenge all come back here, which reloads the plan; this also
    // catches work finished in another tab.
    document.addEventListener('visibilitychange', this.onVisible);
    this.destroyRef.onDestroy(() => document.removeEventListener('visibilitychange', this.onVisible));
  }

  private readonly onVisible = () => {
    if (!document.hidden && this.phase() === 'ready') this.load(true);
  };

  async load(quiet = false): Promise<void> {
    if (!quiet) this.phase.set('loading');
    this.error.set('');
    try {
      this.plan.set(await this.api.plan(this.studentId()));
      this.phase.set('ready');
    } catch (err) {
      const e = err as LearningPlanError;
      if (e.code === 'GRADE_REQUIRED') this.phase.set('grade');
      else {
        this.error.set(e.message);
        if (!this.plan()) this.phase.set('error');
      }
    }
  }

  /** Starting the review test can also say GRADE_REQUIRED: ask, then start it. */
  askGradeForReview(): void {
    this.reviewGradePending = true;
    this.phase.set('grade');
  }
  private reviewGradePending = false;

  /** GRADE_REQUIRED: remember the grade for this visit and retry with ?grade=. */
  async pickGrade(grade: string): Promise<void> {
    this.api.setGrade(this.studentId(), grade);
    if (this.reviewGradePending && this.plan()) {
      this.reviewGradePending = false;
      this.phase.set('ready');
      // The card is back on screen after this change detection pass.
      setTimeout(() => this.reviewCard?.start());
      return;
    }
    this.gradeBusy.set(true);
    await this.load();
    this.gradeBusy.set(false);
  }

  togglePlan(): void {
    const open = !this.expanded();
    this.planOpen.set(open);
    try {
      localStorage.setItem(PLAN_OPEN_KEY, String(open));
    } catch {
      // Not remembered; it still toggles.
    }
  }

  setParentMode(on: boolean): void {
    this.parentMode.set(on);
    this.router.navigate([], { queryParams: { view: on ? 'parent' : null }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  async startNext(): Promise<void> {
    const next = this.plan()?.nextWorksheet;
    if (!next || this.opening()) return;
    this.opening.set('next');
    try {
      await this.actions.open(next, this.nextGrade());
    } finally {
      this.opening.set(null);
    }
  }

  async startRecommendation(r: Recommendation): Promise<void> {
    if (this.opening() || !this.canAct()) return;
    this.opening.set(r.topicId);
    try {
      await this.actions.open(r.action, r.grade);
    } finally {
      this.opening.set(null);
    }
  }

  nextButtonText(type: string): string {
    if (type === 'topic-test') return '🏁 Start the topic test';
    if (type === 'study-guide-then-practice') return '📘 Read the guide, then practise';
    return '▶ Start';
  }

  topicsLink(): Record<string, string> {
    return this.canAct() ? {} : { studentId: this.studentId() };
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

function readPlanOpen(): boolean | null {
  try {
    const saved = localStorage.getItem(PLAN_OPEN_KEY);
    return saved === null ? null : saved === 'true';
  } catch {
    return null;
  }
}
