import { computed, signal } from '@angular/core';
import { type AiPuzzleConfig } from './ai-puzzle.types';

const DEFAULT_CONFIG: AiPuzzleConfig = {
  puzzleId: 'puzzle-default',
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

export class AiPuzzleEngine {
  readonly puzzleId = signal(DEFAULT_CONFIG.puzzleId);
  readonly prompt = signal(DEFAULT_CONFIG.prompt);
  readonly options = signal<string[]>(DEFAULT_CONFIG.options);
  readonly expectedAnswer = signal(DEFAULT_CONFIG.answer);
  readonly difficulty = signal(DEFAULT_CONFIG.difficulty);

  readonly isRunning = signal(false);
  readonly isCompleted = signal(false);
  readonly isCorrect = signal<boolean | null>(null);
  readonly submittedAnswer = signal('');

  readonly hasOptions = computed(() => this.options().length > 0);

  private config: AiPuzzleConfig = { ...DEFAULT_CONFIG };

  configure(config: Partial<AiPuzzleConfig> & Pick<AiPuzzleConfig, 'prompt' | 'answer'>): void {
    const prompt = config.prompt.trim();
    const options = Array.isArray(config.options)
      ? config.options.map((item) => String(item).trim()).filter((item) => item.length > 0)
      : [];
    const rawAnswer = String(config.answer).trim();
    const answer = rawAnswer.length > 0 ? rawAnswer : options[0] ?? '';
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
    this.isCompleted.set(false);
    this.isCorrect.set(null);
    this.submittedAnswer.set('');
    this.isRunning.set(false);
  }

  start(): void {
    if (this.prompt().length === 0 || this.expectedAnswer().length === 0) return;
    this.isRunning.set(true);
  }

  stop(): void {
    this.isRunning.set(false);
  }

  submitAnswer(answer: string): boolean {
    if (!this.isRunning() || this.isCompleted()) {
      return false;
    }

    const normalizedAnswer = normalizeText(answer);
    if (normalizedAnswer.length === 0) {
      return false;
    }

    const isCorrect = normalizedAnswer === normalizeText(this.expectedAnswer());
    this.submittedAnswer.set(answer.trim());
    this.isCorrect.set(isCorrect);
    this.isCompleted.set(true);
    this.isRunning.set(false);
    return true;
  }

  reset(): void {
    this.isCompleted.set(false);
    this.isCorrect.set(null);
    this.submittedAnswer.set('');
    this.isRunning.set(false);
  }
}
