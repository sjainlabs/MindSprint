import syllabus from './syllabus.json';
import templates from './templates.json';
import { randomInt as baseRandomInt, shuffle } from './random';
import {
  type DiagnosticQuestion,
  type DiagnosticTest,
  type LearningLevel,
  type MathOperation,
  type Worksheet,
  type WorksheetQuestion,
} from '../models/types';

type Rule = { operation: MathOperation; min: number; max: number };
type DiagnosticRule = { min: number; max: number };
const generateId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${baseRandomInt(0, 9999).toString().padStart(4, '0')}`;

const getPracticeRules = (level: LearningLevel): Rule[] => {
  const levelConfig = syllabus.practice.levels[level];

  if (!levelConfig) {
    throw new Error(`Unsupported level: ${level}`);
  }

  return levelConfig.rules as Rule[];
};

const getRuleForOperation = (level: LearningLevel, operation: MathOperation): Rule => {
  const rule = getPracticeRules(level).find((r) => r.operation === operation);

  if (!rule) {
    throw new Error(`Operation '${operation}' is not available for difficulty '${level}'.`);
  }

  return rule;
};

const buildQuestion = (operation: MathOperation, rule: Rule, level: LearningLevel): WorksheetQuestion => {
  const id = generateId(`${level.toLowerCase()}-${operation}`);
  let operandA = baseRandomInt(rule.min, rule.max);
  let operandB = baseRandomInt(rule.min, rule.max);

  if (operation === 'subtraction' && operandB > operandA) {
    [operandA, operandB] = [operandB, operandA];
  }

  if (operation === 'division') {
    const divisor = Math.max(1, operandB);
    const answer = baseRandomInt(rule.min, rule.max);
    return { id, operation, prompt: `${divisor * answer} ÷ ${divisor} = ?` };
  }

  const operator =
    operation === 'addition'
      ? '+'
      : operation === 'subtraction'
        ? '-'
        : '×';

  return { id, operation, prompt: `${operandA} ${operator} ${operandB} = ?` };
};

/**
 * Generates a single math question for the given operation type and difficulty level.
 * Operand ranges are sourced from the practice syllabus configuration.
 */
export const generateQuestion = (type: MathOperation, difficulty: LearningLevel): WorksheetQuestion => {
  return buildQuestion(type, getRuleForOperation(difficulty, type), difficulty);
};

export const randomInt = (min: number, max: number): number => baseRandomInt(min, max);

export const generateAddition = (level: LearningLevel): WorksheetQuestion =>
  buildQuestion('addition', getRuleForOperation(level, 'addition'), level);

export const generateSubtraction = (level: LearningLevel): WorksheetQuestion =>
  buildQuestion('subtraction', getRuleForOperation(level, 'subtraction'), level);

export const generateMultiplication = (level: LearningLevel): WorksheetQuestion =>
  buildQuestion('multiplication', getRuleForOperation(level, 'multiplication'), level);

export const generateDivision = (level: LearningLevel): WorksheetQuestion =>
  buildQuestion('division', getRuleForOperation(level, 'division'), level);

export const generateMixed = (level: LearningLevel): WorksheetQuestion => {
  const rules = getPracticeRules(level);
  const selected = rules[baseRandomInt(0, rules.length - 1)];
  return buildQuestion(selected.operation, selected, level);
};

const generateDiagnosticQuestion = (
  operation: MathOperation,
  index: number,
  config: DiagnosticRule,
): DiagnosticQuestion => {
  let operandA = baseRandomInt(config.min, config.max);
  let operandB = baseRandomInt(config.min, config.max);

  switch (operation) {
    case 'addition':
      return {
        id: `${operation}-${index}`,
        operation,
        prompt: `${operandA} + ${operandB} = ?`,
        operandA,
        operandB,
        answer: operandA + operandB,
      };
    case 'subtraction':
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
    case 'multiplication':
      return {
        id: `${operation}-${index}`,
        operation,
        prompt: `${operandA} × ${operandB} = ?`,
        operandA,
        operandB,
        answer: operandA * operandB,
      };
    case 'division': {
      const divisor = Math.max(1, operandB);
      const answer = baseRandomInt(config.min, config.max);
      const dividend = divisor * answer;
      return {
        id: `${operation}-${index}`,
        operation,
        prompt: `${dividend} ÷ ${divisor} = ?`,
        operandA: dividend,
        operandB: divisor,
        answer,
      };
    }
    default:
      throw new Error(`Unsupported operation: ${operation}`);
  }
};

export const generateDiagnosticSet = (): DiagnosticTest => {
  const operations = Object.entries(syllabus.diagnostic.operations) as Array<[MathOperation, DiagnosticRule]>;
  const allQuestions: DiagnosticQuestion[] = [];

  operations.forEach(([operation, config]) => {
    for (let index = 0; index < syllabus.diagnostic.perOperation; index += 1) {
      allQuestions.push(generateDiagnosticQuestion(operation, index + 1, config));
    }
  });

  const selected = shuffle(allQuestions).slice(0, syllabus.diagnostic.questionCount);
  return {
    testId: generateId('diag'),
    createdAt: new Date().toISOString(),
    questions: selected.map(({ id, operation, prompt }) => ({ id, operation, prompt })),
  };
};

export const generateWorksheet = (level: LearningLevel): Worksheet => ({
  worksheetId: generateId('ws'),
  level,
  title: templates.worksheetTitle,
  instructions: templates.instructions[level],
  generatedAt: new Date().toISOString(),
  questions: Array.from({ length: syllabus.practice.questionCount }, () => generateMixed(level)),
});
