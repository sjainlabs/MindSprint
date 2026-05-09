import { describe, expect, it, vi } from 'vitest';
import syllabus from './syllabus.json';
import templates from './templates.json';
import {
  generateAddition,
  generateDiagnosticSet,
  generateDivision,
  generateMixed,
  generateSubtraction,
  generateWorksheet,
  randomInt,
} from './generateQuestion';

const extractNumbers = (prompt: string): number[] => (prompt.match(/\d+/g) ?? []).map(Number);
const OPERATION_TEST_ITERATIONS = 100;

describe('generateQuestion utils', () => {
  it('randomInt includes min and max bounds', () => {
    const randomSpy = vi.spyOn(Math, 'random');
    randomSpy.mockReturnValueOnce(0).mockReturnValueOnce(0.999999);

    expect(randomInt(2, 5)).toBe(2);
    expect(randomInt(2, 5)).toBe(5);

    randomSpy.mockRestore();
  });

  it('generateAddition uses syllabus range for level', () => {
    const question = generateAddition('Beginner');
    const [a, b] = extractNumbers(question.prompt);

    expect(question.operation).toBe('addition');
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThanOrEqual(9);
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThanOrEqual(9);
  });

  it('generateSubtraction avoids negative prompts', () => {
    const question = generateSubtraction('Intermediate');
    const [a, b] = extractNumbers(question.prompt);

    expect(question.operation).toBe('subtraction');
    expect(a).toBeGreaterThanOrEqual(b);
  });

  it('generateDivision creates whole-number prompts and non-zero divisor', () => {
    const question = generateDivision('Beginner');
    const [dividend, divisor] = extractNumbers(question.prompt);

    expect(question.operation).toBe('division');
    expect(divisor).toBeGreaterThan(0);
    expect(dividend % divisor).toBe(0);
  });

  it('generateMixed respects configured operations for level', () => {
    const allowed = new Set(
      syllabus.practice.levels.Advanced.rules.map((rule) => rule.operation),
    );
    const divisionAllowed = allowed.has('division');

    for (let index = 0; index < OPERATION_TEST_ITERATIONS; index += 1) {
      const question = generateMixed('Advanced');
      expect(allowed.has(question.operation)).toBe(true);
      if (!divisionAllowed) {
        expect(question.operation).not.toBe('division');
      }
    }
  });

  it('generateDiagnosticSet follows diagnostic syllabus counts', () => {
    const test = generateDiagnosticSet();
    const operationCounts = test.questions.reduce<Record<string, number>>((counts, question) => {
      counts[question.operation] = (counts[question.operation] ?? 0) + 1;
      return counts;
    }, {});
    const operationTotal = Object.keys(syllabus.diagnostic.operations).length;
    const generatedPoolSize = operationTotal * syllabus.diagnostic.perOperation;
    const expectsExactPerOperation = generatedPoolSize <= syllabus.diagnostic.questionCount;

    expect(test.questions).toHaveLength(syllabus.diagnostic.questionCount);
    (Object.keys(syllabus.diagnostic.operations) as Array<keyof typeof syllabus.diagnostic.operations>).forEach(
      (operation) => {
        expect(operationCounts[operation]).toBeGreaterThan(0);
        if (expectsExactPerOperation) {
          expect(operationCounts[operation]).toBe(syllabus.diagnostic.perOperation);
        } else {
          expect(operationCounts[operation]).toBeLessThanOrEqual(syllabus.diagnostic.perOperation);
        }
      },
    );
  });

  it('generateWorksheet returns expected worksheet payload', () => {
    const worksheet = generateWorksheet('Advanced');
    const allowedOperations = new Set(
      syllabus.practice.levels.Advanced.rules.map((rule) => rule.operation),
    );

    expect(worksheet.level).toBe('Advanced');
    expect(worksheet.title).toBe(templates.worksheetTitle);
    expect(worksheet.instructions).toBe(templates.instructions.Advanced);
    expect(worksheet.worksheetId.startsWith('ws-')).toBe(true);
    expect(worksheet.generatedAt).toBeTruthy();
    expect(worksheet.questions).toHaveLength(syllabus.practice.questionCount);
    expect(worksheet.questions.every((question) => allowedOperations.has(question.operation))).toBe(true);
  });
});
