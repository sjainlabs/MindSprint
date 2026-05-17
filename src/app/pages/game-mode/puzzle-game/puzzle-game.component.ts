import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { forkJoin, type Observable } from 'rxjs';
import { MasteryBadgeComponent } from '../../../components/mastery-badge/mastery-badge.component';
import {
  MasteryEngineService,
  type MasteryLevel,
  type MasteryRecommendation,
  type MasteryState,
  type MasterySkillState,
} from '../../../core/mastery/mastery-engine.service';
import {
  PuzzleEngineService,
  type DynamicPuzzle,
  type PuzzleInputType,
  type PuzzleSubmitResult,
  type PuzzleType,
} from '../../../services/puzzle-engine.service';

@Component({
  selector: 'app-puzzle-game',
  standalone: true,
  imports: [CommonModule, FormsModule, MasteryBadgeComponent],
  templateUrl: './puzzle-game.component.html',
  styleUrl: './puzzle-game.component.scss',
})
export class PuzzleGameComponent implements OnInit {
  readonly studentId = input.required<string>();
  readonly initialDifficulty = input(50);
  readonly masterySynced = output<void>();

  readonly currentPuzzles = signal<DynamicPuzzle[]>([]);
  readonly studentAnswers = signal<Record<string, string[]>>({});
  readonly loadingPuzzles = signal(false);
  readonly submittingAnswers = signal(false);
  readonly loadError = signal('');
  readonly hasSubmitted = signal(false);
  readonly sessionId = signal('');
  readonly difficulty = signal(50);
  readonly puzzleResults = signal<Record<string, PuzzleSubmitResult>>({});

  readonly masteryWeakSkills = signal<MasterySkillState[]>([]);
  readonly masteryRecommendedSkill = signal<MasteryRecommendation | null>(null);

  readonly canSubmit = computed(() => {
    if (this.loadingPuzzles() || this.submittingAnswers() || this.hasSubmitted()) {
      return false;
    }

    const puzzles = this.currentPuzzles();
    if (puzzles.length === 0) {
      return false;
    }

    const answers = this.studentAnswers();
    return puzzles.every((puzzle) => {
      const values = answers[puzzle.puzzleId] ?? [];
      const blanks = this.blankCount(puzzle);
      if (values.length < blanks) {
        return false;
      }
      for (let index = 0; index < blanks; index += 1) {
        const value = String(values[index] ?? '').trim();
        if (!value) {
          return false;
        }
        if (!this.isValidInput(puzzle, value)) {
          return false;
        }
      }
      return true;
    });
  });

  readonly solvedCount = computed(
    () => Object.values(this.puzzleResults()).filter((result) => result.correct).length,
  );

  private readonly puzzleEngineService = inject(PuzzleEngineService);
  private readonly masteryEngine = inject(MasteryEngineService);

  ngOnInit(): void {
    this.difficulty.set(this.clampDifficulty(this.initialDifficulty()));
    this.refreshMasteryContext();
    this.generatePuzzles();
  }

  generatePuzzles(): void {
    this.loadingPuzzles.set(true);
    this.loadError.set('');
    this.hasSubmitted.set(false);
    this.puzzleResults.set({});
    this.studentAnswers.set({});

    this.puzzleEngineService
      .generatePuzzles({
        studentId: this.studentId(),
        difficulty: this.difficulty(),
        sessionId: this.sessionId() || undefined,
      })
      .pipe(finalize(() => this.loadingPuzzles.set(false)))
      .subscribe({
        next: (response) => {
          const rawPuzzles = Array.isArray(response?.puzzles) ? response.puzzles : [];
          const puzzles = rawPuzzles.map((puzzle, index) => this.normalizePuzzle(puzzle, index));

          if (puzzles.length === 0) {
            this.loadError.set('Unable to load puzzles right now. Please try again.');
            this.currentPuzzles.set([]);
            return;
          }

          this.currentPuzzles.set(puzzles);
          const resolvedSessionId = response?.sessionId?.trim()
            || this.sessionId()
            || `session-${this.studentId()}`;
          this.sessionId.set(resolvedSessionId);
          this.difficulty.set(this.clampDifficulty(response?.difficulty ?? this.difficulty()));

          const initialAnswers: Record<string, string[]> = {};
          puzzles.forEach((puzzle) => {
            initialAnswers[puzzle.puzzleId] = Array.from({ length: this.blankCount(puzzle) }, () => '');
          });
          this.studentAnswers.set(initialAnswers);
        },
        error: () => {
          this.currentPuzzles.set([]);
          this.loadError.set('Unable to load puzzles right now. Please try again.');
        },
      });
  }

