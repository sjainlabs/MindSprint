/** Configuration for a reasoning puzzle challenge. */
export interface ReasoningPuzzleConfig {
  /** Stable backend identifier for the puzzle. */
  puzzleId: string;
  /** Puzzle statement shown to the player. */
  prompt: string;
  /** Optional answer choices; keep empty for free-form input puzzles. */
  options: string[];
  /** Backend-provided expected correct answer. */
  answer: string;
  /** Adaptive difficulty score on a 1-100 scale. */
  difficulty: number;
}
