import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { PracticeWorksheetQuestion } from '../services/learning-api.service';
import { PracticeTopicCatalogService } from '../services/practice-topic-catalog.service';
import {
  ActiveAdhocTest,
  AdhocSelection,
  AdhocTestQuestion,
  AdhocTestResult,
  AdhocTestService,
  AdhocTopicScore,
  ActiveTestSlot,
} from '../services/adhoc-test.service';
import { LearningPlanService, shortDate } from '../services/learning-plan.service';
import { TestApiError } from '../services/test-api-error';
import { QuestionRendererComponent } from '../question-renderer/question-renderer.component';

type Stage = 'taking' | 'review' | 'results' | 'regenerating' | 'error';

/** Topics under this accuracy get a "Practise this topic" button on the results screen. */
const WEAK_TOPIC_ACCURACY = 80;

@Component({
  selector: 'app-custom-test-take-page',
  standalone: true,
  imports: [CommonModule, QuestionRendererComponent],
  templateUrl: './custom-test-take-page.component.html',
  styleUrls: ['./test-pages.css', './custom-test-take-page.component.css'],
})
export class CustomTestTakePageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly adhoc = inject(AdhocTestService);
  private readonly catalog = inject(PracticeTopicCatalogService);
  private readonly learningPlan = inject(LearningPlanService);

  /** The 3-weekly review test reuses this page (route data `review: true`), graded through the learning plan. */
  readonly isReview = inject(ActivatedRoute).snapshot.data['review'] === true;
  private readonly slot: ActiveTestSlot = this.isReview ? 'review' : 'adhoc';
  /** From the review test result: when the next one is due. */
  readonly nextReviewDate = signal<string | null>(null);
  readonly shortDate = shortDate;

  private studentId = '';

  readonly stage = signal<Stage>('taking');
  readonly errorMessage = signal('');
  readonly submitError = signal('');
  readonly submitting = signal(false);
  readonly confirmOpen = signal(false);

  readonly active = signal<ActiveAdhocTest | null>(null);
  readonly result = signal<AdhocTestResult | null>(null);
  /** Selection behind the test just finished, kept for "Retake" after `active` is cleared. */
  private lastSelection: AdhocSelection | null = null;

  readonly reviewOpen = signal(false);
  readonly reviewTopicFilter = signal<string | null>(null);
  readonly showExpected = signal<Record<string, boolean>>({});

  readonly questions = computed(() => this.active()?.test.questions ?? []);
  readonly currentIndex = computed(() => this.active()?.currentIndex ?? 0);
  readonly currentQuestion = computed(() => this.questions()[this.currentIndex()] ?? null);
  readonly answers = computed<Partial<Record<string, string>>>(() => this.active()?.answers ?? {});
  readonly isLastQuestion = computed(() => this.currentIndex() === this.questions().length - 1);

  readonly topicNames = computed(() => {
    const map = new Map<string, string>();
    for (const t of this.active()?.test.topics ?? []) map.set(t.topicId, t.topicName);
    for (const t of this.result()?.byTopic ?? []) map.set(t.topicId, t.topicName);
    return map;
  });
  readonly isMultiTopic = computed(() => (this.active()?.test.topics.length ?? 0) > 1);

  readonly answeredCount = computed(
    () => this.questions().filter((q) => this.isAnswered(q.id)).length,
  );
  readonly unansweredNumbers = computed(() =>
    this.questions()
      .map((q, i) => (this.isAnswered(q.id) ? null : i + 1))
      .filter((n): n is number => n !== null),
  );

  readonly byTopicWeakestFirst = computed(() =>
    [...(this.result()?.byTopic ?? [])].sort(
      (a, b) => a.accuracy - b.accuracy || a.topicName.localeCompare(b.topicName),
    ),
  );

  readonly filteredReview = computed(() => {
    const filter = this.reviewTopicFilter();
    const all = this.result()?.results ?? [];
    return filter ? all.filter((r) => r.topicId === filter) : all;
  });

  async ngOnInit(): Promise<void> {
    const studentId = this.auth.getStoredStudentId();
    if (!studentId) {
      await this.router.navigate(['/auth/access-code']);
      return;
    }
    this.studentId = studentId;

    const saved = this.adhoc.loadActive(studentId, this.slot);
    if (!saved) {
      // Nothing to take: go build one (or back to the plan, which starts review tests).
      await this.router.navigate([this.isReview ? '/student/dashboard' : '/tests/custom']);
      return;
    }
    this.active.set(saved);
  }

  /* ---------------- Taking ---------------- */

  asRendererQuestion(q: AdhocTestQuestion): PracticeWorksheetQuestion {
    return q as unknown as PracticeWorksheetQuestion;
  }

  topicName(topicId: string): string {
    return this.topicNames().get(topicId) ?? topicId;
  }

  isAnswered(questionId: string): boolean {
    return (this.answers()[questionId] ?? '').trim().length > 0;
  }

  setAnswer(questionId: string, value: string | number | string[]): void {
    this.updateActive((a) => ({ ...a, answers: { ...a.answers, [questionId]: String(value) } }));
  }

  goTo(index: number): void {
    const max = this.questions().length - 1;
    const clamped = Math.max(0, Math.min(max, index));
    this.updateActive((a) => ({ ...a, currentIndex: clamped }));
    this.stage.set('taking');
  }

  next(): void {
    this.goTo(this.currentIndex() + 1);
  }

  prev(): void {
    this.goTo(this.currentIndex() - 1);
  }

  /** Leave without submitting; the test stays saved and resumes from the Tests page. */
  saveAndExit(): void {
    this.router.navigate([this.isReview ? '/student/dashboard' : '/tests']);
  }

  /* ---------------- Submit ---------------- */

  openReview(): void {
    this.submitError.set('');
    this.confirmOpen.set(false);
    this.stage.set('review');
  }

  async submit(): Promise<void> {
    const active = this.active();
    if (!active || this.submitting()) return;

    this.submitting.set(true);
    this.submitError.set('');

    // Every question goes in the payload; blanks count as wrong on the server.
    const answers: Record<string, string> = {};
    for (const q of active.test.questions) {
      answers[q.id] = (active.answers[q.id] ?? '').trim();
    }

    try {
      const payload = { testId: active.test.testId, studentId: this.studentId, answers, startedAt: active.startedAt };
      let result: AdhocTestResult;
      if (this.isReview) {
        const review = await this.learningPlan.submitReview(payload);
        this.nextReviewDate.set(review.nextReviewDate);
        result = review;
      } else {
        result = await this.adhoc.submit(payload);
      }
      this.adhoc.clearActive(this.studentId, this.slot);
      this.lastSelection = active.selection;
      this.result.set(result);
      this.reviewOpen.set(false);
      this.reviewTopicFilter.set(null);
      this.confirmOpen.set(false);
      this.stage.set('results');
      window.scrollTo({ top: 0 });
    } catch (err) {
      const code = err instanceof TestApiError ? err.code : 'UNKNOWN';
      if (code === 'ALREADY_SUBMITTED' || code === 'FORBIDDEN' || code === 'NOT_FOUND') {
        this.adhoc.clearActive(this.studentId, this.slot);
        this.lastSelection = this.isReview ? null : active.selection;
        this.active.set(null);
        this.fail(
          code === 'ALREADY_SUBMITTED' && !this.isReview
            ? `${this.messageOf(err)} You can see it in your test history.`
            : this.messageOf(err),
        );
      } else {
        // INVALID_REQUEST / network: answers are still saved, so they can try again.
        this.submitError.set(this.messageOf(err));
        this.confirmOpen.set(false);
      }
    } finally {
      this.submitting.set(false);
    }
  }

  /* ---------------- Results ---------------- */

  isWeak(topic: AdhocTopicScore): boolean {
    return topic.accuracy < WEAK_TOPIC_ACCURACY;
  }

  barClass(accuracy: number): string {
    if (accuracy >= 80) return 'good';
    if (accuracy >= 50) return 'ok';
    return 'low';
  }

  toggleExpected(questionId: string): void {
    this.showExpected.update((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  }

  /** Opens the normal practice worksheet flow for one topic. */
  async practiseTopic(topicId: string): Promise<void> {
    await this.catalog.loadMergedCatalogAsync();
    const topic = this.catalog.getCatalog().find((t) => t.id === topicId);
    const meta = this.active()?.test.topics.find((t) => t.topicId === topicId);

    await this.router.navigate(['/practice/worksheet'], {
      state: topic
        ? { selectedTopics: [topic], questionCount: 10 }
        : {
            // Topic missing from the cached catalog: fall back to the id-based worksheet state.
            selectedTopics: [topicId],
            selectedGrade: meta ? String(meta.cbseGrade) : undefined,
            selectedLevel: meta?.practiceLevel,
            questionCount: 10,
          },
    });
  }

  /** Same topics and count, new questions. */
  async retake(): Promise<void> {
    const selection = this.lastSelection;
    if (!selection || this.stage() === 'regenerating') return;

    this.stage.set('regenerating');
    try {
      const test = await this.adhoc.generate(this.studentId, selection);
      const next: ActiveAdhocTest = {
        studentId: this.studentId,
        test,
        selection,
        answers: {},
        startedAt: new Date().toISOString(),
        currentIndex: 0,
      };
      this.adhoc.saveActive(next);
      this.adhoc.saveLastSelection(this.studentId, selection);
      this.active.set(next);
      this.result.set(null);
      this.showExpected.set({});
      this.stage.set('taking');
      window.scrollTo({ top: 0 });
    } catch (err) {
      this.fail(this.messageOf(err));
    }
  }

  buildAnother(): void {
    this.router.navigate(['/tests/custom']);
  }

  goToTests(): void {
    this.router.navigate(['/tests']);
  }

  goToDashboard(): void {
    this.router.navigate(['/student/dashboard']);
  }

  canRetake(): boolean {
    return !this.isReview && !!this.lastSelection;
  }

  /* ---------------- Helpers ---------------- */

  private updateActive(fn: (a: ActiveAdhocTest) => ActiveAdhocTest): void {
    const current = this.active();
    if (!current) return;
    const next = fn(current);
    this.active.set(next);
    this.adhoc.saveActive(next, this.slot);
  }

  private fail(message: string): void {
    this.errorMessage.set(message);
    this.stage.set('error');
  }

  private messageOf(err: unknown): string {
    return err instanceof Error && err.message ? err.message : 'Something went wrong. Please try again.';
  }
}
