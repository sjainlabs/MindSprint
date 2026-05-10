import syllabus from '../../utils/syllabus.json';
import { randomInt, shuffle } from '../../utils/random';
import { getDatabase } from '../../db/database';
import {
  type DiagnosticGradeEligibility,
  type DiagnosticProgress,
  type DiagnosticQuestion,
  type DiagnosticQuestionView,
  type DiagnosticResult,
  type DiagnosticSubmission,
  type DiagnosticTest,
  type GradeLevel,
  type LearningLevel,
  type MathOperation,
  type ScoreBreakdown,
} from '../../models/types';

// Phase 1 MVP target: a child should ideally complete discovery in ~10 minutes.
const TEST_DURATION_TARGET_SECONDS = 600;
// Scoring intentionally prioritizes correctness while still rewarding steady pace.
const ACCURACY_WEIGHT = 0.8;
const SPEED_WEIGHT = 0.2;
// Accuracy thresholds for level determination and weak/strong area classification.
const ADVANCED_ACCURACY_THRESHOLD = 85;
const BEGINNER_ACCURACY_THRESHOLD = 60;
const MIN_GRADE_LEVEL = 1;
const MAX_GRADE_LEVEL = 8;
const GRADE_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8] as const satisfies ReadonlyArray<GradeLevel>;
const DEFAULT_STUDENT_ID = 'student-demo';

// Phase 1 stores generated tests in memory for simplicity.
const inMemoryTests = new Map<string, DiagnosticQuestion[]>();

type OperationConfig = { min: number; max: number };

const generateQuestion = (operation: MathOperation, index: number, min: number, max: number): DiagnosticQuestion => {
  let operandA = randomInt(min, max);
  let operandB = randomInt(min, max);

  switch (operation) {
    case 'addition': {
      return {
        id: `${operation}-${index}`,
        operation,
        prompt: `${operandA} + ${operandB} = ?`,
        operandA,
        operandB,
        answer: operandA + operandB,
      };
    }
    case 'subtraction': {
      if (operandB > operandA) {
        [operandA, operandB] = [operandB, operandA];
      }
      return {
        id: `${operation}-${index}`,
        operation,
        prompt: `${operandA} - ${operandB} = ?`,
        operandA,
        operandB,
        answer: operandA - operandB,
      };
    }
    case 'multiplication': {
      return {
        id: `${operation}-${index}`,
        operation,
        prompt: `${operandA} × ${operandB} = ?`,
        operandA,
        operandB,
        answer: operandA * operandB,
      };
    }
    case 'division': {
      operandB = Math.max(1, operandB);
      const answer = randomInt(min, max);
      const dividend = operandB * answer;
      return {
        id: `${operation}-${index}`,
        operation,
        prompt: `${dividend} ÷ ${operandB} = ?`,
        operandA: dividend,
        operandB,
        answer,
      };
    }
    default:
      throw new Error(`Unsupported operation: ${operation}`);
  }
};

const toQuestionView = (questions: DiagnosticQuestion[]): DiagnosticQuestionView[] =>
  questions.map(({ id, operation, prompt }) => ({ id, operation, prompt }));

