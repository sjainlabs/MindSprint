export type MathOperation = 'addition' | 'subtraction' | 'multiplication' | 'division';

export type LearningLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export interface DifficultyRange {
  min: number;
  max: number;
}

export interface LevelModel {
  name: LearningLevel;
  difficultyRange: DifficultyRange;
  operationsAllowed: MathOperation[];
  templateIds: string[];
}

export interface DiagnosticQuestion {
  id: string;
  operation: MathOperation;
  prompt: string;
  operandA: number;
  operandB: number;
  answer: number;
}

export interface DiagnosticQuestionView {
  id: string;
  operation: MathOperation;
  prompt: string;
}

export interface DiagnosticTest {
  testId: string;
  questions: DiagnosticQuestionView[];
  createdAt: string;
}

export interface DiagnosticSubmissionResponse {
  questionId: string;
  answer: number;
  secondsSpent: number;
}

export interface DiagnosticSubmission {
  testId: string;
  startedAt: string;
  completedAt: string;
  responses: DiagnosticSubmissionResponse[];
}

export interface ScoreBreakdown {
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  totalDurationSeconds: number;
  averageSecondsPerQuestion: number;
  accuracyScore: number;
  speedScore: number;
  finalScore: number;
}

export interface DiagnosticResult {
  level: LearningLevel;
  score: ScoreBreakdown;
  questionResults: Array<{
    questionId: string;
    isCorrect: boolean;
    expectedAnswer: number;
    submittedAnswer: number | null;
    secondsSpent: number;
  }>;
  weakAreas: MathOperation[];
  strongAreas: MathOperation[];
}

export interface WorksheetQuestion {
  id: string;
  operation: MathOperation;
  prompt: string;
  answer: number;
}

export interface WorksheetAnswerInput {
  questionId: string;
  answer: number;
}

export interface WorksheetSubmission {
  worksheetId: string;
  level: LearningLevel;
  submittedAt: string;
  answers: WorksheetAnswerInput[];
}

export interface WorksheetQuestionResult {
  questionId: string;
  expectedAnswer: number;
  submittedAnswer: number | null;
  isCorrect: boolean;
}

export interface WorksheetResult {
  worksheetId: string;
  level: LearningLevel;
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  questionResults: WorksheetQuestionResult[];
}

export interface Worksheet {
  worksheetId: string;
  level: LearningLevel;
  title: string;
  instructions: string;
  generatedAt: string;
  questions: WorksheetQuestion[];
}
