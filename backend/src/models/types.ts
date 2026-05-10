export type MathOperation = 'addition' | 'subtraction' | 'multiplication' | 'division';

export type LearningLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type GradeLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type TopicStage =
  | 'Foundation'
  | 'Elementary'
  | 'Middle School'
  | 'Pre-Algebra'
  | 'Algebra I'
  | 'Geometry'
  | 'Algebra II'
  | 'Trigonometry'
  | 'Pre-Calculus'
  | 'Calculus';

export type AdvancedQuestionType =
  | 'numeric'
  | 'symbolic'
  | 'multi-step'
  | 'graph-interpretation'
  | 'word-problem'
  | 'proof-style'
  | 'function-analysis'
  | 'trig-identity';

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

export interface DiagnosticRecord {
  id: number;
  studentId: string;
  testId: string;
  grade: GradeLevel;
  age: number;
  accuracyScore: number;
  finalScore: number;
  unlockedNextGrade: boolean;
  createdAt: string;
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
  topicScoring: Array<{
    topicId: string;
    accuracy: number;
    attempted: number;
  }>;
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
  ageSuggestedGrade: GradeLevel;
  ageSuggestedTrack: string;
  canAttemptCurrentGrade: boolean;
  unlockedThroughGrade: GradeLevel;
  unlockedNextGrade: boolean;
  grades: DiagnosticGradeEligibility[];
}

export interface DiagnosticNextGrade {
  studentId: string;
  enrolledGrade: GradeLevel;
  unlockedThroughGrade: GradeLevel;
  nextGrade: GradeLevel | null;
  nextGradeLabel: string | null;
  recommendation: string;
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

export interface Subtopic {
  id: string;
  name: string;
  difficulty: DifficultyRange;
  conceptualTags: string[];
  cognitiveComplexity: 'low' | 'medium' | 'high' | 'expert';
  integrationSkills: string[];
  realWorldCategories: string[];
  stemCategories: string[];
  aiDifficultyScore: number;
}

export interface Topic {
  id: string;
  name: string;
  stage: TopicStage;
  grades: GradeLevel[];
  supportsAiWorksheet: boolean;
  conceptualFocus: string[];
  masteryDecayRatePerWeek: number;
  subtopics: Subtopic[];
}

export interface TopicDifficultyMapping {
  topicId: string;
  subtopicId: string;
  minDifficulty: number;
  maxDifficulty: number;
}

export interface AIWorksheetRequest {
  topic: string;
  difficulty: number;
  questionTypes?: AdvancedQuestionType[];
  questionCount?: number;
  studentId?: string;
}

export interface AIWorksheetQuestion {
  id: string;
  type: AdvancedQuestionType;
  topic: string;
  subtopic: string;
  prompt: string;
  answer: string;
  difficulty: number;
  hints: string[];
}

export interface AIWorksheet {
  worksheetId: string;
  topic: string;
  difficulty: number;
  generatedAt: string;
  questionTypes: AdvancedQuestionType[];
  questions: AIWorksheetQuestion[];
  validation: {
    allQuestionsHaveAnswers: boolean;
    hasSupportedQuestionTypes: boolean;
    topicSupported: boolean;
  };
}

export type OperationMasteryMap = Record<MathOperation, number>;

export interface StudentProfile {
  studentId: string;
  age: number;
  grade: GradeLevel;
  masteryLevels: OperationMasteryMap;
  topicMastery: Record<string, number>;
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
  topicId?: string;
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
  topicAnalytics: Array<{
    topicId: string;
    averageAccuracy: number;
    attempts: number;
  }>;
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