export const createDiagnosticTest = (): DiagnosticTest => {
  const testId = `diag-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
  const allQuestions: DiagnosticQuestion[] = [];

  const operations = Object.entries(syllabus.diagnostic.operations) as Array<[MathOperation, OperationConfig]>;

  operations.forEach(([operation, config]) => {
    for (let index = 0; index < syllabus.diagnostic.perOperation; index += 1) {
      allQuestions.push(generateQuestion(operation, index + 1, config.min, config.max));
    }
  });

  const selected = shuffle(allQuestions).slice(0, syllabus.diagnostic.questionCount);
  inMemoryTests.set(testId, selected);

  return {
    testId,
    createdAt: new Date().toISOString(),
    questions: toQuestionView(selected),
  };
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
const clampGrade = (grade: number): GradeLevel =>
  clamp(Math.round(grade), MIN_GRADE_LEVEL, MAX_GRADE_LEVEL) as GradeLevel;

const isWholeNumber = (value: number): boolean => Number.isFinite(value) && Number.isInteger(value);

const getDefaultUnlockedGrade = (enrolledGrade: GradeLevel): GradeLevel =>
  clampGrade(Math.max(MIN_GRADE_LEVEL, enrolledGrade));

const buildEligibilityReason = (isAgeEligible: boolean, isUnlocked: boolean, grade: GradeLevel): string => {
  if (!isAgeEligible) {
    return `Age and grade combination is outside the allowed range for Grade ${grade}.`;
  }

  if (!isUnlocked) {
    return `Score 100% on Grade ${Math.max(MIN_GRADE_LEVEL, grade - 1)} to unlock Grade ${grade}.`;
  }

  return `Grade ${grade} diagnostic is unlocked.`;
};

export const canAttemptDiagnostic = (age: number, grade: number): boolean => {
  if (!isWholeNumber(age) || !isWholeNumber(grade)) {
    return false;
  }

  if (grade < MIN_GRADE_LEVEL || grade > MAX_GRADE_LEVEL) {
    return false;
  }

  // Grade eligibility follows a broad school-age band:
  // Grade N is available for ages [N + 4, N + 8].
  const minAge = grade + 4;
  const maxAge = grade + 8;
  return age >= minAge && age <= maxAge;
};

const getUnlockedThroughGrade = async (studentId: string, enrolledGrade: GradeLevel): Promise<GradeLevel> => {
  const db = await getDatabase();
  const row = await db.get<{ unlocked_grade: number }>(
    'SELECT unlocked_grade FROM diagnostic_unlocks WHERE student_id = ?',
    [studentId],
  );

  if (!row) {
    const unlockedThroughGrade = getDefaultUnlockedGrade(enrolledGrade);
    await db.run(
      `INSERT INTO diagnostic_unlocks (student_id, unlocked_grade, updated_at) VALUES (?, ?, ?)`,
      [studentId, unlockedThroughGrade, new Date().toISOString()],
    );
    return unlockedThroughGrade;
  }

  return clampGrade(Math.max(row.unlocked_grade, getDefaultUnlockedGrade(enrolledGrade)));
};

const saveUnlockedThroughGrade = async (studentId: string, unlockedThroughGrade: GradeLevel): Promise<void> => {
  const db = await getDatabase();
  await db.run(
    `INSERT INTO diagnostic_unlocks (student_id, unlocked_grade, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(student_id) DO UPDATE SET
       unlocked_grade = excluded.unlocked_grade,
       updated_at = excluded.updated_at`,
    [studentId, unlockedThroughGrade, new Date().toISOString()],
  );
};

export const getDiagnosticEligibility = async (input: {
  studentId?: string;
  age: number;
  grade: number;
}): Promise<DiagnosticProgress> => {
  const studentId = input.studentId?.trim() || DEFAULT_STUDENT_ID;
  const normalizedGrade = clampGrade(input.grade);
  const unlockedThroughGrade = await getUnlockedThroughGrade(studentId, normalizedGrade);
  const grades: DiagnosticGradeEligibility[] = GRADE_LEVELS.map((grade) => {
    const isAgeEligible = canAttemptDiagnostic(input.age, grade);
    const isUnlocked = grade <= unlockedThroughGrade;
    return {
      grade,
      isAgeEligible,
      isUnlocked,
      reason: buildEligibilityReason(isAgeEligible, isUnlocked, grade),
    };
  });

  return {
    studentId,
    age: input.age,
    enrolledGrade: normalizedGrade,
    canAttemptCurrentGrade: canAttemptDiagnostic(input.age, normalizedGrade) && normalizedGrade <= unlockedThroughGrade,
    unlockedThroughGrade,
    unlockedNextGrade: false,
    grades,
  };
};

export const mapScoreToLevel = (accuracy: number): LearningLevel => {
  if (accuracy < BEGINNER_ACCURACY_THRESHOLD) {
    return 'Beginner';
  }

  if (accuracy <= ADVANCED_ACCURACY_THRESHOLD) {
    return 'Intermediate';
  }

  return 'Advanced';
};

export const scoreDiagnosticSubmission = (submission: DiagnosticSubmission): DiagnosticResult => {
  const questions = inMemoryTests.get(submission.testId);

  if (!questions) {
    throw new Error('Diagnostic test session not found. Please restart the test.');
  }

  const responseByQuestionId = new Map(
    submission.responses.map((response) => [response.questionId, response]),
  );

  const questionResults = questions.map((question) => {
    const response = responseByQuestionId.get(question.id);
    const submittedAnswer = response ? response.answer : null;
    const isCorrect = submittedAnswer === question.answer;

    return {
      questionId: question.id,
      isCorrect,
      expectedAnswer: question.answer,
      submittedAnswer,
      secondsSpent: response?.secondsSpent ?? 0,
    };
  });

  const correct = questionResults.filter((result) => result.isCorrect).length;
  const attempted = questionResults.filter((result) => result.submittedAnswer !== null).length;
  const incorrect = attempted - correct;
  const unanswered = questions.length - attempted;

  const startedAt = new Date(submission.startedAt).getTime();
  const completedAt = new Date(submission.completedAt).getTime();
  if (Number.isNaN(startedAt) || Number.isNaN(completedAt)) {
    throw new Error('Invalid submission timestamps.');
  }
  const rawDuration = Math.max(0, completedAt - startedAt);
  const totalDurationSeconds = Math.round(rawDuration / 1000);

  const accuracyScore = Math.round((correct / questions.length) * 100);
  const speedScore = Math.round(
    clamp(
      ((TEST_DURATION_TARGET_SECONDS - totalDurationSeconds) / TEST_DURATION_TARGET_SECONDS) * 100,
      0,
      100,
    ),
  );

  const finalScore = Math.round(accuracyScore * ACCURACY_WEIGHT + speedScore * SPEED_WEIGHT);
  const level = mapScoreToLevel(accuracyScore);

  const operations: MathOperation[] = ['addition', 'subtraction', 'multiplication', 'division'];
  const weakAreas: MathOperation[] = [];
  const strongAreas: MathOperation[] = [];

  for (const operation of operations) {
    const operationResults = questionResults.filter((r) => {
      const question = questions.find((q) => q.id === r.questionId);
      return question?.operation === operation;
    });
    if (operationResults.length === 0) {
      continue;
    }
    const operationCorrect = operationResults.filter((r) => r.isCorrect).length;
    const operationAccuracy = (operationCorrect / operationResults.length) * 100;
    if (operationAccuracy < BEGINNER_ACCURACY_THRESHOLD) {
      weakAreas.push(operation);
    } else {
      strongAreas.push(operation);
    }
  }

  const score: ScoreBreakdown = {
    totalQuestions: questions.length,
    attempted,
    correct,
    incorrect,
    unanswered,
    totalDurationSeconds,
    averageSecondsPerQuestion: Math.round((totalDurationSeconds / questions.length) * 100) / 100,
    accuracyScore,
    speedScore,
    finalScore,
  };

  return {
    level,
    score,
    questionResults,
    weakAreas,
    strongAreas,
  };
};

export const scoreAndPersistDiagnosticSubmission = async (
  submission: DiagnosticSubmission,
  context?: {
    studentId?: string;
    age?: number;
    grade?: number;
  },
): Promise<DiagnosticResult> => {
  const result = scoreDiagnosticSubmission(submission);
  const studentId = context?.studentId?.trim() || DEFAULT_STUDENT_ID;
  const age = context?.age;
  const grade = context?.grade;

  if (age === undefined || grade === undefined || !isWholeNumber(age) || !isWholeNumber(grade)) {
    return result;
  }

  const progress = await getDiagnosticEligibility({
    studentId,
    age,
    grade,
  });

  if (!progress.canAttemptCurrentGrade) {
    throw new Error('Diagnostic is locked for this age/grade profile.');
  }

  const nextGrade = clampGrade(progress.enrolledGrade + 1);
  // Unlock progression only advances when a learner achieves a perfect score
  // at their current highest unlocked grade boundary.
  const shouldUnlockNextGrade =
    result.score.accuracyScore === 100 &&
    progress.enrolledGrade < MAX_GRADE_LEVEL &&
    progress.enrolledGrade === progress.unlockedThroughGrade;
  const unlockedThroughGrade = shouldUnlockNextGrade
    ? clampGrade(Math.max(progress.unlockedThroughGrade, nextGrade))
    : progress.unlockedThroughGrade;

  if (shouldUnlockNextGrade) {
    await saveUnlockedThroughGrade(studentId, unlockedThroughGrade);
  }

  const updatedProgress = await getDiagnosticEligibility({
    studentId,
    age,
    grade,
  });

  return {
    ...result,
    diagnosticProgress: {
      ...updatedProgress,
      unlockedNextGrade: shouldUnlockNextGrade,
    },
  };
};
