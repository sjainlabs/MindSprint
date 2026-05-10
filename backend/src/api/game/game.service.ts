import { generateQuestion } from '../../utils/generateQuestion';
import { randomInt, shuffle } from '../../utils/random';
import {
  type GameChallenge,
  type LearningLevel,
  type MathOperation,
  type StudentProfile,
} from '../../models/types';
import { getStudentProfile } from '../students/student-profile.service';

const OPERATIONS: MathOperation[] = ['addition', 'subtraction', 'multiplication', 'division'];

const toLevelFromDifficulty = (difficulty: number): LearningLevel => {
  if (difficulty >= 80) {
    return 'Advanced';
  }
  if (difficulty >= 50) {
    return 'Intermediate';
  }
  return 'Beginner';
};

const calculateAdaptiveDifficulty = (profile: StudentProfile, requestedDifficulty?: number): number => {
  if (typeof requestedDifficulty === 'number' && Number.isFinite(requestedDifficulty)) {
    return Math.max(0, Math.min(100, Math.round(requestedDifficulty)));
  }

  const masteryAverage =
    (profile.masteryLevels.addition +
      profile.masteryLevels.subtraction +
      profile.masteryLevels.multiplication +
      profile.masteryLevels.division) /
    4;
  return Math.max(20, Math.min(95, Math.round(masteryAverage)));
};

const buildOptions = (answer: number): number[] => {
  const offsets = [-12, -7, -3, 4, 8, 13];
  const distractors = shuffle(offsets)
    .slice(0, 3)
    .map((offset) => answer + offset)
    .filter((value) => value !== answer)
    .map((value) => Math.max(0, value));

  return shuffle([answer, ...distractors.slice(0, 3)]);
};

const pickOperation = (profile: StudentProfile): MathOperation => {
  const sorted = OPERATIONS.slice().sort(
    (left, right) => profile.masteryLevels[left] - profile.masteryLevels[right],
  );
  const weakBias = sorted.slice(0, 2);
  return weakBias[randomInt(0, weakBias.length - 1)] ?? sorted[0];
};

export const getGameChallenge = async (input: {
  studentId: string;
  difficulty?: number;
  streak?: number;
  completedDailyQuestCount?: number;
}): Promise<GameChallenge> => {
  const profile = await getStudentProfile(input.studentId);
  const difficulty = calculateAdaptiveDifficulty(profile, input.difficulty);
  const recommendedLevel = toLevelFromDifficulty(difficulty);
  const operation = pickOperation(profile);
  const challengeQuestion = generateQuestion(operation, recommendedLevel);
  const challengeStreak = Math.max(profile.streak, input.streak ?? 0);
  const bossBattleUnlocked = challengeStreak >= 5 || difficulty >= 85;

  const dailyQuestProgress = Math.max(0, Math.min(3, input.completedDailyQuestCount ?? 0));
  const dailyQuestCompleted = dailyQuestProgress >= 3;
  const streakBonus = challengeStreak >= 3 ? 10 : 0;
  const xp = 15 + Math.round(difficulty / 6);
  const badge = difficulty >= 90 ? 'Mythic Challenger' : difficulty >= 75 ? 'Rising Hero' : undefined;

  return {
    challengeId: `challenge-${Date.now()}-${randomInt(1000, 9999)}`,
    studentId: profile.studentId,
    prompt: challengeQuestion.prompt,
    operation,
    options: buildOptions(challengeQuestion.answer),
    answer: challengeQuestion.answer,
    timeLimitSeconds: bossBattleUnlocked ? 20 : 30,
    difficulty,
    recommendedLevel,
    rewards: {
      xp,
      streakBonus,
      badge,
    },
    dailyQuest: {
      id: `daily-${new Date().toISOString().slice(0, 10)}`,
      description: 'Complete 3 game challenges with at least 80% accuracy.',
      target: 3,
      progress: dailyQuestProgress,
      rewardXp: 50,
      completed: dailyQuestCompleted,
    },
    bossBattle: {
      id: 'boss-fractions-fortress',
      title: 'Fractions Fortress',
      hp: bossBattleUnlocked ? 100 : 0,
      phase: bossBattleUnlocked ? Math.min(3, Math.floor(difficulty / 30) + 1) : 0,
      unlocked: bossBattleUnlocked,
    },
    playerState: {
      xp: profile.xp,
      streak: profile.streak,
      badges: profile.badges,
      level: profile.level,
    },
  };
};
