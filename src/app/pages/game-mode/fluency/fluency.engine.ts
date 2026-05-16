import { computed, signal } from '@angular/core';

export type FluencyOperation = 'addition' | 'subtraction' | 'multiplication' | 'division';

export interface FluencyQuestion {
  id: string;
  prompt: string;
  answer: number;
  operation: FluencyOperation;
}

export interface FluencyConfig {
  difficulty: number;
  timeLimitSeconds: number;
  operations: FluencyOperation[];
}

const DEFAULT_CONFIG: FluencyConfig = {
  difficulty: 50,
  timeLimitSeconds: 60,
  operations: ['addition', 'subtraction', 'multiplication', 'division'],
};

const TICK_MS = 100;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickOne<T>(items: T[]): T {
  return items[randomInt(0, items.length - 1)];
}

export class FluencyEngine {
  readonly currentQuestion = signal<FluencyQuestion | null>(null);
  readonly score = signal(0);
  readonly streak = signal(0);
  readonly totalCorrect = signal(0);
  readonly totalAttempted = signal(0);
  readonly isRunning = signal(false);
  readonly isGameOver = signal(false);
  readonly timeRemainingMs = signal(0);
  readonly feedback = signal<'correct' | 'incorrect' | null>(null);

  readonly accuracy = computed(() => {
    const attempted = this.totalAttempted();
    if (attempted === 0) return 0;
    return Math.round((this.totalCorrect() / attempted) * 100);
  });

  readonly timeRemainingSeconds = computed(() =>
    Math.ceil(this.timeRemainingMs() / 1000)
  );

  readonly timerPercent = computed(() =>
    clamp(
      Math.round((this.timeRemainingMs() / (this.config.timeLimitSeconds * 1000)) * 100),
      0,
      100
    )
  );

  private config: FluencyConfig = { ...DEFAULT_CONFIG };
  private gameTimer: ReturnType<typeof setInterval> | null = null;
  private feedbackTimer: ReturnType<typeof setTimeout> | null = null;
  private questionSequence = 0;

  configure(config: Partial<FluencyConfig>): void {
    const difficulty = clamp(Math.round(config.difficulty ?? DEFAULT_CONFIG.difficulty), 1, 100);
    const timeLimitSeconds = clamp(
      Math.round(config.timeLimitSeconds ?? DEFAULT_CONFIG.timeLimitSeconds),
      10,
      300
    );
    const operations =
      Array.isArray(config.operations) && config.operations.length > 0
        ? config.operations
        : DEFAULT_CONFIG.operations;

    this.config = { difficulty, timeLimitSeconds, operations };

    this.score.set(0);
    this.streak.set(0);
    this.totalCorrect.set(0);
    this.totalAttempted.set(0);
    this.isRunning.set(false);
    this.isGameOver.set(false);
    this.timeRemainingMs.set(timeLimitSeconds * 1000);
    this.feedback.set(null);
    this.currentQuestion.set(null);
  }

  start(): void {
    if (this.isRunning()) return;
    this.isRunning.set(true);
    this.isGameOver.set(false);
    this.nextQuestion();
    this.startTimer();
  }

  stop(): void {
    this.clearTimers();
    this.isRunning.set(false);
  }

  reset(): void {
    this.stop();
    this.configure(this.config);
  }

  nextQuestion(): void {
    this.currentQuestion.set(this.generateQuestion());
  }

  submitAnswer(rawAnswer: string): boolean {
    if (!this.isRunning() || this.isGameOver()) return false;

    const question = this.currentQuestion();
    if (!question) return false;

    const parsed = parseInt(rawAnswer.trim(), 10);
    if (!Number.isFinite(parsed)) return false;

    const isCorrect = parsed === question.answer;
    this.totalAttempted.update((n) => n + 1);

    if (isCorrect) {
      const currentStreak = this.streak() + 1;
      const streakBonus = Math.floor(currentStreak / 5);
      this.totalCorrect.update((n) => n + 1);
      this.streak.set(currentStreak);
      this.score.update((n) => n + 10 + streakBonus);
      this.feedback.set('correct');
    } else {
      this.streak.set(0);
      this.feedback.set('incorrect');
    }

    this.feedbackTimer = setTimeout(() => {
      this.feedback.set(null);
      if (this.isRunning() && !this.isGameOver()) {
        this.nextQuestion();
      }
    }, 400);

    return true;
  }

  private startTimer(): void {
    this.gameTimer = setInterval(() => {
      const remaining = this.timeRemainingMs() - TICK_MS;
      if (remaining <= 0) {
        this.timeRemainingMs.set(0);
        this.onGameOver();
      } else {
        this.timeRemainingMs.set(remaining);
      }
    }, TICK_MS);
  }

  private onGameOver(): void {
    this.clearTimers();
    this.isRunning.set(false);
    this.isGameOver.set(true);
  }

  private clearTimers(): void {
    if (this.gameTimer !== null) {
      clearInterval(this.gameTimer);
      this.gameTimer = null;
    }
    if (this.feedbackTimer !== null) {
      clearTimeout(this.feedbackTimer);
      this.feedbackTimer = null;
    }
  }

  private generateQuestion(): FluencyQuestion {
    const operation = pickOne(this.config.operations);
    const difficulty = this.config.difficulty;

    const maxSmall = clamp(Math.round(2 + difficulty * 0.1), 2, 12);
    const maxLarge = clamp(Math.round(5 + difficulty * 0.95), 5, 100);

    let a: number, b: number, answer: number, prompt: string;

    switch (operation) {
      case 'addition': {
        a = randomInt(1, maxLarge);
        b = randomInt(1, maxLarge);
        answer = a + b;
        prompt = `${a} + ${b}`;
        break;
      }
      case 'subtraction': {
        a = randomInt(1, maxLarge);
        b = randomInt(0, a);
        answer = a - b;
        prompt = `${a} − ${b}`;
        break;
      }
      case 'multiplication': {
        a = randomInt(1, maxSmall);
        b = randomInt(1, maxSmall);
        answer = a * b;
        prompt = `${a} × ${b}`;
        break;
      }
      case 'division': {
        b = randomInt(1, maxSmall);
        answer = randomInt(1, maxSmall);
        a = b * answer;
        prompt = `${a} ÷ ${b}`;
        break;
      }
    }

    return {
      id: `fluency-${this.questionSequence++}`,
      prompt,
      answer,
      operation,
    };
  }
}
