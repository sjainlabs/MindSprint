import syllabus from '../../utils/syllabus.json';
import { randomInt, shuffle } from '../../utils/random';
import {
  type DiagnosticQuestion,
  type DiagnosticQuestionView,
  type DiagnosticResult,
  type DiagnosticSubmission,
  type DiagnosticTest,
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
