/** The backend's level for a worksheet that spans grades or practice levels; it then skips the grade and level checks. */
export const MIXED_PRACTICE_LEVEL = 'Mixed';

/**
 * The level to ask for: the topics' own level when they share one grade and one level,
 * otherwise Mixed, so any topics can go on one sheet.
 */
export function worksheetLevel(topics: Array<{ cbseGrade?: number; practiceLevel?: string }>): string {
  const levels = new Set(topics.map((t) => t.practiceLevel));
  const grades = new Set(topics.map((t) => t.cbseGrade));
  if (topics.length === 0) return 'Beginner';
  return levels.size === 1 && grades.size === 1 ? topics[0].practiceLevel ?? 'Beginner' : MIXED_PRACTICE_LEVEL;
}
