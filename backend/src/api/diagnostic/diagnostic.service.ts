import syllabus from '../../utils/syllabus.json';
import { randomInt, shuffle } from '../../utils/random';
import { getDatabase } from '../../db/database';
import {
  type DiagnosticGradeEligibility,
  type DiagnosticNextGrade,
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
import { unlockStudentNextGrade, updateStudentProfileGradeContext } from '../students/student-profile.service';

const TEST_DURATION_TARGET_SECONDS = 600;
const ACCURACY_WEIGHT = 0.8;
const SPEED_WEIGHT = 0.2;
const ADVANCED_ACCURACY_THRESHOLD = 85;
const BEGINNER_ACCURACY_THRESHOLD = 60;
const MIN_GRADE_LEVEL: GradeLevel = 0;
const MAX_GRADE_LEVEL: GradeLevel = 12;
const GRADE_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const satisfies ReadonlyArray<GradeLevel>;
const DEFAULT_STUDENT_ID = 'student-demo';

const inMemoryTests = new Map<string, DiagnosticQuestion[]>();

type OperationConfig = { min: number; max: number };

type AgeGradeRule = {
  minAge: number;
  maxAgeExclusive: number;
  grade: GradeLevel;
  label: string;
  track: string;
};

const AGE_GRADE_RULES: AgeGradeRule[] = [
  { minAge: 4, maxAgeExclusive: 5, grade: 0, label: 'Kindergarten', track: 'Foundation' },
  { minAge: 5, maxAgeExclusive: 6, grade: 1, label: 'Grade 1', track: 'Foundation' },
  { minAge: 6, maxAgeExclusive: 7, grade: 2, label: 'Grade 2', track: 'Elementary' },
  { minAge: 7, maxAgeExclusive: 8, grade: 3, label: 'Grade 3', track: 'Elementary' },
  { minAge: 8, maxAgeExclusive: 9, grade: 4, label: 'Grade 4', track: 'Elementary' },
  { minAge: 9, maxAgeExclusive: 10, grade: 5, label: 'Grade 5', track: 'Elementary' },
  { minAge: 10, maxAgeExclusive: 11, grade: 6, label: 'Grade 6', track: 'Middle School' },
  { minAge: 11, maxAgeExclusive: 12, grade: 7, label: 'Grade 7', track: 'Middle School' },
  { minAge: 12, maxAgeExclusive: 13, grade: 8, label: 'Grade 8', track: 'Middle School' },
  { minAge: 13, maxAgeExclusive: 14, grade: 9, label: 'Grade 9', track: 'Algebra I' },
  { minAge: 14, maxAgeExclusive: 15, grade: 10, label: 'Grade 10', track: 'Geometry' },
  { minAge: 15, maxAgeExclusive: 16, grade: 11, label: 'Grade 11', track: 'Algebra II' },
  { minAge: 16, maxAgeExclusive: 17, grade: 12, label: 'Grade 12', track: 'Trigonometry' },
  { minAge: 17, maxAgeExclusive: 19, grade: 12, label: 'Grade 12+', track: 'Pre-Calculus / Calculus' },
];

const OPERATION_TOPIC_MAP: Record<MathOperation, string[]> = {
  addition: ['foundation', 'elementary'],
  subtraction: ['foundation', 'elementary'],
  multiplication: ['elementary', 'middle-school'],
  division: ['elementary', 'pre-algebra'],
};

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

const gradeLabel = (grade: GradeLevel): string => (grade === 0 ? 'Kindergarten' : `Grade ${grade}`);

const getAgeRule = (age: number): AgeGradeRule | null =>
  AGE_GRADE_RULES.find((rule) => age >= rule.minAge && age < rule.maxAgeExclusive) ?? null;

const getDefaultUnlockedGrade = (enrolledGrade: GradeLevel): GradeLevel =>
  clampGrade(Math.max(MIN_GRADE_LEVEL, enrolledGrade));

const buildEligibilityReason = (isAgeEligible: boolean, isUnlocked: boolean, grade: GradeLevel, ageRule: AgeGradeRule | null): string => {
  if (!ageRule) {
    return 'Age must be between 4 and 18 for diagnostic eligibility.';
  }

  if (!isAgeEligible) {
    return `Your age maps to ${ageRule.label}; only that grade or lower is allowed.`;
  }

  if (!isUnlocked) {
    return `Score 100% on ${gradeLabel(clampGrade(Math.max(MIN_GRADE_LEVEL, grade - 1)))} to unlock ${gradeLabel(grade)}.`;
  }

  return `${gradeLabel(grade)} diagnostic is unlocked.`;
};

export const canAttemptDiagnostic = (age: number, grade: number): boolean => {
  if (!isWholeNumber(age) || !isWholeNumber(grade)) {
    return false;
  }

  if (grade < MIN_GRADE_LEVEL || grade > MAX_GRADE_LEVEL) {
    return false;
  }

  const rule = getAgeRule(age);
  if (!rule) {
    return false;
  }

  return grade <= rule.grade;
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
  const ageRule = getAgeRule(input.age);

  if (!ageRule) {
    throw new Error('Age must be between 4 and 18.');
  }

  await updateStudentProfileGradeContext(studentId, {
    age: input.age,
    grade: normalizedGrade,
  });

  const unlockedThroughGrade = await getUnlockedThroughGrade(studentId, normalizedGrade);
  const grades: DiagnosticGradeEligibility[] = GRADE_LEVELS.map((grade) => {
    const isAgeEligible = grade <= ageRule.grade;
    const isUnlocked = grade <= unlockedThroughGrade;
    return {
      grade,
      isAgeEligible,
      isUnlocked,
      reason: buildEligibilityReason(isAgeEligible, isUnlocked, grade, ageRule),
    };
  });

  return {
    studentId,
    age: input.age,
    enrolledGrade: normalizedGrade,
    ageSuggestedGrade: ageRule.grade,
    ageSuggestedTrack: ageRule.track,
    canAttemptCurrentGrade: normalizedGrade <= ageRule.grade && normalizedGrade <= unlockedThroughGrade,
    unlockedThroughGrade,
    unlockedNextGrade: false,
    grades,
  };
};

export const getDiagnosticNextGrade = async (input: {
  studentId?: string;
  grade: number;
  age: number;
}): Promise<DiagnosticNextGrade> => {
  const studentId = input.studentId?.trim() || DEFAULT_STUDENT_ID;
  const enrolledGrade = clampGrade(input.grade);
  const progress = await getDiagnosticEligibility({
    studentId,
    age: input.age,
    grade: enrolledGrade,
  });

  const nextGrade = progress.unlockedThroughGrade < MAX_GRADE_LEVEL
    ? clampGrade(progress.unlockedThroughGrade + 1)
    : null;

  return {
    studentId,
    enrolledGrade,
    unlockedThroughGrade: progress.unlockedThroughGrade,
    nextGrade,
    nextGradeLabel: nextGrade === null ? 'Pre-Calculus / Calculus track' : gradeLabel(nextGrade),
    recommendation:
      nextGrade === null
        ? 'Advanced track unlocked: continue with Pre-Calculus and Calculus diagnostics.'
        : `Next unlock target: earn 100% at ${gradeLabel(progress.unlockedThroughGrade)} to unlock ${gradeLabel(nextGrade)}.`,
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

  const topicScoring = [...new Set(operations.flatMap((operation) => OPERATION_TOPIC_MAP[operation]))].map((topicId) => {
    const topicOperations = operations.filter((operation) => OPERATION_TOPIC_MAP[operation].includes(topicId));
    const topicResults = questionResults.filter((result) => {
      const question = questions.find((q) => q.id === result.questionId);
      return question ? topicOperations.includes(question.operation) : false;
    });
    const topicAttempted = topicResults.filter((result) => result.submittedAnswer !== null).length;
    const topicCorrect = topicResults.filter((result) => result.isCorrect).length;
    return {
      topicId,
      attempted: topicAttempted,
      accuracy: topicAttempted > 0 ? Math.round((topicCorrect / topicAttempted) * 100) : 0,
    };
  });

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
    topicScoring,
  };
};

const persistDiagnosticHistory = async (input: {
  studentId: string;
  grade: GradeLevel;
  age: number;
  testId: string;
  result: DiagnosticResult;
  unlockedNextGrade: boolean;
}): Promise<void> => {
  const db = await getDatabase();
  await db.run(
    `INSERT INTO diagnostic_records (
      student_id, test_id, grade, age, accuracy_score, final_score, unlocked_next_grade, payload, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.studentId,
      input.testId,
      input.grade,
      input.age,
      input.result.score.accuracyScore,
      input.result.score.finalScore,
      input.unlockedNextGrade ? 1 : 0,
      JSON.stringify(input.result),
      new Date().toISOString(),
    ],
  );
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
  const shouldUnlockNextGrade =
    result.score.accuracyScore === 100 &&
    progress.enrolledGrade < MAX_GRADE_LEVEL &&
    progress.enrolledGrade === progress.unlockedThroughGrade;
  const unlockedThroughGrade = shouldUnlockNextGrade
    ? clampGrade(Math.max(progress.unlockedThroughGrade, nextGrade))
    : progress.unlockedThroughGrade;

  if (shouldUnlockNextGrade) {
    await saveUnlockedThroughGrade(studentId, unlockedThroughGrade);
    await unlockStudentNextGrade(studentId, unlockedThroughGrade);
  }

  await persistDiagnosticHistory({
    studentId,
    grade: progress.enrolledGrade,
    age,
    testId: submission.testId,
    result,
    unlockedNextGrade: shouldUnlockNextGrade,
  });

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
