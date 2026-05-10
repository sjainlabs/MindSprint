export type MathOperation = 'addition' | 'subtraction' | 'multiplication' | 'division';

export type LearningLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type GradeLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

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
  diagnosticProgress?: DiagnosticProgress;
}

export interface DiagnosticGradeEligibility {
  grade: GradeLevel;
  isAgeEligible: boolean;
  isUnlocked: boolean;
  reason: string;
}

export interface DiagnosticProgress {
  studentId: string;
  age: number;
  enrolledGrade: GradeLevel;
  canAttemptCurrentGrade: boolean;
  unlockedThroughGrade: GradeLevel;
  unlockedNextGrade: boolean;
  grades: DiagnosticGradeEligibility[];
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
  studentId?: string;
  level: LearningLevel;
  startedAt?: string;
  submittedAt: string;
  answers: WorksheetAnswerInput[];
}

export interface WorksheetQuestionResult {
  questionId: string;
  operation: MathOperation;
  expectedAnswer: number;
  submittedAnswer: number | null;
  isCorrect: boolean;
}

export interface WorksheetResult {
  worksheetId: string;
  studentId?: string;
  level: LearningLevel;
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  totalDurationSeconds: number;
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

export type OperationMasteryMap = Record<MathOperation, number>;

export interface StudentProfile {
  studentId: string;
  masteryLevels: OperationMasteryMap;
  xp: number;
  level: number;
  streak: number;
  badges: string[];
  learningPathLevel: number;
  updatedAt: string;
}

export interface AdaptiveState {
  studentId: string;
  currentLevel: LearningLevel;
  recentAccuracy: number;
  operationAccuracy: Partial<Record<MathOperation, number>>;
  weakOperations: MathOperation[];
  profile: StudentProfile;
}

export interface DifficultyScore {
  overallScore: number;
  operationScores: Record<MathOperation, number>;
  weakOperationWeight: number;
  recommendedLevel: LearningLevel;
}

export interface WorksheetRecommendation {
  studentId: string;
  targetDifficulty: number;
  recommendedLevel: LearningLevel;
  focusOperations: MathOperation[];
  rationale: string[];
  difficultyScore: DifficultyScore;
}

export interface AnalyticsEvent {
  eventId: string;
  studentId: string;
  worksheetId: string;
  eventType: 'worksheet_completed';
  operation: MathOperation | 'overall';
  accuracy: number;
  durationSeconds: number;
  masteryAfter: number;
  createdAt: string;
  payload: Record<string, unknown>;
}

export interface SkillBreakdown {
  operation: MathOperation;
  mastery: number;
  averageAccuracy: number;
  attempts: number;
  totalTimeSeconds: number;
}

export interface StudentAnalytics {
  studentId: string;
  accuracyOverTime: Array<{
    worksheetId: string;
    accuracy: number;
    createdAt: string;
  }>;
  operationMastery: SkillBreakdown[];
  averageTimePerWorksheet: number;
  totalWorksheets: number;
  recommendedNextSteps: string[];
}

export interface GameReward {
  xp: number;
  streakBonus: number;
  badge?: string;
}

export interface DailyQuest {
  id: string;
  description: string;
  target: number;
  progress: number;
  rewardXp: number;
  completed: boolean;
}

export interface BossBattle {
  id: string;
  title: string;
  hp: number;
  phase: number;
  unlocked: boolean;
}

export interface GameChallenge {
  challengeId: string;
  studentId: string;
  prompt: string;
  operation: MathOperation;
  options: number[];
  answer: number;
  timeLimitSeconds: number;
  difficulty: number;
  recommendedLevel: LearningLevel;
  rewards: GameReward;
  dailyQuest: DailyQuest;
  bossBattle: BossBattle;
  playerState: {
    xp: number;
    streak: number;
    badges: string[];
    level: number;
  };
}
