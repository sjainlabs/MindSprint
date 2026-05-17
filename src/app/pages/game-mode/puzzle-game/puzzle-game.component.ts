import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of, type Observable } from 'rxjs';
import { finalize, map } from 'rxjs/operators';
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
  readonly skillId = input('ai-puzzle');
  readonly initialDifficulty = input(50);
  readonly masterySynced = output<void>();

  readonly currentPuzzles = signal<DynamicPuzzle[]>([]);
  readonly studentAnswers = signal<Record<string, string>>({});

  readonly loadingPuzzles = signal(false);
  readonly submittingAnswers = signal(false);
  readonly loadError = signal('');
  readonly hasSubmitted = signal(false);

  readonly puzzleSessionId = signal('');
  readonly difficulty = signal(50);
  readonly score = signal(0);
  readonly total = signal(0);
  readonly streak = signal(0);
  readonly puzzleResults = signal<Record<string, PuzzleSubmitResult>>({});

  readonly masteryWeakSkills = signal<MasterySkillState[]>([]);
  readonly masteryRecommendedSkill = signal<MasteryRecommendation | null>(null);
  readonly masteryBadges = signal<string[]>([]);

  readonly canSubmit = computed(() => {
    if (this.loadingPuzzles() || this.submittingAnswers() || this.hasSubmitted()) {
      return false;
    }

    const puzzles = this.currentPuzzles();
    if (puzzles.length === 0) {
      return false;
    }

    const answers = this.studentAnswers();
    return puzzles.every((puzzle) => String(answers[puzzle.puzzleId] ?? '').trim().length > 0);
  });

  readonly solvedCount = computed(
    () => Object.values(this.puzzleResults()).filter((result) => result.correct).length,
  );

  private readonly puzzleEngineService = inject(PuzzleEngineService);
  private readonly masteryEngine = inject(MasteryEngineService);

  ngOnInit(): void {
    this.difficulty.set(this.clampDifficulty(this.initialDifficulty()));
    this.refreshMasteryContext();
    this.loadPuzzles();
  }

  loadPuzzles(): void {
    this.loadingPuzzles.set(true);
    this.loadError.set('');
    this.hasSubmitted.set(false);
    this.score.set(0);
    this.total.set(0);
    this.puzzleResults.set({});
    this.studentAnswers.set({});

    this.puzzleEngineService
      .generatePuzzles(this.skillId(), this.difficulty())
      .pipe(finalize(() => this.loadingPuzzles.set(false)))
      .subscribe({
        next: (response) => {
          const puzzles = Array.isArray(response?.puzzles) ? response.puzzles : [];
          if (puzzles.length === 0) {
            this.currentPuzzles.set([]);
            this.loadError.set('Unable to load puzzles. Please try again.');
            return;
          }

          this.currentPuzzles.set(puzzles);
          this.puzzleSessionId.set(String(response.puzzleSessionId ?? '').trim());

          const initialAnswers: Record<string, string> = {};
          puzzles.forEach((puzzle) => {
            initialAnswers[puzzle.puzzleId] = '';
          });
          this.studentAnswers.set(initialAnswers);
        },
        error: () => {
          this.currentPuzzles.set([]);
          this.loadError.set('Unable to load puzzles. Please try again.');
        },
      });
  }

  handleSubmit(): void {
    if (!this.canSubmit()) {
      return;
    }

    const evaluation = this.evaluateAnswers();
    this.puzzleResults.set(evaluation.results);
    this.score.set(evaluation.score);
    this.total.set(evaluation.total);
    this.hasSubmitted.set(true);

    if (evaluation.total > 0 && evaluation.score === evaluation.total) {
      this.streak.update((value) => value + 1);
    } else {
      this.streak.set(0);
    }

    this.applyAdaptiveDifficulty(evaluation.score, evaluation.total);

    this.submittingAnswers.set(true);
    this.loadError.set('');

    this.puzzleEngineService
      .submitPuzzleAnswers({
        studentId: this.studentId(),
        mode: 'ai-puzzle',
        score: evaluation.accuracy,
        accuracy: evaluation.accuracy,
        streak: this.streak(),
      })
      .pipe(finalize(() => this.submittingAnswers.set(false)))
      .subscribe({
        next: (response) => {
          if (response?.mastery) {
            this.applyMasteryState(response.mastery);
            return;
          }

          this.syncMastery(evaluation.results).subscribe({
            error: () => {
              this.refreshMasteryContext();
            },
          });
        },
        error: () => {
          this.loadError.set('Unable to load puzzles. Please try again.');
          this.syncMastery(evaluation.results).subscribe({
            error: () => {
              this.refreshMasteryContext();
            },
          });
        },
      });
  }

  handleRetry(): void {
    this.loadPuzzles();
  }

  // Keep aliases for existing callers/tests in nearby modules.
  generatePuzzles(): void {
    this.loadPuzzles();
  }

  submitAnswers(): void {
    this.handleSubmit();
  }

  tryNewPuzzleSet(): void {
    this.handleRetry();
  }

  updateTextAnswer(puzzleId: string, value: string): void {
    this.studentAnswers.update((answers) => ({
      ...answers,
      [puzzleId]: value,
    }));
  }

  selectOption(puzzleId: string, option: string): void {
    this.updateTextAnswer(puzzleId, option);
  }

  answerValue(puzzleId: string): string {
    return this.studentAnswers()[puzzleId] ?? '';
  }

  inputType(puzzle: DynamicPuzzle): PuzzleInputType {
    if (puzzle.metadata?.inputType) {
      return puzzle.metadata.inputType;
    }
    if ((puzzle.metadata?.options ?? []).length > 0 || puzzle.type === 'mcq') {
      return 'mcq';
    }
    if (puzzle.type === 'arithmetic' || puzzle.type === 'missing-number' || puzzle.type === 'sequence') {
      return 'numeric';
    }
    return 'text';
  }

  optionsFor(puzzle: DynamicPuzzle): string[] {
    return puzzle.metadata?.options ?? [];
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

  masteryLabel(level: MasteryLevel): string {
    if (level === 'mastered') return 'Mastered';
    if (level === 'proficient') return 'Proficient';
    if (level === 'developing') return 'Developing';
    return 'Not started';
  }

  private evaluateAnswers(): {
    results: Record<string, PuzzleSubmitResult>;
    score: number;
    total: number;
    accuracy: number;
  } {
    const answers = this.studentAnswers();
    const map: Record<string, PuzzleSubmitResult> = {};

    this.currentPuzzles().forEach((puzzle) => {
      const studentAnswer = String(answers[puzzle.puzzleId] ?? '').trim();
      const correctAnswer = String(puzzle.metadata?.correctAnswer ?? '').trim();
      const correct = this.isAnswerCorrect(studentAnswer, correctAnswer, this.inputType(puzzle));

      map[puzzle.puzzleId] = {
        puzzleId: puzzle.puzzleId,
        correct,
        studentAnswer,
        correctAnswer,
      };
    });

    const total = this.currentPuzzles().length;
    const score = Object.values(map).filter((result) => result.correct).length;
    const accuracy = total > 0 ? Math.round((score / total) * 100) : 0;

    return { results: map, score, total, accuracy };
  }

  private isAnswerCorrect(studentAnswer: string, correctAnswer: string, inputType: PuzzleInputType): boolean {
    if (!correctAnswer) {
      return false;
    }

    if (inputType === 'numeric') {
      const studentNumber = Number(studentAnswer);
      const correctNumber = Number(correctAnswer);
      return Number.isFinite(studentNumber) && Number.isFinite(correctNumber)
        ? Math.abs(studentNumber - correctNumber) < 1e-9
        : false;
    }

    return studentAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
  }

  private syncMastery(results: Record<string, PuzzleSubmitResult>): Observable<void> {
    const updates = this.currentPuzzles()
      .map((puzzle) => {
        const result = results[puzzle.puzzleId];
        if (!result) {
          return null;
        }

        const skillId = puzzle.metadata?.skillId ?? this.skillId();
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
      return of(undefined);
    }

    return forkJoin(updates).pipe(
      map((states) => {
        const latest = states[states.length - 1];
        if (latest) {
          this.applyMasteryState(latest);
          return;
        }
        this.refreshMasteryContext();
      }),
    );
  }

  private applyMasteryState(state: MasteryState): void {
    this.masteryWeakSkills.set(state.weakSkills ?? []);
    this.masteryRecommendedSkill.set(state.recommendedNextSkill ?? null);

    const skills = state.skills ?? [];
    const mastered = skills.filter((skill) => skill.level === 'mastered').length;
    const proficient = skills.filter((skill) => skill.level === 'proficient').length;
    const developing = skills.filter((skill) => skill.level === 'developing').length;

    this.masteryBadges.set([
      `🏅 Mastered: ${mastered}`,
      `✅ Proficient: ${proficient}`,
      `📈 Developing: ${developing}`,
    ]);

    this.masterySynced.emit();
  }

  private refreshMasteryContext(): void {
    this.masteryEngine.fetchMasteryState(this.studentId()).subscribe({
      next: (state) => {
        this.applyMasteryState(state);
      },
      error: () => {
        this.masteryWeakSkills.set([]);
        this.masteryRecommendedSkill.set(null);
        this.masteryBadges.set([]);
      },
    });
  }

  private applyAdaptiveDifficulty(score: number, total: number): void {
    if (total <= 0) {
      return;
    }

    const accuracy = score / total;
    if (accuracy >= 0.8) {
      this.difficulty.set(this.clampDifficulty(this.difficulty() + 5));
      return;
    }

    if (accuracy < 0.5) {
      this.difficulty.set(this.clampDifficulty(this.difficulty() - 5));
    }
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
