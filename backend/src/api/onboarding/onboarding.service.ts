import { getDatabase } from '../../db/database';
import {
  type ConfidenceLevel,
  type GradeLevel,
  type OnboardingGoal,
  type OnboardingProfile,
} from '../../models/types';
import { buildPersonalizedLearningPath } from '../topics/topic.service';
import { completeStudentOnboarding, getStudentProfile } from '../students/student-profile.service';

const DEFAULT_STUDENT_ID = 'student-demo';
const MAX_AVATAR_LENGTH = 40;
const MAX_MATH_WORLD_LENGTH = 60;

const toGradeFromAge = (age: number): GradeLevel => {
  const normalizedAge = clamp(Math.round(age), 4, 18);
  if (normalizedAge <= 4) {
    return 0;
  }
  return Math.min(12, normalizedAge - 4) as GradeLevel;
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const sanitizeGoals = (goals: unknown): OnboardingGoal[] => {
  if (!Array.isArray(goals)) {
    return ['explore'];
  }
  const allowed: OnboardingGoal[] = ['catch-up', 'get-ahead', 'exam-prep', 'explore'];
  const selected = goals.filter((goal): goal is OnboardingGoal => typeof goal === 'string' && allowed.includes(goal as OnboardingGoal));
  return selected.length > 0 ? [...new Set(selected)] : ['explore'];
};

const sanitizeConfidence = (value: unknown): ConfidenceLevel => {
  return value === 'low' || value === 'high' ? value : 'medium';
};

export const saveOnboardingProfile = async (input: {
  studentId?: string;
  age: number;
  grade?: number;
  goals?: unknown;
  confidenceLevel?: unknown;
  placementScore?: number;
  avatar?: string;
  mathWorld?: string;
}): Promise<OnboardingProfile> => {
  const studentId = input.studentId?.trim() || DEFAULT_STUDENT_ID;
  const age = Math.round(input.age);
  const grade = (typeof input.grade === 'number' ? clamp(Math.round(input.grade), 0, 12) : toGradeFromAge(age)) as GradeLevel;
  const goals = sanitizeGoals(input.goals);
  const confidenceLevel = sanitizeConfidence(input.confidenceLevel);
  const placementScore = clamp(Math.round(input.placementScore ?? 60), 0, 100);
  const avatar = (input.avatar?.trim() || 'Nova').slice(0, MAX_AVATAR_LENGTH);
  const mathWorld = (input.mathWorld?.trim() || 'Number Forest').slice(0, MAX_MATH_WORLD_LENGTH);

  const existingProfile = await getStudentProfile(studentId);
  const personalizedPath = buildPersonalizedLearningPath({
    ...existingProfile,
    age,
    grade,
    goals,
    confidenceLevel,
  }).map((topic) => topic.id);
  const completedAt = new Date().toISOString();

  const db = await getDatabase();
  await db.run(
    `INSERT INTO onboarding_profiles (
      student_id, age, grade, goals_json, confidence_level, placement_score, personalized_path_json, avatar, math_world, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(student_id) DO UPDATE SET
      age = excluded.age,
      grade = excluded.grade,
      goals_json = excluded.goals_json,
      confidence_level = excluded.confidence_level,
      placement_score = excluded.placement_score,
      personalized_path_json = excluded.personalized_path_json,
      avatar = excluded.avatar,
      math_world = excluded.math_world,
      completed_at = excluded.completed_at`,
    [
      studentId,
      age,
      grade,
      JSON.stringify(goals),
      confidenceLevel,
      placementScore,
      JSON.stringify(personalizedPath),
      avatar,
      mathWorld,
      completedAt,
    ],
  );

  await completeStudentOnboarding({
    studentId,
    age,
    grade,
    goals,
    confidenceLevel,
    avatar,
    mathWorld,
    personalizedPath,
  });

  return {
    studentId,
    age,
    grade,
    goals,
    confidenceLevel,
    placementScore,
    personalizedPath,
    avatar,
    mathWorld,
    completedAt,
  };
};

export const getOnboardingProfile = async (studentIdInput?: string): Promise<OnboardingProfile | null> => {
  const studentId = studentIdInput?.trim() || DEFAULT_STUDENT_ID;
  const db = await getDatabase();
  const row = await db.get<{
    student_id: string;
    age: number;
    grade: number;
    goals_json: string;
    confidence_level: string;
    placement_score: number;
    personalized_path_json: string;
    avatar: string;
    math_world: string;
    completed_at: string;
  }>(
    `SELECT student_id, age, grade, goals_json, confidence_level, placement_score, personalized_path_json, avatar, math_world, completed_at
     FROM onboarding_profiles
     WHERE student_id = ?`,
    [studentId],
  );

  if (!row) {
    return null;
  }

  return {
    studentId: row.student_id,
    age: row.age,
    grade: row.grade as GradeLevel,
    goals: JSON.parse(row.goals_json) as OnboardingGoal[],
    confidenceLevel: sanitizeConfidence(row.confidence_level),
    placementScore: row.placement_score,
    personalizedPath: JSON.parse(row.personalized_path_json) as string[],
    avatar: row.avatar,
    mathWorld: row.math_world,
    completedAt: row.completed_at,
  };
};
