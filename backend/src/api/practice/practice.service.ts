import syllabus from '../../utils/syllabus.json';
import templates from '../../utils/templates.json';
import { generateQuestion } from '../../utils/generateQuestion';
import { type LearningLevel, type MathOperation, type Worksheet } from '../../models/types';

type Rule = { operation: MathOperation };

export const createWorksheet = (level: LearningLevel): Worksheet => {
  const levelConfig = syllabus.practice.levels[level];

  if (!levelConfig) {
    throw new Error(`Unsupported level: ${level}`);
  }

  const rules = levelConfig.rules as Rule[];
  const questions = Array.from({ length: syllabus.practice.questionCount }, (_, index) => {
    const rule = rules[index % rules.length];
    return generateQuestion(rule.operation, level);
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
