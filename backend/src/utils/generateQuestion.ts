import syllabus from './syllabus.json';
import { randomInt } from './random';
import { type LearningLevel, type MathOperation, type WorksheetQuestion } from '../models/types';

type Rule = { operation: MathOperation; min: number; max: number };

/**
 * Generates a single math question for the given operation type and difficulty level.
 * Operand ranges are sourced from the practice syllabus configuration.
 */
export const generateQuestion = (type: MathOperation, difficulty: LearningLevel): WorksheetQuestion => {
  const levelConfig = syllabus.practice.levels[difficulty];

  if (!levelConfig) {
    throw new Error(`Unsupported difficulty: ${difficulty}`);
  }

  const rule = (levelConfig.rules as Rule[]).find((r) => r.operation === type);

  if (!rule) {
    throw new Error(`Operation '${type}' is not available for difficulty '${difficulty}'.`);
  }

  const id = `${difficulty.toLowerCase()}-${type}-${Date.now()}-${randomInt(0, 9999)}`;
  let a = randomInt(rule.min, rule.max);
  let b = randomInt(rule.min, rule.max);

  if (type === 'subtraction' && b > a) {
    [a, b] = [b, a];
  }

  if (type === 'division') {
    b = Math.max(1, b);
    const quotient = randomInt(rule.min, rule.max);
    return { id, operation: type, prompt: `${b * quotient} ÷ ${b} = ?` };
  }

  const operator =
    type === 'addition'
      ? '+'
      : type === 'subtraction'
        ? '-'
        : '×';

  return { id, operation: type, prompt: `${a} ${operator} ${b} = ?` };
};
