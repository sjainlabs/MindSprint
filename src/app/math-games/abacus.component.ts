import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import {
  AbacusAnswerResponse,
  AbacusFamilyStatus,
  AbacusOperation,
  AbacusRound,
  MathBrainError,
  MathBrainService,
  OPERATIONS,
} from '../services/math-brain.service';
import { percent } from '../services/daily-challenge.service';
import { DailyAnswerPadComponent } from '../daily/daily-answer-pad.component';
import { GradePickerComponent } from '../components/grade-picker/grade-picker.component';
import { SorobanComponent } from './soroban.component';

type Phase = 'setup' | 'grade' | 'loading' | 'ready' | 'flash' | 'answer' | 'feedback' | 'summary' | 'error';
type Mode = 'flash' | 'all';

const SET_SIZE = 10;
const READY_MS = 700;
/** A short blank between flashed numbers, so two equal numbers in a row still look like two. */
const GAP_MS = 180;
const PREF_KEY = 'mindsprint.abacus.pref';

interface Prefs {
  mode: Mode;
  soroban: boolean;
}

@Component({
  selector: 'app-math-games-abacus',
  standalone: true,
  imports: [CommonModule, RouterLink, DailyAnswerPadComponent, GradePickerComponent, SorobanComponent],
  templateUrl: './abacus.component.html',
  styleUrls: ['../tests/test-pages.css', '../math-brain/math-brain.css', './abacus.component.css'],
})
export class AbacusComponent implements OnInit {
  private readonly api = inject(MathBrainService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(DailyAnswerPadComponent) pad?: DailyAnswerPadComponent;

  readonly operations = OPERATIONS;
  readonly setSize = SET_SIZE;

  readonly phase = signal<Phase>('setup');
  readonly error = signal('');
  readonly notice = signal('');
  readonly families = signal<AbacusFamilyStatus[]>([]);
  readonly statusLoading = signal(true);

  readonly operation = signal<AbacusOperation>('random');
  readonly mode = signal<Mode>('flash');
  readonly showSoroban = signal(false);
  readonly practiceLevelOn = signal(false);
  readonly practiceLevel = signal(3);

  readonly round = signal<AbacusRound | null>(null);
  readonly flashIndex = signal(-1);
  readonly answer = signal('');
  readonly submitting = signal(false);
  readonly result = signal<AbacusAnswerResponse | null>(null);
  readonly setResults = signal<AbacusAnswerResponse[]>([]);
  readonly gradeBusy = signal(false);

  /** The round on screen: during feedback it has already been added to the results. */
  readonly roundNumber = computed(() => Math.min(SET_SIZE, this.setResults().length + (this.phase() === 'feedback' ? 0 : 1)));
  readonly flashText = computed(() => this.round()?.display[this.flashIndex()] ?? '');

  readonly setSummary = computed(() => {
    const rs = this.setResults();
    if (!rs.length) return null;
    const correct = rs.filter((r) => r.correct).length;
    const seconds = rs.reduce((a, r) => a + (r.timeTakenSeconds ?? 0), 0) / rs.length;
    return {
      correct,
      total: rs.length,
      accuracy: Math.round((correct / rs.length) * 100),
      averageSeconds: Math.round(seconds * 10) / 10,
      level: rs[rs.length - 1].level,
      levelUps: rs.filter((r) => r.levelChange === 1).length,
      practice: !!this.round()?.chosenLevel,
    };
  });

  private studentId = '';
  private nextRound: AbacusRound | null = null;
  /** Bumped to cancel a running flash sequence or feedback delay. */
  private run = 0;
  private timers: Array<ReturnType<typeof setTimeout>> = [];
  private elapsedMs = 0;
  private runningSince: number | null = null;
  private replayFlash = false;

  private readonly onVisibility = () => {
    if (document.hidden) {
      this.stopTimer();
      // A flash sequence can't be "paused" fairly; show it again when the child comes back.
      if (this.phase() === 'flash') {
        this.cancelTimers();
        this.replayFlash = true;
      }
    } else if (this.replayFlash && this.round()) {
      this.replayFlash = false;
      this.play(this.round()!);
    } else if (this.phase() === 'answer') {
      this.startTimer();
    }
  };

  ngOnInit(): void {
    this.studentId = this.auth.getStoredStudentId() ?? '';
    this.loadPrefs();
    document.addEventListener('visibilitychange', this.onVisibility);
    this.destroyRef.onDestroy(() => {
      this.cancelTimers();
      document.removeEventListener('visibilitychange', this.onVisibility);
    });
    this.loadStatus();
  }

  /* ---------------- Setup ---------------- */

  async loadStatus(): Promise<void> {
    this.statusLoading.set(true);
    try {
      const status = await this.api.abacusStatus(this.studentId);
      this.families.set(status.families);
    } catch {
      // The game still works; we just can't show locks and levels up front.
    } finally {
      this.statusLoading.set(false);
    }
  }

  familyFor(op: AbacusOperation): AbacusFamilyStatus | null {
    return this.families().find((f) => f.family === op) ?? null;
  }

  isLocked(op: AbacusOperation): boolean {
    const f = this.familyFor(op);
    return !!f && !f.unlocked;
  }

  pickOperation(op: AbacusOperation): void {
    if (this.isLocked(op)) return;
    this.operation.set(op);
  }

  setMode(m: Mode): void {
    this.mode.set(m);
    this.savePrefs();
  }

  toggleSoroban(): void {
    this.showSoroban.update((v) => !v);
    this.savePrefs();
  }

  startSet(): void {
    this.setResults.set([]);
    this.nextRound = null;
    this.requestRound();
  }

  async requestRound(grade?: string): Promise<void> {
    this.cancelTimers();
    this.phase.set('loading');
    this.error.set('');
    try {
      const res = await this.api.abacusRound(this.studentId, {
        operation: this.operation(),
        level: this.practiceLevelOn() ? this.practiceLevel() : undefined,
        grade,
      });
      this.play(res.round);
    } catch (err) {
      const e = err as MathBrainError;
      if (e.code === 'GRADE_REQUIRED') {
        this.phase.set('grade');
      } else if (e.code === 'NOT_UNLOCKED') {
        this.notice.set(e.message);
        this.phase.set('setup');
        this.loadStatus();
      } else {
        this.error.set(e.message);
        this.phase.set('error');
      }
    } finally {
      this.gradeBusy.set(false);
    }
  }

  chooseGrade(grade: string): void {
    this.gradeBusy.set(true);
    this.requestRound(grade);
  }

  /* ---------------- A round ---------------- */

  private play(round: AbacusRound): void {
    this.cancelTimers();
    const token = ++this.run;
    this.round.set(round);
    this.answer.set('');
    this.result.set(null);
    this.elapsedMs = 0;
    this.runningSince = null;

    if (this.mode() === 'all') {
      this.toAnswer();
      return;
    }

    // Flash: "Ready?", then each number for flashMs with a short blank in between.
    this.phase.set('ready');
    this.flashIndex.set(-1);
    let at = READY_MS;
    round.display.forEach((_, i) => {
      this.later(token, at, () => {
        this.phase.set('flash');
        this.flashIndex.set(i);
      });
      at += round.flashMs;
      this.later(token, at, () => this.flashIndex.set(-1));
      at += GAP_MS;
    });
    this.later(token, at - GAP_MS, () => this.toAnswer());
  }

  /** The timer starts when the last number disappears (flash) or the sum appears (show all). */
  private toAnswer(): void {
    this.phase.set('answer');
    this.startTimer();
    setTimeout(() => this.pad?.focus());
  }

  async submit(): Promise<void> {
    const r = this.round();
    const answer = this.answer().trim();
    if (!r || !answer || this.submitting()) return;
    this.submitting.set(true);
    this.stopTimer();
    try {
      const res = await this.api.abacusAnswer(this.studentId, r.roundId, answer, this.elapsedMs);
      this.result.set(res);
      this.setResults.update((rs) => [...rs, res]);
      this.nextRound = res.next;
      this.phase.set('feedback');
      this.families.update((fs) => fs.map((f) => (f.family === res.family ? { ...f, level: res.level } : f)));
      // Long enough to read the answer when it was wrong, or the level message.
      const wait = (res.correct ? 1300 : 2600) + (res.levelChange !== 0 ? 900 : 0);
      this.later(this.run, wait, () => this.continue());
    } catch (err) {
      const e = err as MathBrainError;
      if (e.code === 'STALE_ROUND') {
        this.notice.set('That round had already finished, so here is a new one.');
        await this.requestRound();
      } else {
        this.error.set(e.message);
        this.startTimer();
      }
    } finally {
      this.submitting.set(false);
    }
  }

  /** After feedback: the next round, or the summary after every 10. */
  continue(): void {
    if (this.phase() !== 'feedback') return;
    this.cancelTimers();
    this.notice.set('');
    if (this.setResults().length >= SET_SIZE) {
      this.phase.set('summary');
      return;
    }
    if (this.nextRound) this.play(this.nextRound);
    else this.requestRound();
  }

  anotherSet(): void {
    this.setResults.set([]);
    if (this.nextRound) this.play(this.nextRound);
    else this.requestRound();
  }

  stop(): void {
    this.cancelTimers();
    this.stopTimer();
    this.notice.set('');
    this.phase.set(this.setResults().length ? 'summary' : 'setup');
    this.loadStatus();
  }

  backToSetup(): void {
    this.phase.set('setup');
    this.loadStatus();
  }

  /* ---------------- Helpers ---------------- */

  percent = percent;

  operationLabel(op: string): string {
    return OPERATIONS.find((o) => o.id === op)?.label ?? op;
  }

  private startTimer(): void {
    if (this.runningSince === null && !document.hidden) this.runningSince = performance.now();
  }

  private stopTimer(): void {
    if (this.runningSince !== null) {
      this.elapsedMs += performance.now() - this.runningSince;
      this.runningSince = null;
    }
  }

  private later(token: number, ms: number, fn: () => void): void {
    this.timers.push(setTimeout(() => token === this.run && fn(), ms));
  }

  private cancelTimers(): void {
    this.run++;
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  private loadPrefs(): void {
    try {
      const p = JSON.parse(window.localStorage.getItem(PREF_KEY) ?? 'null') as Prefs | null;
      if (p?.mode === 'all' || p?.mode === 'flash') this.mode.set(p.mode);
      if (typeof p?.soroban === 'boolean') this.showSoroban.set(p.soroban);
    } catch {
      // defaults
    }
  }

  private savePrefs(): void {
    try {
      window.localStorage.setItem(PREF_KEY, JSON.stringify({ mode: this.mode(), soroban: this.showSoroban() }));
    } catch {
      // not saved; fine for this visit
    }
  }
}
