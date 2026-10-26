import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { PracticeTopicCatalogService } from '../services/practice-topic-catalog.service';
import {
  StudyGuideError,
  StudyGuideProgress,
  StudyGuideService,
  TopicStudyGuideResponse,
} from '../services/study-guide.service';
import { TopicTestService } from '../services/topic-test.service';
import { checkAnswer, canAutoCheck } from '../shared/utils/answer-check';
import { MathTextComponent } from '../components/math-text/math-text.component';
import { ReadAloudComponent, ReadAloudService } from '../components/read-aloud/read-aloud.component';

export interface GuideSection {
  id: string;
  label: string;
  emoji: string;
}

type TryOutcome = 'correct' | 'got-it' | 'not-yet';

@Component({
  selector: 'app-study-guide-page',
  standalone: true,
  imports: [CommonModule, MathTextComponent, ReadAloudComponent],
  templateUrl: './study-guide-page.component.html',
  styleUrls: ['./study-guide-page.component.css', './study-guide-sections.css'],
})
export class StudyGuidePageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly guides = inject(StudyGuideService);
  private readonly auth = inject(AuthService);
  private readonly catalog = inject(PracticeTopicCatalogService);
  private readonly topicTests = inject(TopicTestService);
  private readonly readAloud = inject(ReadAloudService);

  readonly topicId = signal('');
  /** Opened from a paused Daily Challenge (?from=daily): offer a way back to it. */
  readonly fromDaily = signal(false);
  readonly data = signal<TopicStudyGuideResponse | null>(null);
  readonly loading = signal(true);
  readonly error = signal<StudyGuideError | null>(null);

  readonly guide = computed(() => this.data()?.guide ?? null);
  readonly topic = computed(() => this.data()?.topic ?? null);

  readonly badge = computed(() => {
    const t = this.topic();
    if (!t) return '';
    const grade = t.grade === 0 ? 'Kindergarten' : `Grade ${t.grade}`;
    return t.level ? `${grade} · ${t.level}` : grade;
  });

  /** "Part of: …" only when the shared guide's title says something the topic name doesn't. */
  readonly partOf = computed(() => {
    const g = this.guide();
    const t = this.topic();
    if (!g || !t) return null;
    return g.title.trim().toLowerCase() === t.name.trim().toLowerCase() ? null : g.title;
  });

  readonly sections = computed<GuideSection[]>(() => {
    const g = this.guide();
    if (!g) return [];
    const all: Array<GuideSection & { show: boolean }> = [
      { id: 'what', label: 'What is it?', emoji: '💡', show: !!g.forKids },
      { id: 'ideas', label: 'Key ideas', emoji: '✅', show: g.keyIdeas.length > 0 },
      { id: 'tricks', label: 'Tricks', emoji: '🪄', show: g.tricks.length > 0 },
      { id: 'examples', label: 'Watch me solve it', emoji: '👀', show: g.workedExamples.length > 0 },
      { id: 'try', label: 'Try it yourself', emoji: '✏️', show: g.sampleQuestions.length > 0 },
      { id: 'mistakes', label: 'Watch out!', emoji: '⚠️', show: g.commonMistakes.length > 0 },
      { id: 'parents', label: 'For parents', emoji: '👪', show: true },
    ];
    return all.filter((s) => s.show);
  });

  /* ---------------- Resume ---------------- */

  readonly resumeSection = signal<GuideSection | null>(null);
  private progress: StudyGuideProgress = {};
  private observer: IntersectionObserver | null = null;

  /* ---------------- Worked examples ---------------- */

  /** How many steps of each example are showing. */
  readonly stepsShown = signal<Record<number, number>>({});
  readonly showAllSteps = signal(false);

  /* ---------------- Try it yourself ---------------- */

  readonly tryIndex = signal(0);
  readonly tryInputs = signal<Record<number, string>>({});
  readonly tryOutcomes = signal<Record<number, TryOutcome>>({});
  readonly hintShown = signal<Record<number, boolean>>({});
  readonly answerRevealed = signal<Record<number, boolean>>({});
  /** Result of the last "Check" on the current question; cleared when the answer is edited. */
  readonly checkResult = signal<'correct' | 'incorrect' | null>(null);

  readonly questions = computed(() => this.guide()?.sampleQuestions ?? []);
  readonly currentQuestion = computed(() => this.questions()[this.tryIndex()] ?? null);
  readonly currentAutoCheck = computed(() => {
    const q = this.currentQuestion();
    return q ? canAutoCheck(q.answer) : false;
  });
  readonly triedCount = computed(() => Object.keys(this.tryOutcomes()).length);
  readonly allTried = computed(
    () => this.questions().length > 0 && this.triedCount() >= this.questions().length,
  );

  /* ---------------- Parents ---------------- */

  readonly parentOpen = signal(false);
  readonly methodHidden = signal(false);

  /* ---------------- Footer ---------------- */

  readonly testStatus = computed(() => this.topicTests.statusFor(this.topicId()));
  readonly testEligible = computed(() => this.testStatus()?.state === 'eligible');

  private loadSub: Subscription | null = null;

  ngOnInit(): void {
    this.parentOpen.set(this.guides.getPref('parentOpen'));
    this.methodHidden.set(this.guides.getPref('methodHidden'));

    this.fromDaily.set(this.route.snapshot.queryParamMap.get('from') === 'daily');
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.topicId.set(params.get('topicId') ?? '');
      this.load();
    });

    this.destroyRef.onDestroy(() => {
      this.observer?.disconnect();
      this.loadSub?.unsubscribe();
      this.readAloud.stop();
    });
  }

  load(): void {
    const topicId = this.topicId();
    this.loadSub?.unsubscribe();
    this.observer?.disconnect();
    this.loading.set(true);
    this.error.set(null);
    this.data.set(null);

    this.loadSub = this.guides.topicGuide(topicId).subscribe({
      next: (res) => {
        const first = this.data() === null;
        this.data.set(res);
        this.loading.set(false);
        if (first) this.onGuideReady();
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(
          err instanceof StudyGuideError ? err : new StudyGuideError('UNKNOWN', 'Something went wrong.'),
        );
      },
    });

    this.loadTestStatus(topicId);
  }

  async retry(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.data.set(await this.guides.refreshTopicGuide(this.topicId()));
      this.onGuideReady();
    } catch (err) {
      this.error.set(
        err instanceof StudyGuideError ? err : new StudyGuideError('UNKNOWN', 'Something went wrong.'),
      );
    } finally {
      this.loading.set(false);
    }
  }

  /** Restore per-topic progress and start tracking which section is on screen. */
  private onGuideReady(): void {
    this.progress = this.guides.loadProgress(this.topicId());
    const tryIt = this.progress.tryIt;
    const count = this.questions().length;
    this.tryIndex.set(tryIt ? Math.min(Math.max(0, tryIt.index), Math.max(0, count - 1)) : 0);
    this.tryInputs.set(tryIt?.inputs ?? {});
    this.tryOutcomes.set(tryIt?.outcomes ?? {});
    this.hintShown.set({});
    this.answerRevealed.set({});
    this.checkResult.set(null);
    this.stepsShown.set({});

    const last = this.sections().find((s) => s.id === this.progress.lastSection);
    this.resumeSection.set(last && last.id !== this.sections()[0]?.id ? last : null);

    // Sections render on the next tick.
    setTimeout(() => this.observeSections());
  }

  private loadTestStatus(topicId: string): void {
    const studentId = this.auth.getStoredStudentId();
    if (!studentId || !topicId) return;
    this.topicTests.getStatus(studentId, topicId).catch(() => undefined);
  }

  /* ---------------- Section navigation ---------------- */

  jumpTo(id: string): void {
    const el = this.host.nativeElement.querySelector(`#guide-${id}`) as HTMLElement | null;
    if (!el) return;
    if (id === 'parents' && !this.parentOpen()) this.toggleParents();
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    // Move focus to the heading so keyboard and screen-reader users land there too.
    (el.querySelector('h2') as HTMLElement | null)?.focus({ preventScroll: true });
    this.resumeSection.set(null);
  }

  private observeSections(): void {
    if (typeof IntersectionObserver === 'undefined') return;
    this.observer?.disconnect();
    this.observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (!visible.length) return;
        const id = (visible[0].target as HTMLElement).dataset['section'];
        if (id && id !== this.progress.lastSection) {
          this.progress = { ...this.progress, lastSection: id };
          this.guides.saveProgress(this.topicId(), this.progress);
        }
      },
      // A section counts as "being read" when it crosses the upper part of the screen.
      { rootMargin: '-20% 0px -60% 0px' },
    );
    this.host.nativeElement
      .querySelectorAll('[data-section]')
      .forEach((el: Element) => this.observer!.observe(el));
  }

  /* ---------------- Text helpers ---------------- */

  paragraphs(text: string | null | undefined): string[] {
    return (text ?? '').split(/\n\s*\n|\n/).map((p) => p.trim()).filter(Boolean);
  }

  trickSpeech(t: { name: string; how: string; example: string }): string {
    return `${t.name}. ${t.how}. For example: ${t.example}`;
  }

  /* ---------------- Worked examples ---------------- */

  visibleSteps(index: number, total: number): number {
    return this.showAllSteps() ? total : Math.min(total, this.stepsShown()[index] ?? 0);
  }

  nextStep(index: number, total: number): void {
    this.stepsShown.update((prev) => ({ ...prev, [index]: Math.min(total, (prev[index] ?? 0) + 1) }));
  }

  restartExample(index: number): void {
    this.stepsShown.update((prev) => ({ ...prev, [index]: 0 }));
  }

  toggleShowAll(): void {
    this.showAllSteps.update((v) => !v);
  }

  /* ---------------- Try it yourself ---------------- */

  inputFor(index: number): string {
    return this.tryInputs()[index] ?? '';
  }

  onInput(value: string): void {
    const i = this.tryIndex();
    this.tryInputs.update((prev) => ({ ...prev, [i]: value }));
    this.checkResult.set(null);
    this.saveTryIt();
  }

  toggleHint(): void {
    const i = this.tryIndex();
    this.hintShown.update((prev) => ({ ...prev, [i]: !prev[i] }));
  }

  check(): void {
    const q = this.currentQuestion();
    if (!q) return;
    const verdict = checkAnswer(this.inputFor(this.tryIndex()), q.answer);
    if (verdict === 'manual') {
      this.reveal();
      return;
    }
    this.checkResult.set(verdict);
    if (verdict === 'correct') this.setOutcome('correct');
  }

  reveal(): void {
    const i = this.tryIndex();
    this.answerRevealed.update((prev) => ({ ...prev, [i]: true }));
  }

  selfAssess(outcome: 'got-it' | 'not-yet'): void {
    this.setOutcome(outcome);
  }

  goToQuestion(index: number): void {
    const max = this.questions().length - 1;
    this.tryIndex.set(Math.max(0, Math.min(max, index)));
    this.checkResult.set(null);
    this.saveTryIt();
  }

  /** Clears this topic's answers and outcomes for another go. */
  restartTryIt(): void {
    this.tryInputs.set({});
    this.tryOutcomes.set({});
    this.hintShown.set({});
    this.answerRevealed.set({});
    this.checkResult.set(null);
    this.tryIndex.set(0);
    this.saveTryIt();
  }

  outcomeFor(index: number): TryOutcome | undefined {
    return this.tryOutcomes()[index];
  }

  private setOutcome(outcome: TryOutcome): void {
    const i = this.tryIndex();
    this.tryOutcomes.update((prev) => ({ ...prev, [i]: outcome }));
    this.saveTryIt();
  }

  private saveTryIt(): void {
    this.progress = {
      ...this.progress,
      tryIt: { index: this.tryIndex(), inputs: this.tryInputs(), outcomes: this.tryOutcomes() },
    };
    this.guides.saveProgress(this.topicId(), this.progress);
  }

  /* ---------------- Parents ---------------- */

  toggleParents(): void {
    const next = !this.parentOpen();
    this.parentOpen.set(next);
    this.guides.setPref('parentOpen', next);
  }

  setMethodHidden(hidden: boolean): void {
    this.methodHidden.set(hidden);
    this.guides.setPref('methodHidden', hidden);
  }

  /* ---------------- Footer ---------------- */

  /** Opens the normal practice worksheet flow for this topic. */
  async startPractice(): Promise<void> {
    const t = this.topic();
    const topicId = t?.topicId ?? this.topicId();
    await this.catalog.loadMergedCatalogAsync();
    const catalogTopic = this.catalog.getCatalog().find((c) => c.id === topicId);

    await this.router.navigate(['/practice/worksheet'], {
      state: catalogTopic
        ? { selectedTopics: [catalogTopic], questionCount: 10 }
        : {
            selectedTopics: [topicId],
            selectedGrade: t ? String(t.grade) : undefined,
            selectedLevel: t?.level,
            questionCount: 10,
          },
    });
  }

  takeTest(): void {
    this.router.navigate(['/tests/topic', this.topic()?.topicId ?? this.topicId()]);
  }

  browseGuides(): void {
    this.router.navigate(['/study-guides']);
  }

  /** The Daily Challenge screen calls session/start when it opens, which resumes the paused question. */
  backToDaily(): void {
    this.router.navigate(['/daily/play']);
  }
}
