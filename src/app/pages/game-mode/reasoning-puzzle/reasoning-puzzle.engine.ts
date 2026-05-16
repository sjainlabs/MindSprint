import { computed, signal } from '@angular/core';
import { type ReasoningPuzzleConfig } from './reasoning-puzzle.types';

const DEFAULT_CONFIG: ReasoningPuzzleConfig = {
  puzzleId: 'reasoning-default',
  prompt: '',
  options: [],
  answer: '',
  difficulty: 50,
};

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export class ReasoningPuzzleEngine {
  readonly puzzleId = signal(DEFAULT_CONFIG.puzzleId);
  readonly prompt = signal(DEFAULT_CONFIG.prompt);
  readonly options = signal<string[]>(DEFAULT_CONFIG.options);
  readonly expectedAnswer = signal(DEFAULT_CONFIG.answer);
  readonly difficulty = signal(DEFAULT_CONFIG.difficulty);

  readonly attempts = signal(0);
  readonly isRunning = signal(false);
  readonly isCompleted = signal(false);
  readonly isCorrect = signal<boolean | null>(null);
  readonly submittedAnswer = signal('');

  readonly hasOptions = computed(() => this.options().length > 0);

  private config: ReasoningPuzzleConfig = { ...DEFAULT_CONFIG };

  /**
   * Configures a new puzzle and resets all current state.
   * `prompt` and `answer` are required and must come from backend payload.
   */
  configure(
    config: Partial<ReasoningPuzzleConfig> & Pick<ReasoningPuzzleConfig, 'prompt' | 'answer'>,
  ): void {
    const prompt = config.prompt.trim();
    const options = Array.isArray(config.options)
      ? config.options.map((item) => String(item).trim()).filter((item) => item.length > 0)
      : [];
    const answer = String(config.answer).trim();
    const difficulty = clamp(Math.round(config.difficulty ?? DEFAULT_CONFIG.difficulty), 1, 100);

    this.config = {
      puzzleId: config.puzzleId?.trim() || DEFAULT_CONFIG.puzzleId,
      prompt,
      options,
      answer,
      difficulty,
    };

    this.puzzleId.set(this.config.puzzleId);
    this.prompt.set(this.config.prompt);
    this.options.set(this.config.options);
    this.expectedAnswer.set(this.config.answer);
    this.difficulty.set(this.config.difficulty);
    this.reset();
  }

  start(): void {
    if (this.prompt().length === 0 || this.expectedAnswer().length === 0) return;
    this.isRunning.set(true);
  }

  stop(): void {
    this.isRunning.set(false);
  }

  /**
   * Processes a player answer.
   * Returns false if the submission is invalid for current state; true when processed.
   */
  submitAnswer(answer: string): boolean {
    if (!this.isRunning() || this.isCompleted()) {
      return false;
    }

    const normalizedAnswer = normalizeText(answer);
    if (normalizedAnswer.length === 0) {
      return false;
    }

    this.attempts.update((count) => count + 1);
    const isCorrect = normalizedAnswer === normalizeText(this.expectedAnswer());
    this.submittedAnswer.set(answer.trim());
    this.isCorrect.set(isCorrect);

    if (isCorrect) {
      this.isCompleted.set(true);
      this.isRunning.set(false);
    }

    return true;
  }

  reset(): void {
    this.attempts.set(0);
    this.isCompleted.set(false);
    this.isCorrect.set(null);
    this.submittedAnswer.set('');
    this.isRunning.set(false);
  }
}
