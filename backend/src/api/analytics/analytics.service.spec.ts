import { describe, expect, it } from 'vitest';
import { buildAnalyticsEvents } from './analytics.service';
import { createDefaultStudentProfile } from '../students/student-profile.service';
import { type WorksheetResult } from '../../models/types';

const result: WorksheetResult = {
  worksheetId: 'ws-analytics',
  studentId: 'student-demo',
  level: 'Beginner',
  totalQuestions: 4,
  attempted: 4,
  correct: 3,
  incorrect: 1,
  accuracy: 75,
  totalDurationSeconds: 80,
  questionResults: [
    { questionId: 'q-1', operation: 'addition', expectedAnswer: 5, submittedAnswer: 5, isCorrect: true },
    { questionId: 'q-2', operation: 'addition', expectedAnswer: 9, submittedAnswer: 8, isCorrect: false },
    { questionId: 'q-3', operation: 'subtraction', expectedAnswer: 2, submittedAnswer: 2, isCorrect: true },
    { questionId: 'q-4', operation: 'multiplication', expectedAnswer: 6, submittedAnswer: 6, isCorrect: true },
  ],
};

describe('analytics.service', () => {
  it('builds overall and per-operation analytics events', () => {
    const profile = {
      ...createDefaultStudentProfile('student-demo'),
      masteryLevels: {
        addition: 55,
        subtraction: 65,
        multiplication: 70,
        division: 50,
      },
    };

    const events = buildAnalyticsEvents('student-demo', result, profile, '2026-05-09T12:00:00.000Z');

    expect(events.find((event) => event.operation === 'overall')?.accuracy).toBe(75);
    expect(events.find((event) => event.operation === 'addition')?.payload['attempted']).toBe(2);
    expect(events.find((event) => event.operation === 'subtraction')?.accuracy).toBe(100);
    expect(events.some((event) => event.operation === 'division')).toBe(false);
  });
});
