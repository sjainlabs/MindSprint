import { describe, expect, it } from 'vitest';
import { createWorksheet } from './practice.service';

const extractNumbers = (prompt: string): number[] => (prompt.match(/\d+/g) ?? []).map(Number);

describe('practice.service', () => {
  it('generates 10 beginner questions with 1-digit operands', () => {
    const worksheet = createWorksheet('Beginner');

    expect(worksheet.questions).toHaveLength(10);
    worksheet.questions.forEach((question) => {
      const numbers = extractNumbers(question.prompt);
      numbers.forEach((value) => {
        expect(value).toBeLessThan(100);
      });
    });
  });

  it('generates advanced worksheet with multiplication and 3-digit add/sub support', () => {
    const worksheet = createWorksheet('Advanced');

    expect(worksheet.questions).toHaveLength(10);
    expect(worksheet.level).toBe('Advanced');
    expect(worksheet.questions.some((question) => question.prompt.includes('×'))).toBe(true);
    expect(
      worksheet.questions.some((question) => {
        if (question.operation !== 'addition' && question.operation !== 'subtraction') {
          return false;
        }

        const numbers = extractNumbers(question.prompt);
        return numbers.some((value) => value >= 100 && value <= 999);
      }),
    ).toBe(true);
  });
});
