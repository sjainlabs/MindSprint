import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { StudyGuideService } from '../services/study-guide.service';
import {
  AnswerResponse,
  DAILY_GOAL_MINUTES,
  DailyChallengeError,
  DailyChallengeService,
  DailyQuestion,
  DailySession,
  gradeName,
} from '../services/daily-challenge.service';
import { MathTextComponent } from '../components/math-text/math-text.component';
import { columnLayout } from '../shared/utils/column-layout';
import { DailyAnswerPadComponent } from './daily-answer-pad.component';
import { GradePickerComponent } from '../components/grade-picker/grade-picker.component';
import { ResultsRewardsComponent } from '../rewards/results-rewards.component';

type Phase = 'loading' | 'grade' | 'question' | 'feedback' | 'completed' | 'error';

@Component({
  selector: 'app-daily-play-page',
  standalone: true,
  imports: [CommonModule, MathTextComponent, DailyAnswerPadComponent, GradePickerComponent, ResultsRewardsComponent],
  templateUrl: './daily-play-page.component.html',
  styleUrls: ['../tests/test-pages.css', './daily-play-page.component.css'],
})
export class DailyPlayPageComponent implements OnInit {
  private readonly api = inject(DailyChallengeService);
  private readonly auth = inject(AuthService);
  private readonly guides = inject(StudyGuideService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(DailyAnswerPadComponent) pad?: DailyAnswerPadComponent;

  readonly goal = DAILY_GOAL_MINUTES;
  readonly gradeName = gradeName;

  readonly phase = signal<Phase>('loading');
  readonly errorMessage = signal('');
  readonly notice = signal('');
  readonly question = signal<DailyQuestion | null>(null);
  readonly answer = signal('');
  readonly submitting = signal(false);
  readonly submitError = signal('');
  readonly feedback = signal<AnswerResponse | null>(null);
  readonly today = signal<DailySession | null>(null);

  readonly pauseOpen = signal(false);
  readonly pauseBusy = signal(false);
  readonly pauseError = signal('');

  readonly gradeBusy = signal(false);

  readonly column = computed(() => {
    const q = this.question();
    return q?.layout === 'vertical' ? columnLayout(q.prompt, q.metadata) : null;
  });

  readonly minutesToday = computed(() => Math.floor(this.today()?.activeMinutes ?? 0));
  readonly goalPercent = computed(() => Math.min(100, (this.minutesToday() / this.goal) * 100));

  /** The topic just reached mastered/excelled. */
  readonly newBadge = computed(() => {
    const f = this.feedback();
    if (!f) return null;
    const { status, previousStatus } = f.topic;
    return status !== previousStatus && (status === 'mastered' || status === 'excelled') ? status : null;
  });

  private studentId = '';

  /* ---------------- Timer: time on screen, excluding pauses and time in the background ---------------- */

  private elapsedMs = 0;
  private runningSince: number | null = null;

  private startTimer(): void {
    if (this.runningSince === null && !document.hidden) this.runningSince = performance.now();
  }

  private stopTimer(): void {
    if (this.runningSince !== null) {
      this.elapsedMs += performance.now() - this.runningSince;
      this.runningSince = null;
    }
    const q = this.question();
    if (q && this.phase() === 'question') this.api.saveElapsed(this.studentId, q.questionId, this.elapsedMs);
  }

  private currentElapsed(): number {
    return this.elapsedMs + (this.runningSince === null ? 0 : performance.now() - this.runningSince);
  }

  private readonly onVisibility = () => {
    if (document.hidden) this.stopTimer();
    else if (this.phase() === 'question' && !this.pauseOpen()) this.startTimer();
  };

  ngOnInit(): void {
    this.studentId = this.auth.getStoredStudentId() ?? '';
    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('pagehide', this.onVisibility);
    this.destroyRef.onDestroy(() => {
      this.stopTimer();
      document.removeEventListener('visibilitychange', this.onVisibility);
      window.removeEventListener('pagehide', this.onVisibility);
    });
    this.start();
  }

  /* ---------------- Session ---------------- */

  async start(grade?: string): Promise<void> {
    if (!this.studentId) {
      this.fail('Please log in to play the Daily Challenge.');
      return;
    }
    if (!grade) this.phase.set('loading');
    try {
      const res = await this.api.start(this.studentId, grade);
      this.today.set(res.today);
      if (res.completed || !res.question) {
        this.phase.set('completed');
        return;
      }
      this.show(res.question);
    } catch (err) {
      const e = err as DailyChallengeError;
      if (e.code === 'GRADE_REQUIRED') {
        this.phase.set('grade');
        if (grade) this.errorMessage.set(e.message);
      } else {
        this.fail(e.message);
      }
    } finally {
      this.gradeBusy.set(false);
    }
  }

  chooseGrade(grade: string): void {
    if (this.gradeBusy()) return;
    this.gradeBusy.set(true);
    this.errorMessage.set('');
    this.start(grade);
  }

  private show(q: DailyQuestion): void {
    const same = this.question()?.questionId === q.questionId;
    this.question.set(q);
    if (!same) this.answer.set('');
    this.feedback.set(null);
    this.submitError.set('');
    this.phase.set('question');
    this.elapsedMs = this.api.loadElapsed(this.studentId, q.questionId);
    this.runningSince = null;
    this.startTimer();
    setTimeout(() => this.pad?.focus());
  }

  async submit(): Promise<void> {
    const q = this.question();
    const answer = this.answer().trim();
    if (!q || !answer || this.submitting()) return;
    this.submitting.set(true);
    this.submitError.set('');
    this.stopTimer();
    const ms = this.elapsedMs;
    try {
      const res = await this.api.answer(this.studentId, q.questionId, answer, ms);
      this.api.saveElapsed(this.studentId, '', 0);
      this.today.set(res.today ?? this.today());
      this.feedback.set(res);
      this.notice.set('');
      this.phase.set('feedback');
    } catch (err) {
      const e = err as DailyChallengeError;
      if (e.code === 'STALE_QUESTION') {
        // Answered already (double tap or another device): carry on from wherever the session is now.
        this.notice.set('That question was already answered, so here is the next one.');
        await this.start();
      } else {
        this.submitError.set(e.message);
        this.startTimer();
      }
    } finally {
      this.submitting.set(false);
    }
  }

  next(): void {
    const f = this.feedback();
    if (f?.completed || !f?.next) {
      this.phase.set('completed');
      return;
    }
    this.notice.set('');
    this.show(f.next);
  }

  /* ---------------- Pause ---------------- */

  openPause(): void {
    this.stopTimer();
    this.pauseError.set('');
    this.pauseOpen.set(true);
    // Saving the pause on the server; the sheet works even if this fails.
    this.api.pause(this.studentId, 'break').catch(() => undefined);
  }

  async resume(): Promise<void> {
    this.pauseOpen.set(false);
    await this.start();
  }

  async openGuide(topicId = this.question()?.topicId): Promise<void> {
    if (!topicId || this.pauseBusy()) return;
    this.stopTimer();
    this.pauseBusy.set(true);
    this.pauseError.set('');
    try {
      const res = await this.api.pause(this.studentId, 'study-guide', topicId);
      if (res.studyGuide) this.guides.seedTopicGuide(topicId, res.studyGuide);
      await this.router.navigate(['/study-guides/topic', topicId], { queryParams: { from: 'daily' } });
    } catch (err) {
      this.pauseError.set((err as DailyChallengeError).message);
    } finally {
      this.pauseBusy.set(false);
    }
  }

  async finishForToday(): Promise<void> {
    this.stopTimer();
    this.api.pause(this.studentId, 'break').catch(() => undefined);
    await this.router.navigate(['/daily']);
  }

  async stopForToday(): Promise<void> {
    await this.router.navigate(['/daily']);
  }

  /* ---------------- Helpers ---------------- */

  celebration(f: AnswerResponse): string {
    if (!f.correct) return 'Nice try!';
    return f.slow ? 'Correct, now try a bit faster' : 'Speedy!';
  }

  kindLabel(kind: DailyQuestion['kind']): string | null {
    return kind === 'review' ? 'Review' : null;
  }

  private fail(message: string): void {
    this.errorMessage.set(message);
    this.phase.set('error');
  }
}
