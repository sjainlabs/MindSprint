import { describe, expect, it } from 'vitest';
import { buildWorksheetRecommendation, scoreDifficulty } from './adaptive.service';
import { createDefaultStudentProfile } from '../students/student-profile.service';
import { type AdaptiveState } from '../../models/types';

const buildState = (overrides: Partial<AdaptiveState> = {}): AdaptiveState => ({
  studentId: 'student-demo',
  currentLevel: 'Intermediate',
  recentAccuracy: 88,
  operationAccuracy: {
    addition: 92,
    subtraction: 84,
    multiplication: 79,
    division: 45,
  },
  weakOperations: ['division'],
  profile: {
    ...createDefaultStudentProfile('student-demo'),
    masteryLevels: {
      addition: 80,
      subtraction: 72,
      multiplication: 68,
      division: 40,
    },
  },
  ...overrides,
});

describe('adaptive.service', () => {
  it('increases the recommended level when recent accuracy is above 85%', () => {
    const difficulty = scoreDifficulty(buildState());
    expect(difficulty.recommendedLevel).toBe('Advanced');
    expect(difficulty.overallScore).toBeGreaterThan(60);
  });

  it('decreases the recommended level when recent accuracy is below 50%', () => {
    const difficulty = scoreDifficulty(
      buildState({ currentLevel: 'Intermediate', recentAccuracy: 42, weakOperations: ['division', 'multiplication'] }),
    );
    expect(difficulty.recommendedLevel).toBe('Beginner');
  });

  it('prioritizes weak operations in the worksheet recommendation focus list', () => {
    const recommendation = buildWorksheetRecommendation(buildState());
    expect(recommendation.focusOperations[0]).toBe('division');
    expect(recommendation.rationale[1]).toContain('Weak operations');
  });
});
