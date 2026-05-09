import { describe, expect, it } from 'vitest';
import {
  createDiagnosticTest,
  mapScoreToLevel,
  scoreDiagnosticSubmission,
} from './diagnostic.service';

describe('diagnostic.service', () => {
  it('creates a 20-question mixed-operation diagnostic test', () => {
    const test = createDiagnosticTest();

    expect(test.questions).toHaveLength(20);

    const operationCounts = test.questions.reduce<Record<string, number>>((counts, question) => {
      counts[question.operation] = (counts[question.operation] ?? 0) + 1;
      return counts;
    }, {});

    expect(operationCounts.addition).toBe(5);
    expect(operationCounts.subtraction).toBe(5);
    expect(operationCounts.multiplication).toBe(5);
    expect(operationCounts.division).toBe(5);
  });

  it('scores unanswered submissions and maps level from accuracy', () => {
    const test = createDiagnosticTest();
    const now = new Date().toISOString();

    const result = scoreDiagnosticSubmission({
      testId: test.testId,
      startedAt: now,
      completedAt: now,
      responses: [],
    });

    expect(result.score.totalQuestions).toBe(20);
    expect(result.score.attempted).toBe(0);
    expect(result.score.correct).toBe(0);
    expect(result.score.accuracyScore).toBe(0);
    expect(result.score.speedScore).toBe(100);
    expect(result.score.finalScore).toBe(20);
    expect(result.level).toBe('Beginner');
    expect(result.weakAreas).toEqual(['addition', 'subtraction', 'multiplication', 'division']);
    expect(result.strongAreas).toEqual([]);
  });

  it('maps accuracy to expected levels', () => {
    expect(mapScoreToLevel(0)).toBe('Beginner');
    expect(mapScoreToLevel(59)).toBe('Beginner');
    expect(mapScoreToLevel(60)).toBe('Intermediate');
    expect(mapScoreToLevel(85)).toBe('Intermediate');
    expect(mapScoreToLevel(86)).toBe('Advanced');
    expect(mapScoreToLevel(100)).toBe('Advanced');
  });
});
