import { getDatabase } from '../../db/database';
import {
  type ConfidenceLevel,
  type GameMode,
  type GradeLevel,
  type MathOperation,
  type OnboardingGoal,
  type OperationMasteryMap,
  type StudentProfile,
  type WorksheetResult,
} from '../../models/types';
import { TOPIC_TAXONOMY, findTopicById } from '../topics/topic.service';

const OPERATIONS: MathOperation[] = ['addition', 'subtraction', 'multiplication', 'division'];
const DEFAULT_MASTERY_LEVEL = 50;
const TOPIC_MASTERY_RETENTION_WEIGHT = 0.7;
const TOPIC_MASTERY_NEW_ACCURACY_WEIGHT = 0.3;
const MAX_LEVEL = 50;
const NEVER_UPDATED_TIMESTAMP = new Date(0).toISOString();
const NEVER_UPDATED_DATE_KEY = NEVER_UPDATED_TIMESTAMP.slice(0, 10);

type ProfileRow = {
  student_id: string;
  age?: number;
  grade?: number;
  mastery_json: string;
  topic_mastery_json?: string;
  xp: number;
  level: number;
  streak: number;
  badges_json: string;
  power_ups_json?: string;
  milestones_json?: string;
  unlocked_game_modes_json?: string;
  goals_json?: string;
  confidence_level?: string;
  onboarding_completed?: number;
  avatar?: string | null;
  math_world?: string | null;
  daily_quests_completed?: number;
  weekly_tournament_points?: number;
  unlocked_through_grade?: number | null;
  learning_path_level: number;
  updated_at: string;
};

type OperationPerformance = {
  attempted: number;
  correct: number;
  accuracy: number;
};

const emptyMastery = (): OperationMasteryMap => ({
  addition: DEFAULT_MASTERY_LEVEL,
  subtraction: DEFAULT_MASTERY_LEVEL,
  multiplication: DEFAULT_MASTERY_LEVEL,
  division: DEFAULT_MASTERY_LEVEL,
});

const defaultTopicMastery = (): Record<string, number> =>
  TOPIC_TAXONOMY.reduce<Record<string, number>>((accumulator, topic) => {
    accumulator[topic.id] = 0;
    return accumulator;
  }, {});

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const toDateKey = (value: string): string => value.slice(0, 10);

const daysBetween = (earlier: string, later: string): number => {
  const start = new Date(`${earlier}T00:00:00.000Z`).getTime();
  const end = new Date(`${later}T00:00:00.000Z`).getTime();
  return Math.round((end - start) / 86_400_000);
};

export const createDefaultStudentProfile = (studentId: string): StudentProfile => ({
  studentId,
  age: 8,
  grade: 3,
  masteryLevels: emptyMastery(),
  topicMastery: defaultTopicMastery(),
  xp: 0,
  level: 1,
  streak: 0,
  badges: [],
  powerUps: [],
  dailyQuestsCompleted: 0,
  weeklyTournamentPoints: 0,
  milestones: [],
  unlockedGameModes: ['abacus-flash'],
  onboardingCompleted: false,
  avatar: 'Nova',
  mathWorld: 'Number Forest',
  goals: ['explore'],
  confidenceLevel: 'medium',
  diagnosticHistoryCount: 0,
  unlockedThroughGrade: 3,
  learningPathLevel: 1,
  updatedAt: NEVER_UPDATED_TIMESTAMP,
});

const fromRow = (row: ProfileRow): StudentProfile => ({
  studentId: row.student_id,
  age: row.age ?? 8,
  grade: (row.grade ?? 3) as GradeLevel,
  masteryLevels: JSON.parse(row.mastery_json) as OperationMasteryMap,
  topicMastery: row.topic_mastery_json
    ? (JSON.parse(row.topic_mastery_json) as Record<string, number>)
    : defaultTopicMastery(),
  xp: row.xp,
  level: row.level,
  streak: row.streak,
  badges: JSON.parse(row.badges_json) as string[],
  powerUps: row.power_ups_json ? (JSON.parse(row.power_ups_json) as string[]) : [],
  dailyQuestsCompleted: row.daily_quests_completed ?? 0,
  weeklyTournamentPoints: row.weekly_tournament_points ?? 0,
  milestones: row.milestones_json ? (JSON.parse(row.milestones_json) as string[]) : [],
  unlockedGameModes: row.unlocked_game_modes_json
    ? (JSON.parse(row.unlocked_game_modes_json) as GameMode[])
    : ['abacus-flash'],
  onboardingCompleted: (row.onboarding_completed ?? 0) === 1,
  avatar: row.avatar ?? 'Nova',
  mathWorld: row.math_world ?? 'Number Forest',
  goals: row.goals_json ? (JSON.parse(row.goals_json) as OnboardingGoal[]) : ['explore'],
  confidenceLevel: (row.confidence_level as ConfidenceLevel | undefined) ?? 'medium',
  unlockedThroughGrade: (row.unlocked_through_grade ?? row.grade ?? 3) as GradeLevel,
  learningPathLevel: row.learning_path_level,
  updatedAt: row.updated_at,
});

