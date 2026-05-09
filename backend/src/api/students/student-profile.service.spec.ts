import { describe, expect, it } from 'vitest';
import {
  createDefaultStudentProfile,
  updateStudentProfileFromWorksheet,
} from './student-profile.service';
import { type WorksheetResult } from '../../models/types';

const worksheetResult: WorksheetResult = {
  worksheetId: 'ws-42',
  studentId: 'student-demo',
  level: 'Intermediate',
  totalQuestions: 4,
  attempted: 4,
  correct: 4,
  incorrect: 0,
  accuracy: 100,
  totalDurationSeconds: 120,
  questionResults: [
    { questionId: 'q-1', operation: 'addition', expectedAnswer: 4, submittedAnswer: 4, isCorrect: true },
    { questionId: 'q-2', operation: 'addition', expectedAnswer: 8, submittedAnswer: 8, isCorrect: true },
    { questionId: 'q-3', operation: 'subtraction', expectedAnswer: 2, submittedAnswer: 2, isCorrect: true },
    { questionId: 'q-4', operation: 'division', expectedAnswer: 3, submittedAnswer: 3, isCorrect: true },
  ],
};

describe('student-profile.service', () => {
  it('creates a default student profile', () => {
    const profile = createDefaultStudentProfile('student-demo');
    expect(profile.level).toBe(1);
    expect(profile.masteryLevels.addition).toBe(50);
    expect(profile.badges).toEqual([]);
  });

  it('updates mastery, xp, level, and badges after a worksheet submission', () => {
    const profile = createDefaultStudentProfile('student-demo');
    const updatedProfile = updateStudentProfileFromWorksheet(
      profile,
      worksheetResult,
      '2026-05-09T12:00:00.000Z',
    );

    expect(updatedProfile.xp).toBeGreaterThan(profile.xp);
    expect(updatedProfile.level).toBeGreaterThanOrEqual(1);
    expect(updatedProfile.masteryLevels.addition).toBeGreaterThan(profile.masteryLevels.addition);
    expect(updatedProfile.badges).toContain('Accuracy 90%+');
    expect(updatedProfile.updatedAt).toBe('2026-05-09T12:00:00.000Z');
  });
});
