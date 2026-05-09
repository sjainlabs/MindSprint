import {
  type AdaptiveState,
  type DifficultyScore,
  type LearningLevel,
  type MathOperation,
  type WorksheetRecommendation,
} from '../../models/types';
import { getStudentProfile } from '../students/student-profile.service';

const OPERATIONS: MathOperation[] = ['addition', 'subtraction', 'multiplication', 'division'];
const LEVEL_ORDER: LearningLevel[] = ['Beginner', 'Intermediate', 'Advanced'];
const LEVEL_BASE_DIFFICULTY: Record<LearningLevel, number> = {
  Beginner: 30,
  Intermediate: 60,
  Advanced: 85,
};
const WEAK_OPERATION_WEIGHT = 1.6;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export const createAdaptiveState = async (input: {
  studentId: string;
  currentLevel: LearningLevel;
  recentAccuracy: number;
  operationAccuracy?: Partial<Record<MathOperation, number>>;
}): Promise<AdaptiveState> => {
  const profile = await getStudentProfile(input.studentId);
  const weakOperations = OPERATIONS.filter((operation) => {
    const recentAccuracy = input.operationAccuracy?.[operation];
    return (recentAccuracy ?? profile.masteryLevels[operation]) < 60;
  });

  return {
    studentId: input.studentId,
    currentLevel: input.currentLevel,
    recentAccuracy: input.recentAccuracy,
    operationAccuracy: input.operationAccuracy ?? {},
    weakOperations,
    profile,
  };
};

export const scoreDifficulty = (state: AdaptiveState): DifficultyScore => {
  const operationScores = OPERATIONS.reduce<Record<MathOperation, number>>((accumulator, operation) => {
    const recentAccuracy = state.operationAccuracy[operation] ?? state.recentAccuracy;
    accumulator[operation] = Math.round(
      state.profile.masteryLevels[operation] * 0.6 + recentAccuracy * 0.4,
    );
    return accumulator;
  }, {
    addition: 0,
    subtraction: 0,
    multiplication: 0,
    division: 0,
  });

  const { weightedTotal, totalWeight } = OPERATIONS.reduce(
    (accumulator, operation) => {
      const weight = state.weakOperations.includes(operation) ? WEAK_OPERATION_WEIGHT : 1;
      return {
        weightedTotal: accumulator.weightedTotal + operationScores[operation] * weight,
        totalWeight: accumulator.totalWeight + weight,
      };
    },
    { weightedTotal: 0, totalWeight: 0 },
  );

  const currentIndex = LEVEL_ORDER.indexOf(state.currentLevel);
  const shouldIncrease = state.recentAccuracy > 85;
  const shouldDecrease = state.recentAccuracy < 50;
  const recommendedIndex = shouldIncrease
    ? clamp(currentIndex + 1, 0, LEVEL_ORDER.length - 1)
    : shouldDecrease
      ? clamp(currentIndex - 1, 0, LEVEL_ORDER.length - 1)
      : currentIndex;

  return {
    overallScore: clamp(Math.round(weightedTotal / totalWeight), 0, 100),
    operationScores,
    weakOperationWeight: WEAK_OPERATION_WEIGHT,
    recommendedLevel: LEVEL_ORDER[recommendedIndex],
  };
};

export const buildWorksheetRecommendation = (state: AdaptiveState): WorksheetRecommendation => {
  const difficultyScore = scoreDifficulty(state);
  const focusOperations = OPERATIONS
    .slice()
    .sort((left, right) => {
      const weakBiasLeft = state.weakOperations.includes(left) ? -20 : 0;
      const weakBiasRight = state.weakOperations.includes(right) ? -20 : 0;
      return (difficultyScore.operationScores[left] + weakBiasLeft) - (difficultyScore.operationScores[right] + weakBiasRight);
    })
    .slice(0, 2);

  const rationale = [
    state.recentAccuracy > 85
      ? 'Recent worksheet accuracy is above 85%, so the next worksheet increases difficulty.'
      : state.recentAccuracy < 50
        ? 'Recent worksheet accuracy is below 50%, so the next worksheet lowers difficulty for reinforcement.'
        : 'Recent worksheet accuracy is steady, so the next worksheet maintains the current difficulty band.',
    state.weakOperations.length > 0
      ? `Weak operations (${state.weakOperations.join(', ')}) receive extra weight in recommendation scoring.`
      : 'No weak operations detected, so recommendation prioritizes balanced progression.',
  ];

  const baseDifficulty = LEVEL_BASE_DIFFICULTY[difficultyScore.recommendedLevel];
  const targetDifficulty = clamp(
    Math.round(baseDifficulty + (difficultyScore.overallScore - 50) * 0.35),
    0,
    100,
  );

  return {
    studentId: state.studentId,
    targetDifficulty,
    recommendedLevel: difficultyScore.recommendedLevel,
    focusOperations,
    rationale,
    difficultyScore,
  };
};

export const getNextWorksheetRecommendation = async (input: {
  studentId: string;
  currentLevel: LearningLevel;
  recentAccuracy: number;
  operationAccuracy?: Partial<Record<MathOperation, number>>;
}): Promise<WorksheetRecommendation> => {
  const adaptiveState = await createAdaptiveState(input);
  return buildWorksheetRecommendation(adaptiveState);
};
