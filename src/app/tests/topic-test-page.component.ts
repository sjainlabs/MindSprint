import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { PracticeWorksheetQuestion } from '../services/learning-api.service';
import {
  ActiveTopicTest,
  TopicTestError,
  TopicTestResult,
  TopicTestService,
  TopicTestStatus,
} from '../services/topic-test.service';
import { QuestionRendererComponent } from '../question-renderer/question-renderer.component';
import { TopicTestCardComponent } from '../components/topic-test-card/topic-test-card.component';
import { triggerConfetti } from '../shared/utils/confetti';
import { ResultsRewardsComponent } from '../rewards/results-rewards.component';

type Stage =
  | 'loading'    // fetching status
  | 'blocked'    // not eligible or already passed: show the card
  | 'confirm'    // rules + Start / Cancel
  | 'generating' // POST /generate in flight
  | 'taking'     // answering questions
  | 'review'     // unanswered warning + final confirmation
  | 'results'
  | 'error';

@Component({
  selector: 'app-topic-test-page',
  standalone: true,
  imports: [CommonModule, QuestionRendererComponent, TopicTestCardComponent, ResultsRewardsComponent],
  templateUrl: './topic-test-page.component.html',
  styleUrls: ['./topic-test-page.component.css'],
})
export class TopicTestPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly topicTests = inject(TopicTestService);

  readonly topicId = this.route.snapshot.paramMap.get('topicId') ?? '';
  private studentId = '';

  readonly stage = signal<Stage>('loading');
  readonly errorMessage = signal('');
  /** Friendly message shown above the card when we land on 'blocked' because of an API error. */
  readonly notice = signal('');
  readonly submitError = signal('');
  readonly submitting = signal(false);
  readonly confirmOpen = signal(false);

  readonly active = signal<ActiveTopicTest | null>(null);
  readonly result = signal<TopicTestResult | null>(null);
  readonly showExpected = signal<Record<string, boolean>>({});

  readonly status = computed<TopicTestStatus | null>(() => this.topicTests.statusFor(this.topicId));
  readonly topicName = computed(
    () => this.active()?.test.topicName ?? this.status()?.topicName ?? 'this topic',
  );

  readonly questions = computed(() => this.active()?.test.questions ?? []);
  readonly currentIndex = computed(() => this.active()?.currentIndex ?? 0);
  readonly currentQuestion = computed(() => this.questions()[this.currentIndex()] ?? null);
  readonly answers = computed<Partial<Record<string, string>>>(() => this.active()?.answers ?? {});

  readonly answeredCount = computed(
    () => this.questions().filter((q) => this.isAnswered(q.id)).length,
  );
  readonly unansweredNumbers = computed(() =>
    this.questions()
      .map((q, i) => (this.isAnswered(q.id) ? null : i + 1))
      .filter((n): n is number => n !== null),
  );
  readonly isLastQuestion = computed(() => this.currentIndex() === this.questions().length - 1);

  async ngOnInit(): Promise<void> {
    const studentId = this.auth.getStoredStudentId();
    if (!studentId) {
      await this.router.navigate(['/auth/access-code']);
      return;
    }
    this.studentId = studentId;

    // Resume an unsubmitted test (refresh / accidental navigation). Generating again would give new questions.
    const saved = this.topicTests.loadActive(studentId, this.topicId);
    if (saved) {
      this.active.set(saved);
      this.stage.set('taking');
      return;
    }

    await this.loadStatus();
  }

  async loadStatus(): Promise<void> {
    this.stage.set('loading');
    this.errorMessage.set('');
    try {
      const [status] = await this.topicTests.getStatus(this.studentId, this.topicId);
      if (!status) {
        this.fail("We couldn't find a topic test for this topic yet. Try a few practice sheets first.");
        return;
      }
      this.stage.set(status.state === 'eligible' ? 'confirm' : 'blocked');
    } catch (err) {
      this.fail(this.messageOf(err));
    }
  }

  /* ---------------- Start ---------------- */

  async start(): Promise<void> {
    if (this.stage() === 'generating') return;
    this.stage.set('generating');
    this.notice.set('');

    try {
      const test = await this.topicTests.generate(this.studentId, this.topicId);
      const active: ActiveTopicTest = {
        studentId: this.studentId,
        test,
        answers: {},
        startedAt: new Date().toISOString(),
        currentIndex: 0,
      };
      this.topicTests.saveActive(active);
      this.active.set(active);
      this.stage.set('taking');
    } catch (err) {
      const code = err instanceof TopicTestError ? err.code : 'UNKNOWN';
      if (code === 'NOT_ELIGIBLE' || code === 'ALREADY_PASSED') {
        this.notice.set(this.messageOf(err));
        await this.refreshStatusAfterRejection(code === 'ALREADY_PASSED' ? 'passed' : 'practising');
        this.stage.set('blocked');
        return;
      }
      if (code === 'NOT_FOUND') {
        this.fail(this.messageOf(err));
        return;
      }
      // Network / unknown: let them try again from the confirm screen.
      this.notice.set(this.messageOf(err));
      this.stage.set('confirm');
    }
  }

  cancel(): void {
    this.router.navigate(['/practice/topic', this.topicId]);
  }

  /* ---------------- Taking ---------------- */

  asRendererQuestion(q: ActiveTopicTest['test']['questions'][number]): PracticeWorksheetQuestion {
    return q as unknown as PracticeWorksheetQuestion;
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

  /** Leave without submitting; the test stays saved and resumes next time. */
  saveAndExit(): void {
    this.router.navigate(['/practice/topic', this.topicId]);
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
      const result = await this.topicTests.submit({
        testId: active.test.testId,
        studentId: this.studentId,
        answers,
        startedAt: active.startedAt,
      });
      this.topicTests.clearActive(this.studentId, this.topicId);
      this.result.set(result);
      this.stage.set('results');
      this.confirmOpen.set(false);
      if (result.passed) setTimeout(() => triggerConfetti(2500), 300);
    } catch (err) {
      const code = err instanceof TopicTestError ? err.code : 'UNKNOWN';
      if (code === 'ALREADY_SUBMITTED') {
        this.topicTests.clearActive(this.studentId, this.topicId);
        this.active.set(null);
        this.notice.set(
          `${this.messageOf(err)} You can see the result in your Insights history.`,
        );
        await this.refreshStatusQuietly();
        this.stage.set(this.status() ? 'blocked' : 'error');
      } else if (code === 'FORBIDDEN' || code === 'NOT_FOUND') {
        this.topicTests.clearActive(this.studentId, this.topicId);
        this.active.set(null);
        this.fail(this.messageOf(err));
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

  toggleExpected(questionId: string): void {
    this.showExpected.update((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  }

  goToPractice(): void {
    this.router.navigate(['/practice/hub']);
  }

  goToTopic(): void {
    this.router.navigate(['/practice/topic', this.topicId]);
  }

  /* ---------------- Helpers ---------------- */

  private updateActive(fn: (a: ActiveTopicTest) => ActiveTopicTest): void {
    const current = this.active();
    if (!current) return;
    const next = fn(current);
    this.active.set(next);
    this.topicTests.saveActive(next);
  }

  private async refreshStatusQuietly(): Promise<void> {
    try {
      await this.topicTests.getStatus(this.studentId, this.topicId);
    } catch {
      // keep whatever we had cached
    }
  }

  /** After NOT_ELIGIBLE / ALREADY_PASSED, make sure the card reflects the server, even if refresh fails. */
  private async refreshStatusAfterRejection(fallback: 'practising' | 'passed'): Promise<void> {
    await this.refreshStatusQuietly();
    const s = this.status();
    if (s && s.state === 'eligible') {
      this.topicTests.ingest([{ ...s, state: fallback }]);
    }
  }

  private fail(message: string): void {
    this.errorMessage.set(message);
    this.stage.set('error');
  }

  private messageOf(err: unknown): string {
    return err instanceof Error && err.message ? err.message : 'Something went wrong. Please try again.';
  }
}