const calculateProfileLevel = (xp: number): number => clamp(Math.floor(xp / 120) + 1, 1, MAX_LEVEL);

const calculateLearningPathLevel = (masteryLevels: OperationMasteryMap): number => {
  const averageMastery = OPERATIONS.reduce((sum, operation) => sum + masteryLevels[operation], 0) / OPERATIONS.length;
  return clamp(Math.round(averageMastery / 2), 1, MAX_LEVEL);
};

export const buildOperationPerformance = (
  result: WorksheetResult,
): Partial<Record<MathOperation, OperationPerformance>> => {
  const stats = result.questionResults.reduce<
    Partial<Record<MathOperation, { attempted: number; correct: number }>>
  >((accumulator, questionResult) => {
    if (questionResult.submittedAnswer === null) {
      return accumulator;
    }

    const current = accumulator[questionResult.operation] ?? { attempted: 0, correct: 0 };
    current.attempted += 1;
    if (questionResult.isCorrect) {
      current.correct += 1;
    }
    accumulator[questionResult.operation] = current;
    return accumulator;
  }, {});

  return OPERATIONS.reduce<Partial<Record<MathOperation, OperationPerformance>>>((accumulator, operation) => {
    const current = stats[operation];
    if (!current || current.attempted === 0) {
      return accumulator;
    }

    accumulator[operation] = {
      ...current,
      accuracy: Math.round((current.correct / current.attempted) * 100),
    };
    return accumulator;
  }, {});
};

const updateMasteryValue = (previousMastery: number, accuracy: number): number => {
  const blendedMastery = previousMastery + (accuracy - previousMastery) * 0.35;
  const momentum = accuracy >= 90 ? 6 : accuracy <= 50 ? -8 : accuracy >= 75 ? 3 : -2;
  return clamp(Math.round(blendedMastery + momentum), 0, 100);
};

const applyTopicMasteryDecay = (topicMastery: Record<string, number>, updatedAt: string, nowIso: string): Record<string, number> => {
  const previousDateKey = toDateKey(updatedAt);
  if (previousDateKey === NEVER_UPDATED_DATE_KEY) {
    return topicMastery;
  }
  const inactivityDays = Math.max(0, daysBetween(previousDateKey, toDateKey(nowIso)));
  if (inactivityDays <= 7) {
    return topicMastery;
  }

  return Object.entries(topicMastery).reduce<Record<string, number>>((accumulator, [topicId, mastery]) => {
    const topic = findTopicById(topicId);
    const decayRate = topic?.masteryDecayRatePerWeek ?? 1.25;
    const decay = Math.floor((inactivityDays / 7) * decayRate);
    accumulator[topicId] = clamp(mastery - decay, 0, 100);
    return accumulator;
  }, {});
};

const calculateXpGain = (result: WorksheetResult): number => {
  const completionXp = result.attempted * 5;
  const accuracyXp = result.correct * 10;
  const bonusXp = result.accuracy >= 90 ? 25 : result.accuracy >= 75 ? 10 : 0;
  return completionXp + accuracyXp + bonusXp;
};

const updateStreak = (currentStreak: number, updatedAt: string, submittedAt: string): number => {
  const previousDateKey = toDateKey(updatedAt);
  const currentDateKey = toDateKey(submittedAt);

  if (previousDateKey === NEVER_UPDATED_DATE_KEY) {
    return 1;
  }

  const difference = daysBetween(previousDateKey, currentDateKey);
  if (difference <= 0) {
    return currentStreak;
  }

  if (difference === 1) {
    return currentStreak + 1;
  }

  return 1;
};

const operationMasterBadge = (operation: MathOperation): string =>
  `${operation.charAt(0).toUpperCase()}${operation.slice(1)} Master`;

const LEARNING_LEVEL_PRIMARY_TOPIC: Record<WorksheetResult['level'], string> = {
  Beginner: 'foundation',
  Intermediate: 'elementary',
  Advanced: 'pre-algebra',
};

const inferTopicFromLearningLevel = (level: WorksheetResult['level']): string => {
  return LEARNING_LEVEL_PRIMARY_TOPIC[level];
};

