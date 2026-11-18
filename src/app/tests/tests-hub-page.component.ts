import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { LearningApiService } from '../services/learning-api.service';
import { AdhocSelection, AdhocTestService } from '../services/adhoc-test.service';
import { LearningPlanError, LearningPlanService, ReviewSchedule } from '../services/learning-plan.service';
import { ReviewTestCardComponent } from '../student/review-test-card.component';
import { GradePickerComponent } from '../components/grade-picker/grade-picker.component';
import { ParentTestService, ParentTestSummary } from '../services/parent-test.service';

type HistoryKind = 'adhoc-test' | 'topic-test';
type HistoryFilter = 'all' | HistoryKind;

interface TestHistoryEntry {
  id: string;
  kind: HistoryKind;
  submittedAt: string;
  topics: string[];
  /** Tests a parent wrote have a title instead of topics. */
  title: string | null;
  fromParent: boolean;
  score: number | null;
  total: number | null;
  accuracy: number | null;
  details: Array<{
    questionId: string;
    prompt: string;
    correct: boolean;
    submittedAnswer: string;
    expectedAnswer: string;
  }>;
}

/** Landing page for the dashboard's "Tests" button: the scheduled review test, custom tests and test history. */
@Component({
  selector: 'app-tests-hub-page',
  standalone: true,
  imports: [CommonModule, ReviewTestCardComponent, GradePickerComponent],
  templateUrl: './tests-hub-page.component.html',
  styleUrls: ['./test-pages.css', './tests-hub-page.component.css'],
})
export class TestsHubPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly api = inject(LearningApiService);
  private readonly adhoc = inject(AdhocTestService);
  private readonly plans = inject(LearningPlanService);
  private readonly parentTests = inject(ParentTestService);

  @ViewChild(ReviewTestCardComponent) reviewCard?: ReviewTestCardComponent;

  studentId = '';
  /** The scheduled review test, from the learning plan, so both pages show the same dates and button. */
  readonly review = signal<ReviewSchedule | null>(null);
  readonly reviewPhase = signal<'loading' | 'ready' | 'grade' | 'error'>('loading');
  readonly reviewError = signal('');
  readonly gradeBusy = signal(false);
  private reviewGradePending = false;

  readonly loadingHistory = signal(true);
  readonly historyError = signal('');
  readonly history = signal<TestHistoryEntry[]>([]);
  readonly filter = signal<HistoryFilter>('all');
  readonly expanded = signal<Record<string, boolean>>({});

  readonly unfinished = signal<{ topicCount: number; answered: number; total: number } | null>(null);
  readonly lastSelection = signal<AdhocSelection | null>(null);

  /** Tests a parent wrote, still waiting to be taken; `answered` when one is part done on this device. */
  readonly fromParent = signal<Array<ParentTestSummary & { answered: number | null }>>([]);
  readonly fromParentError = signal('');
  readonly opening = signal<string | null>(null);

  readonly filteredHistory = computed(() => {
    const f = this.filter();
    return f === 'all' ? this.history() : this.history().filter((h) => h.kind === f);
  });

  readonly counts = computed(() => ({
    all: this.history().length,
    adhoc: this.history().filter((h) => h.kind === 'adhoc-test').length,
    topic: this.history().filter((h) => h.kind === 'topic-test').length,
  }));

  async ngOnInit(): Promise<void> {
    const studentId = this.auth.getStoredStudentId();
    if (!studentId) {
      await this.router.navigate(['/auth/access-code']);
      return;
    }
    this.studentId = studentId;
    void this.loadReview();

    const active = this.adhoc.loadActive(studentId);
    if (active) {
      this.unfinished.set({
        topicCount: active.test.topics.length,
        answered: Object.values(active.answers).filter((a) => a.trim()).length,
        total: active.test.questionCount,
      });
    }
    this.lastSelection.set(this.adhoc.loadLastSelection(studentId));
    void this.loadFromParent();

    await this.loadHistory(studentId);
  }

  async loadReview(quiet = false): Promise<void> {
    if (!quiet) this.reviewPhase.set('loading');
    this.reviewError.set('');
    try {
      this.review.set((await this.plans.plan(this.studentId)).reviewTest);
      this.reviewPhase.set('ready');
    } catch (err) {
      const e = err as LearningPlanError;
      if (e.code === 'GRADE_REQUIRED') {
        this.reviewPhase.set('grade');
      } else if (!this.review()) {
        this.reviewError.set(e.message);
        this.reviewPhase.set('error');
      }
    }
  }

  /** Starting the review test can also say GRADE_REQUIRED: ask, then start it. */
  askGradeForReview(): void {
    this.reviewGradePending = true;
    this.reviewPhase.set('grade');
  }

  /** Same as the learning plan: remember the grade for this visit, then retry. */
  async pickGrade(grade: string): Promise<void> {
    this.plans.setGrade(this.studentId, grade);
    if (this.reviewGradePending && this.review()) {
      this.reviewGradePending = false;
      this.reviewPhase.set('ready');
      // The card is back on screen after this change detection pass.
      setTimeout(() => this.reviewCard?.start());
      return;
    }
    this.gradeBusy.set(true);
    await this.loadReview();
    this.gradeBusy.set(false);
  }

  async loadHistory(studentId = this.auth.getStoredStudentId() ?? ''): Promise<void> {
    this.loadingHistory.set(true);
    this.historyError.set('');
    try {
      const raw = await this.api.getWorksheetHistory(studentId);
      const entries = (raw ?? [])
        .filter((w: any) => w?.kind === 'adhoc-test' || w?.kind === 'topic-test')
        .map((w: any): TestHistoryEntry => ({
          id: String(w.worksheetId ?? w.testId ?? w.submittedAt),
          kind: w.kind,
          submittedAt: w.submittedAt,
          topics: Array.isArray(w.topics) ? w.topics : w.topicName ? [w.topicName] : [],
          title: w.title ?? null,
          fromParent: w.fromParent === true,
          score: w.score ?? null,
          total: w.total ?? null,
          accuracy: w.accuracy ?? null,
          details: Array.isArray(w.details) ? w.details : [],
        }))
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      this.history.set(entries);
    } catch {
      this.historyError.set('Unable to load your test history right now.');
    } finally {
      this.loadingHistory.set(false);
    }
  }

  toggle(id: string): void {
    this.expanded.update((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async loadFromParent(): Promise<void> {
    try {
      const saved = this.adhoc.loadActive(this.studentId, 'parent');
      const tests = await this.parentTests.assigned(this.studentId);
      this.fromParent.set(tests.map((t) => ({
        ...t,
        answered: saved?.test.testId === t.testId ? Object.values(saved.answers).filter((a) => a.trim()).length : null,
      })));
      this.fromParentError.set('');
    } catch {
      this.fromParentError.set('Could not check for tests from your parent.');
    }
  }

  /** Opens a parent's test on the take page, carrying on if it was started on this device. */
  async startFromParent(testId: string): Promise<void> {
    const saved = this.adhoc.loadActive(this.studentId, 'parent');
    if (saved?.test.testId !== testId) {
      this.opening.set(testId);
      try {
        const test = await this.parentTests.open(this.studentId, testId);
        this.adhoc.saveActive({
          studentId: this.studentId,
          test,
          selection: { topicIds: [], questionCount: test.questionCount },
          answers: {},
          startedAt: new Date().toISOString(),
          currentIndex: 0,
        }, 'parent');
      } catch (err) {
        this.fromParentError.set(err instanceof Error && err.message ? err.message : 'Could not open that test.');
        this.opening.set(null);
        return;
      }
    }
    await this.router.navigate(['/tests/parent/take']);
  }

  resume(): void {
    this.router.navigate(['/tests/custom/take']);
  }

  /** The writer needs a signed-in parent; its guard sends anyone else to the parent login first. */
  writeManualTest(): void {
    this.router.navigate(['/tests/manual'], { queryParams: { studentId: this.studentId, from: 'tests' } });
  }

  buildTest(): void {
    this.router.navigate(['/tests/custom']);
  }
}