  updateTextAnswer(puzzleId: string, blankIndex: number, value: string): void {
    this.studentAnswers.update((answers) => {
      const next = { ...answers };
      const blanks = [...(next[puzzleId] ?? [])];
      blanks[blankIndex] = value;
      next[puzzleId] = blanks;
      return next;
    });
  }

  selectOption(puzzleId: string, option: string): void {
    this.studentAnswers.update((answers) => ({
      ...answers,
      [puzzleId]: [option],
    }));
  }

  answerValue(puzzleId: string, blankIndex = 0): string {
    return this.studentAnswers()[puzzleId]?.[blankIndex] ?? '';
  }

  submitAnswers(): void {
    if (!this.canSubmit()) {
      return;
    }

    const payload: Record<string, string | string[]> = {};
    const answers = this.studentAnswers();
    this.currentPuzzles().forEach((puzzle) => {
      const values = (answers[puzzle.puzzleId] ?? []).map((value) => value.trim());
      payload[puzzle.puzzleId] = this.blankCount(puzzle) > 1 ? values : (values[0] ?? '');
    });

    this.submittingAnswers.set(true);
    this.puzzleEngineService
      .submitPuzzleAnswers(this.sessionId(), payload)
      .pipe(finalize(() => this.submittingAnswers.set(false)))
      .subscribe({
        next: (response) => {
          const results = this.toResultMap(response?.results ?? []);
          this.puzzleResults.set(results);
          this.hasSubmitted.set(true);
          this.difficulty.set(this.clampDifficulty(response?.difficulty ?? this.difficulty()));
          this.syncMastery(results);
        },
        error: () => {
          this.loadError.set('Failed to submit answers. Please try again.');
        },
      });
  }

  tryNewPuzzleSet(): void {
    this.generatePuzzles();
  }

  inputType(puzzle: DynamicPuzzle): PuzzleInputType {
    if (puzzle.metadata?.inputType) {
      return puzzle.metadata.inputType;
    }
    if (Array.isArray(puzzle.options) && puzzle.options.length > 0) {
      return 'mcq';
    }
    if (puzzle.type === 'arithmetic' || puzzle.type === 'missing-number' || puzzle.type === 'sequence') {
      return 'numeric';
    }
    return 'text';
  }

  blankCount(puzzle: DynamicPuzzle): number {
    const rawCount = puzzle.metadata?.numberOfBlanks ?? puzzle.metadata?.blanks ?? 1;
    const normalizedCount = Number(rawCount);
    if (!Number.isFinite(normalizedCount) || Number.isNaN(normalizedCount)) {
      return 1;
    }
    const flooredCount = Math.floor(normalizedCount);
    return Number.isFinite(flooredCount) ? Math.max(1, flooredCount) : 1;
  }

  blankIndexes(puzzle: DynamicPuzzle): number[] {
    return Array.from({ length: this.blankCount(puzzle) }, (_, index) => index);
  }

  puzzleCardClass(puzzleId: string): string {
    const result = this.puzzleResults()[puzzleId];
    if (!result) {
      return 'border-gray-200 bg-white';
    }
    return result.correct ? 'border-emerald-300 bg-emerald-50' : 'border-rose-300 bg-rose-50';
  }

