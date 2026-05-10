import {
  type AdaptiveRecommendationV2,
  type AdvancedQuestionType,
  type AdaptiveState,
  type DifficultyScore,
  type GameMode,
  type LearningLevel,
  type MathOperation,
  type WorksheetRecommendation,
} from '../../models/types';
import { getStudentProfile } from '../students/student-profile.service';
import { buildPersonalizedLearningPath } from '../topics/topic.service';

const OPERATIONS: MathOperation[] = ['addition', 'subtraction', 'multiplication', 'division'];
const LEVEL_ORDER: LearningLevel[] = ['Beginner', 'Intermediate', 'Advanced'];
const LEVEL_BASE_DIFFICULTY: Record<LearningLevel, number> = {
  Beginner: 30,
  Intermediate: 60,
  Advanced: 85,
};
const WEAK_OPERATION_WEIGHT = 1.6;
const WORKSHEET_TYPES: AdvancedQuestionType[] = [
  'numeric',
  'symbolic',
  'multi-step',
  'graph-interpretation',
  'word-problem',
  'proof-style',
  'function-analysis',
  'trig-identity',
];
const GAME_MODES: GameMode[] = ['abacus-flash', 'falling-numbers', 'boss-battle', 'ai-puzzle'];
const BASELINE_SECONDS_PER_QUESTION = 20;
const DEFAULT_CONFIDENCE = 50;
const CONFIDENCE_WEIGHT = 0.08;
const DIAGNOSTIC_WEIGHT = 0.15;
const SPEED_PENALTY_FACTOR = 0.8;
const GAME_BOOST_FACTOR = 0.1;

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

const pickRecommendedGameMode = (difficulty: number, weakOperations: MathOperation[]): GameMode => {
  if (difficulty >= 85) {
    return 'boss-battle';
  }
  if (weakOperations.includes('division') || weakOperations.includes('multiplication')) {
    return 'falling-numbers';
  }
  if (difficulty >= 65) {
    return 'ai-puzzle';
  }
  return 'abacus-flash';
};

const pickWorksheetType = (difficulty: number, focusOperations: MathOperation[]): AdvancedQuestionType => {
  if (difficulty >= 90) {
    return 'proof-style';
  }
  if (difficulty >= 80) {
    return 'function-analysis';
  }
  if (focusOperations.includes('division') || focusOperations.includes('multiplication')) {
    return 'multi-step';
  }
  return 'numeric';
};

export const getNextWorksheetRecommendationV2 = async (input: {
  studentId: string;
  currentLevel: LearningLevel;
  recentAccuracy: number;
  operationAccuracy?: Partial<Record<MathOperation, number>>;
  confidence?: number;
  averageSecondsPerQuestion?: number;
  diagnosticAccuracy?: number;
  latestGameScore?: number;
}): Promise<AdaptiveRecommendationV2> => {
  const state = await createAdaptiveState(input);
  const baseRecommendation = buildWorksheetRecommendation(state);
  const path = buildPersonalizedLearningPath(state.profile);
  const recommendedTopic = path[0];
  const recommendedSubtopic = recommendedTopic?.subtopics[0];
  const confidenceAdjustment = Math.round((input.confidence ?? DEFAULT_CONFIDENCE) * CONFIDENCE_WEIGHT);
  const diagnosticsWeight = Math.round((input.diagnosticAccuracy ?? baseRecommendation.targetDifficulty) * DIAGNOSTIC_WEIGHT);
  const speedPenalty = Math.round(
    Math.max(0, (input.averageSecondsPerQuestion ?? BASELINE_SECONDS_PER_QUESTION) - BASELINE_SECONDS_PER_QUESTION) * SPEED_PENALTY_FACTOR,
  );
  const gameBoost = Math.round((input.latestGameScore ?? 60) * GAME_BOOST_FACTOR);
  const adjustedDifficulty = clamp(
    baseRecommendation.targetDifficulty + confidenceAdjustment + diagnosticsWeight + gameBoost - speedPenalty,
    0,
    100,
  );
  const mode = pickRecommendedGameMode(adjustedDifficulty, state.weakOperations);
  const worksheetType = pickWorksheetType(adjustedDifficulty, baseRecommendation.focusOperations);

  return {
    ...baseRecommendation,
    targetDifficulty: adjustedDifficulty,
    recommendedTopicId: recommendedTopic?.id ?? 'foundation',
    recommendedSubtopicId: recommendedSubtopic?.id ?? 'counting',
    recommendedGameMode: GAME_MODES.includes(mode) ? mode : 'abacus-flash',
    recommendedWorksheetType: WORKSHEET_TYPES.includes(worksheetType) ? worksheetType : 'numeric',
    confidenceAdjustment,
    diagnosticsWeight,
  };
};