const collectBadges = (
  currentBadges: string[],
  result: WorksheetResult,
  masteryLevels: OperationMasteryMap,
  streak: number,
): string[] => {
  const badgeSet = new Set(currentBadges);

  if (result.accuracy >= 90) {
    badgeSet.add('Accuracy 90%+');
  }

  if (streak >= 3) {
    badgeSet.add('3-Day Streak');
  }

  for (const operation of OPERATIONS) {
    if (masteryLevels[operation] >= 90) {
      badgeSet.add(operationMasterBadge(operation));
    }
  }

  return [...badgeSet].sort();
};

export const updateStudentProfileFromWorksheet = (
  profile: StudentProfile,
  result: WorksheetResult,
  submittedAt: string,
): StudentProfile => {
  const operationPerformance = buildOperationPerformance(result);
  const masteryLevels = { ...profile.masteryLevels };
  const decayedTopicMastery = applyTopicMasteryDecay(profile.topicMastery, profile.updatedAt, submittedAt);

  for (const operation of OPERATIONS) {
    const stats = operationPerformance[operation];
    if (!stats) {
      continue;
    }

    masteryLevels[operation] = updateMasteryValue(masteryLevels[operation], stats.accuracy);
  }

  const xp = profile.xp + calculateXpGain(result);
  const streak = updateStreak(profile.streak, profile.updatedAt, submittedAt);
  const topicId = inferTopicFromLearningLevel(result.level);
  const topicMastery = {
    ...defaultTopicMastery(),
    ...decayedTopicMastery,
    [topicId]: clamp(
      Math.round(
        ((decayedTopicMastery[topicId] ?? 0) * TOPIC_MASTERY_RETENTION_WEIGHT) +
          result.accuracy * TOPIC_MASTERY_NEW_ACCURACY_WEIGHT,
      ),
      0,
      100,
    ),
  };

  return {
    studentId: profile.studentId,
    age: profile.age,
    grade: profile.grade,
    masteryLevels,
    topicMastery,
    xp,
    level: calculateProfileLevel(xp),
    streak,
    badges: collectBadges(profile.badges, result, masteryLevels, streak),
    learningPathLevel: calculateLearningPathLevel(masteryLevels),
    updatedAt: submittedAt,
  };
};

export const getStudentProfile = async (studentId: string): Promise<StudentProfile> => {
  const db = await getDatabase();
  const row = await db.get<ProfileRow>(
    `SELECT student_id, age, grade, mastery_json, topic_mastery_json, xp, level, streak, badges_json, learning_path_level, updated_at
      , power_ups_json, milestones_json, unlocked_game_modes_json, goals_json, confidence_level
      , onboarding_completed, avatar, math_world, daily_quests_completed, weekly_tournament_points, unlocked_through_grade
     FROM student_profiles WHERE student_id = ?`,
    [studentId],
  );

  if (!row) {
    const profile = createDefaultStudentProfile(studentId);
    await saveStudentProfile(profile);
    return profile;
  }

  return fromRow(row);
};

export const saveStudentProfile = async (profile: StudentProfile): Promise<void> => {
  const db = await getDatabase();
  await db.run(
    `INSERT INTO student_profiles (
      student_id, age, grade, mastery_json, topic_mastery_json, xp, level, streak, badges_json,
      power_ups_json, milestones_json, unlocked_game_modes_json, goals_json, confidence_level,
      onboarding_completed, avatar, math_world, daily_quests_completed, weekly_tournament_points,
      unlocked_through_grade, learning_path_level, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(student_id) DO UPDATE SET
      age = excluded.age,
      grade = excluded.grade,
      mastery_json = excluded.mastery_json,
      topic_mastery_json = excluded.topic_mastery_json,
      xp = excluded.xp,
      level = excluded.level,
      streak = excluded.streak,
      badges_json = excluded.badges_json,
      power_ups_json = excluded.power_ups_json,
      milestones_json = excluded.milestones_json,
      unlocked_game_modes_json = excluded.unlocked_game_modes_json,
      goals_json = excluded.goals_json,
      confidence_level = excluded.confidence_level,
      onboarding_completed = excluded.onboarding_completed,
      avatar = excluded.avatar,
      math_world = excluded.math_world,
      daily_quests_completed = excluded.daily_quests_completed,
      weekly_tournament_points = excluded.weekly_tournament_points,
      unlocked_through_grade = excluded.unlocked_through_grade,
      learning_path_level = excluded.learning_path_level,
      updated_at = excluded.updated_at`,
    [
      profile.studentId,
      profile.age,
      profile.grade,
      JSON.stringify(profile.masteryLevels),
      JSON.stringify(profile.topicMastery),
      profile.xp,
      profile.level,
      profile.streak,
      JSON.stringify(profile.badges),
      JSON.stringify(profile.powerUps ?? []),
      JSON.stringify(profile.milestones ?? []),
      JSON.stringify(profile.unlockedGameModes ?? ['abacus-flash']),
      JSON.stringify(profile.goals ?? ['explore']),
      profile.confidenceLevel ?? 'medium',
      profile.onboardingCompleted ? 1 : 0,
      profile.avatar ?? 'Nova',
      profile.mathWorld ?? 'Number Forest',
      profile.dailyQuestsCompleted ?? 0,
      profile.weeklyTournamentPoints ?? 0,
      profile.unlockedThroughGrade ?? profile.grade,
      profile.learningPathLevel,
      profile.updatedAt,
    ],
  );
};