  resultFor(puzzleId: string): PuzzleSubmitResult | null {
    return this.puzzleResults()[puzzleId] ?? null;
  }

  correctAnswerLabel(result: PuzzleSubmitResult): string {
    if (Array.isArray(result.correctAnswer)) {
      return result.correctAnswer.join(', ');
    }
    return String(result.correctAnswer ?? '');
  }

  masteryLabel(level: MasteryLevel): string {
    if (level === 'mastered') return 'Mastered';
    if (level === 'proficient') return 'Proficient';
    if (level === 'developing') return 'Developing';
    return 'Not started';
  }

  private normalizePuzzle(rawPuzzle: DynamicPuzzle, index: number): DynamicPuzzle {
    const puzzle = rawPuzzle as Partial<DynamicPuzzle>;
    const type = this.normalizeType(puzzle.type);
    const puzzleId = String(puzzle.puzzleId ?? '').trim() || `puzzle-${index + 1}`;
    const prompt = String(puzzle.prompt ?? '').trim();
    const options = Array.isArray(puzzle.options)
      ? puzzle.options.map((option) => String(option).trim()).filter(Boolean)
      : [];

    return {
      puzzleId,
      type,
      prompt,
      options,
      metadata: puzzle.metadata ?? {},
      correctAnswer: puzzle.correctAnswer,
    };
  }

  private normalizeType(type: unknown): PuzzleType {
    if (
      type === 'pattern'
      || type === 'missing-number'
      || type === 'sequence'
      || type === 'comparison'
      || type === 'arithmetic'
      || type === 'logic'
    ) {
      return type;
    }
    return 'logic';
  }

  private toResultMap(results: PuzzleSubmitResult[]): Record<string, PuzzleSubmitResult> {
    const map: Record<string, PuzzleSubmitResult> = {};
    results.forEach((result) => {
      const puzzleId = String(result.puzzleId ?? '').trim();
      if (!puzzleId) {
        return;
      }
      map[puzzleId] = {
        puzzleId,
        correct: Boolean(result.correct),
        correctAnswer: result.correctAnswer,
        skillId: result.skillId,
      };
    });
    return map;
  }

  private syncMastery(results: Record<string, PuzzleSubmitResult>): void {
    const updates = this.currentPuzzles()
      .map((puzzle) => {
        const result = results[puzzle.puzzleId];
        if (!result) {
          return null;
        }
        const skillId = result.skillId ?? puzzle.metadata?.skillId ?? puzzle.type;
        return this.masteryEngine.updateMastery({
          studentId: this.studentId(),
          skillId,
          skillName: this.toSkillName(skillId),
          isCorrect: result.correct,
        });
      })
      .filter((update): update is Observable<MasteryState> => update !== null);

    if (updates.length === 0) {
      this.refreshMasteryContext();
      return;
    }

    forkJoin(updates).subscribe({
      next: () => {
        this.refreshMasteryContext();
      },
      error: () => {
        this.refreshMasteryContext();
      },
    });
  }

  private refreshMasteryContext(): void {
    this.masteryEngine.fetchMasteryState(this.studentId()).subscribe({
      next: (state) => {
        this.masteryWeakSkills.set(state.weakSkills);
        this.masteryRecommendedSkill.set(state.recommendedNextSkill);
        this.masterySynced.emit();
      },
      error: () => {
        this.masteryWeakSkills.set([]);
        this.masteryRecommendedSkill.set(null);
      },
    });
  }

  private isValidInput(puzzle: DynamicPuzzle, value: string): boolean {
    if (this.inputType(puzzle) !== 'numeric') {
      return true;
    }
    return /^-?(\d+(\.\d+)?|\.\d+)$/.test(value);
  }

  private clampDifficulty(value: number): number {
    if (!Number.isFinite(value)) {
      return 50;
    }
    return Math.max(1, Math.min(100, Math.round(value)));
  }

  private toSkillName(skillId: string): string {
    return skillId
      .split(/[-_]+/g)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
