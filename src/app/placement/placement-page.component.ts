import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { PracticeWorksheetQuestion } from '../services/learning-api.service';
import { LearningPlanService, gradeLabel } from '../services/learning-plan.service';
import {
  PlacementError,
  PlacementQuestion,
  PlacementService,
  PlacementView,
  SELF_REPORT_OPTIONS,
  STRAND_EMOJI,
  SelfReport,
} from '../services/placement.service';
import { GradePickerComponent } from '../components/grade-picker/grade-picker.component';
import { QuestionRendererComponent } from '../question-renderer/question-renderer.component';
import { SkillBandInfoComponent } from './skill-band-info.component';

type Stage = 'loading' | 'grade' | 'intro' | 'tiles' | 'question' | 'result' | 'error';

/** How long the right/wrong note shows before the next question */
const FEEDBACK_MS = 900;

/**
 * First-time placement. The kid says how each strand of maths feels, then answers a short check
 * that climbs a grade on each right answer and steps down after two misses, so a kid far ahead
 * (or behind) of their school grade lands where they really are. Parents open it again with ?restart=1.
 */
@Component({
  selector: 'app-placement-page',
  standalone: true,
  imports: [RouterLink, GradePickerComponent, QuestionRendererComponent, SkillBandInfoComponent],
  templateUrl: './placement-page.component.html',
  styleUrls: ['../tests/test-pages.css', './placement-page.component.css'],
})
export class PlacementPageComponent implements OnInit {
  private readonly api = inject(PlacementService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly plans = inject(LearningPlanService);

  readonly options = SELF_REPORT_OPTIONS;
  readonly gradeLabel = gradeLabel;
  readonly restart = this.route.snapshot.queryParamMap.get('restart') === '1';

  private studentId = '';
  private shownAt = 0;

  readonly stage = signal<Stage>('loading');
  readonly error = signal('');
  readonly busy = signal(false);
  readonly view = signal<PlacementView | null>(null);

  readonly reports = signal<Record<string, SelfReport>>({});
  readonly ahead = signal(false);
  readonly answer = signal('');
  readonly feedback = signal<boolean | null>(null);

  readonly tiles = computed(() => this.view()?.tiles ?? []);
  readonly answeredTiles = computed(() => this.tiles().filter((t) => this.reports()[t.strand]).length);
  /** Every strand is "I know this": offer harder topics. */
  readonly allKnown = computed(() => this.tiles().length > 0 && this.tiles().every((t) => this.reports()[t.strand] === 'know'));
  readonly question = computed(() => this.view()?.question ?? null);
  readonly progress = computed(() => {
    const v = this.view();
    if (!v) return 0;
    const total = v.asked + v.remaining;
    return total ? Math.round((v.asked / total) * 100) : 0;
  });
  readonly result = computed(() => this.view()?.result ?? null);
  /** How the placed grade compares with school, for the result message */
  readonly comparison = computed(() => {
    const r = this.result();
    if (!r) return null;
    const diff = r.headlineGrade - r.schoolGrade;
    return diff >= 1 ? 'ahead' : diff <= -1 ? 'behind' : 'level';
  });

  async ngOnInit(): Promise<void> {
    this.studentId = this.auth.getStoredStudentId() ?? '';
    if (!this.studentId) {
      await this.router.navigate(['/auth/access-code']);
      return;
    }
    await this.load();
  }

  async load(): Promise<void> {
    this.stage.set('loading');
    this.error.set('');
    try {
      const v = await this.api.get(this.studentId);
      this.view.set(v);
      if (v.status === 'in-progress' && !this.restart) this.showQuestion();
      else if (v.status === 'done' && !this.restart) this.stage.set('result');
      else this.stage.set(v.schoolGrade === null ? 'grade' : 'intro');
    } catch (err) {
      this.fail(err);
    }
  }

  emoji(strand: string): string {
    return STRAND_EMOJI[strand] ?? '🧮';
  }

  /** No grade on record yet: ask once and save it on the student, then show the strands for that grade. */
  async pickGrade(grade: string): Promise<void> {
    this.busy.set(true);
    try {
      await this.plans.saveGrade(this.studentId, grade);
      await this.load();
    } catch (err) {
      this.fail(err);
    } finally {
      this.busy.set(false);
    }
  }

  setReport(strand: string, report: SelfReport): void {
    this.reports.update((r) => ({ ...r, [strand]: report }));
    if (report !== 'know') this.ahead.set(false);
  }

  async begin(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      const v = await this.api.start(this.studentId, this.reports(), this.allKnown() && this.ahead());
      this.view.set(v);
      if (v.status === 'done') this.stage.set('result');
      else this.showQuestion();
    } catch (err) {
      this.fail(err);
    } finally {
      this.busy.set(false);
    }
  }

  setAnswer(value: string | number | string[]): void {
    this.answer.set(String(value));
  }

  asRendererQuestion(q: PlacementQuestion): PracticeWorksheetQuestion {
    return q as unknown as PracticeWorksheetQuestion;
  }

  private showQuestion(): void {
    this.answer.set('');
    this.feedback.set(null);
    this.shownAt = Date.now();
    this.stage.set('question');
  }

  async submit(): Promise<void> {
    const q = this.question();
    if (!q || this.busy() || !this.answer().trim()) return;
    this.busy.set(true);
    try {
      const v = await this.api.answer(this.studentId, q.id, this.answer().trim(), Date.now() - this.shownAt);
      this.feedback.set(v.lastCorrect);
      await new Promise((resolve) => setTimeout(resolve, FEEDBACK_MS));
      this.view.set(v);
      if (v.status === 'done') this.stage.set('result');
      else this.showQuestion();
    } catch (err) {
      const e = err as PlacementError;
      // Answered on another device or tab: carry on from the current question
      if (e.code === 'STALE_QUESTION') await this.load();
      else this.fail(err);
    } finally {
      this.busy.set(false);
    }
  }

  async skip(): Promise<void> {
    this.busy.set(true);
    try {
      await this.api.skip(this.studentId);
    } catch {
      // Skipping is best-effort; the home page still works from the school grade
    } finally {
      this.busy.set(false);
      await this.router.navigate(['/student/dashboard']);
    }
  }

  private fail(err: unknown): void {
    this.error.set((err as PlacementError)?.message || 'Something went wrong. Please try again.');
    this.stage.set('error');
  }
}
