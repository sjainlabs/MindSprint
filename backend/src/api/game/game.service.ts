import { getDatabase } from '../../db/database';
import { generateQuestion } from '../../utils/generateQuestion';
import { randomInt, shuffle } from '../../utils/random';
import {
  type GameMode,
  type GameChallenge,
  type LearningLevel,
  type MathOperation,
  type StudentProfile,
} from '../../models/types';
import { getStudentProfile, updateStudentProfileFromGame } from '../students/student-profile.service';

const OPERATIONS: MathOperation[] = ['addition', 'subtraction', 'multiplication', 'division'];
const DAILY_QUEST_CONFIG = {
  target: 3,
  rewardXp: 50,
  description: 'Complete 3 game challenges with at least 80% accuracy.',
};
const ABACUS_MIN_FLASH_COUNT = 3;
const ABACUS_MAX_NUMBER = 20;
const ABACUS_MIN_NUMBER = 1;
const ABACUS_MIN_SPEED_MS = 450;
const ABACUS_BASE_SPEED_MS = 1500;
const ABACUS_SPEED_PER_DIFFICULTY = 10;
const ABACUS_OPERATION_DIVISOR = 35;

const selectDefaultGameMode = (difficulty: number, challengeStreak: number): GameMode => {
  if (difficulty >= 85) {
    return 'boss-battle';
  }
  if (difficulty >= 65) {
    return 'ai-puzzle';
  }
  if (challengeStreak >= 3) {
    return 'falling-numbers';
  }
  return 'abacus-flash';
};

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
    .map((value) => Math.max(0, value))
    .filter((value, index, all) => all.indexOf(value) === index);

  while (distractors.length < 3) {
    const extra = Math.max(0, answer + randomInt(-15, 15));
    if (extra !== answer && !distractors.includes(extra)) {
      distractors.push(extra);
    }
  }

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
  mode?: GameMode;
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

  const dailyQuestProgress = Math.max(0, Math.min(DAILY_QUEST_CONFIG.target, input.completedDailyQuestCount ?? 0));
  const dailyQuestCompleted = dailyQuestProgress >= DAILY_QUEST_CONFIG.target;
  const streakBonus = challengeStreak >= 3 ? 10 : 0;
  const xp = 15 + Math.round(difficulty / 6);
  const badge = difficulty >= 90 ? 'Mythic Challenger' : difficulty >= 75 ? 'Rising Hero' : undefined;
  const mode = input.mode ?? selectDefaultGameMode(difficulty, challengeStreak);

  const abacusPayload = {
    flashSequence: Array.from(
      { length: Math.max(ABACUS_MIN_FLASH_COUNT, Math.round(difficulty / ABACUS_MAX_NUMBER)) },
      () => randomInt(ABACUS_MIN_NUMBER, ABACUS_MAX_NUMBER),
    ),
    speedMs: Math.max(ABACUS_MIN_SPEED_MS, ABACUS_BASE_SPEED_MS - difficulty * ABACUS_SPEED_PER_DIFFICULTY),
    mixedOperations: shuffle(OPERATIONS).slice(0, Math.max(2, Math.round(difficulty / ABACUS_OPERATION_DIVISOR))),
  };

  const fallingPayload = {
    target: randomInt(10, 60),
    stream: Array.from({ length: 10 }, () => randomInt(1, 30)),
    combosEnabled: true,
    powerUps: ['freeze-time', 'double-xp', 'shield'],
  };

  const bossPayload = {
    bossName: challengeStreak >= 8 ? 'Algebra Hydra' : 'Fractions Fortress',
    bossHp: bossBattleUnlocked ? 100 + Math.round(difficulty * 1.2) : 0,
    specialAttacks: ['fractions-storm', 'algebra-blast', 'graph-shock'],
    timedRounds: 3,
  };

  const puzzlePayload = {
    puzzleTypes: ['logic', 'patterns', 'geometry-visual', 'function-graph'],
    dynamicSeed: `${Date.now()}-${randomInt(100, 999)}`,
    complexity: difficulty >= 80 ? 'expert' : difficulty >= 60 ? 'advanced' : 'core',
  };

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
      description: DAILY_QUEST_CONFIG.description,
      target: DAILY_QUEST_CONFIG.target,
      progress: dailyQuestProgress,
      rewardXp: DAILY_QUEST_CONFIG.rewardXp,
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
    mode,
    gamePayload: mode === 'abacus-flash'
      ? abacusPayload
      : mode === 'falling-numbers'
        ? fallingPayload
        : mode === 'boss-battle'
          ? bossPayload
          : puzzlePayload,
  };
};

export const submitGameResult = async (input: {
  studentId: string;
  mode: GameMode;
  score: number;
  accuracy: number;
  streak: number;
}): Promise<{ saved: boolean; xpEarned: number }> => {
  const xpEarned = Math.max(5, Math.round(input.score * 0.25 + input.accuracy * 0.4));
  const badge = input.score >= 95 ? 'Arcade Legend' : input.accuracy >= 90 ? 'Precision Hero' : undefined;

  await updateStudentProfileFromGame({
    studentId: input.studentId,
    xpEarned,
    streakDelta: input.streak > 0 ? 1 : 0,
    badge,
    unlockedMode: input.mode,
  });

  const db = await getDatabase();
  await db.run(
    `INSERT INTO game_records (student_id, mode, score, accuracy, streak, xp_earned, payload, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.studentId,
      input.mode,
      input.score,
      input.accuracy,
      input.streak,
      xpEarned,
      JSON.stringify({ mode: input.mode, score: input.score, accuracy: input.accuracy, streak: input.streak }),
      new Date().toISOString(),
    ],
  );

  return { saved: true, xpEarned };
};
