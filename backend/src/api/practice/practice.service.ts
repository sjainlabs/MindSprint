import syllabus from '../../utils/syllabus.json';
import templates from '../../utils/templates.json';
import { randomInt } from '../../utils/random';
import { type LearningLevel, type MathOperation, type Worksheet, type WorksheetQuestion } from '../../models/types';

type Rule = { operation: MathOperation; min: number; max: number };

const createWorksheetQuestion = (rule: Rule, id: string): WorksheetQuestion => {
  let a = randomInt(rule.min, rule.max);
  let b = randomInt(rule.min, rule.max);

  if (rule.operation === 'subtraction' && b > a) {
    [a, b] = [b, a];
  }

  if (rule.operation === 'division') {
    b = Math.max(1, b);
    const quotient = randomInt(rule.min, rule.max);
    return {
      id,
      operation: rule.operation,
      prompt: `${b * quotient} ÷ ${b} = ?`,
    };
  }

  const operator =
    rule.operation === 'addition'
      ? '+'
      : rule.operation === 'subtraction'
        ? '-'
        : rule.operation === 'multiplication'
          ? '×'
          : '÷';

  return {
    id,
    operation: rule.operation,
    prompt: `${a} ${operator} ${b} = ?`,
  };
};

export const createWorksheet = (level: LearningLevel): Worksheet => {
  const levelConfig = syllabus.practice.levels[level];

  if (!levelConfig) {
    throw new Error(`Unsupported level: ${level}`);
  }

  const rules = levelConfig.rules as Rule[];
  const questions = Array.from({ length: syllabus.practice.questionCount }, (_, index) => {
    const rule = rules[index % rules.length];
    return createWorksheetQuestion(rule, `${level.toLowerCase()}-${index + 1}`);
  });

  return {
    worksheetId: `ws-${Date.now()}-${Math.floor(Math.random() * 10_000)}`,
    level,
    title: templates.worksheetTitle,
    instructions: templates.instructions[level],
    generatedAt: new Date().toISOString(),
    questions,
  };
};