export const updateStudentProfileAfterWorksheet = async (
  studentId: string,
  result: WorksheetResult,
  submittedAt: string,
): Promise<StudentProfile> => {
  const profile = await getStudentProfile(studentId);
  const updatedProfile = updateStudentProfileFromWorksheet(profile, result, submittedAt);
  await saveStudentProfile(updatedProfile);
  return updatedProfile;
};

export const updateStudentProfileGradeContext = async (
  studentId: string,
  context: { age: number; grade: GradeLevel },
): Promise<StudentProfile> => {
  const profile = await getStudentProfile(studentId);
  const updated: StudentProfile = {
    ...profile,
    age: context.age,
    grade: context.grade,
    updatedAt: new Date().toISOString(),
  };
  await saveStudentProfile(updated);
  return updated;
};

export const unlockStudentNextGrade = async (studentId: string, unlockedGrade: GradeLevel): Promise<StudentProfile> => {
  const profile = await getStudentProfile(studentId);
  const updated: StudentProfile = {
    ...profile,
    grade: profile.grade < unlockedGrade ? unlockedGrade : profile.grade,
    unlockedThroughGrade: profile.unlockedThroughGrade && profile.unlockedThroughGrade > unlockedGrade
      ? profile.unlockedThroughGrade
      : unlockedGrade,
    updatedAt: new Date().toISOString(),
  };
  await saveStudentProfile(updated);
  return updated;
};

export const updateStudentProfileFromGame = async (input: {
  studentId: string;
  xpEarned: number;
  streakDelta?: number;
  badge?: string;
  unlockedMode?: GameMode;
}): Promise<StudentProfile> => {
  const profile = await getStudentProfile(input.studentId);
  const xp = profile.xp + Math.max(0, input.xpEarned);
  const streak = Math.max(0, profile.streak + (input.streakDelta ?? 0));
  const badges = input.badge ? [...new Set([...profile.badges, input.badge])] : profile.badges;
  const unlockedGameModes = input.unlockedMode
    ? [...new Set([...(profile.unlockedGameModes ?? ['abacus-flash']), input.unlockedMode])]
    : (profile.unlockedGameModes ?? ['abacus-flash']);

  const updated: StudentProfile = {
    ...profile,
    xp,
    streak,
    level: calculateProfileLevel(xp),
    badges,
    unlockedGameModes,
    dailyQuestsCompleted: (profile.dailyQuestsCompleted ?? 0) + 1,
    weeklyTournamentPoints: (profile.weeklyTournamentPoints ?? 0) + Math.max(0, Math.round(input.xpEarned / 2)),
    updatedAt: new Date().toISOString(),
  };

  await saveStudentProfile(updated);
  return updated;
};

export const completeStudentOnboarding = async (input: {
  studentId: string;
  age: number;
  grade: GradeLevel;
  goals: OnboardingGoal[];
  confidenceLevel: ConfidenceLevel;
  avatar: string;
  mathWorld: string;
  personalizedPath: string[];
}): Promise<StudentProfile> => {
  const profile = await getStudentProfile(input.studentId);
  const updated: StudentProfile = {
    ...profile,
    age: input.age,
    grade: input.grade,
    goals: input.goals,
    confidenceLevel: input.confidenceLevel,
    avatar: input.avatar,
    mathWorld: input.mathWorld,
    onboardingCompleted: true,
    milestones: [...new Set([...(profile.milestones ?? []), `Onboarding completed (${new Date().toISOString().slice(0, 10)})`])],
    updatedAt: new Date().toISOString(),
  };
  await saveStudentProfile(updated);
  return updated;
};
