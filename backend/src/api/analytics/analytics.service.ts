import { getDatabase } from '../../db/database';
import {
  type AnalyticsEvent,
  type MathOperation,
  type SkillBreakdown,
  type StudentAnalytics,
  type StudentProfile,
  type WorksheetResult,
} from '../../models/types';
import { getStudentProfile } from '../students/student-profile.service';

const OPERATIONS: MathOperation[] = ['addition', 'subtraction', 'multiplication', 'division'];

type AnalyticsRow = {
  event_id: string;
  student_id: string;
  worksheet_id: string;
  event_type: 'worksheet_completed';
  operation: MathOperation | 'overall';
  topic_id: string | null;
  accuracy: number;
  duration_seconds: number;
  mastery_after: number;
  payload: string;
  created_at: string;
};

const toAnalyticsEvent = (row: AnalyticsRow): AnalyticsEvent => ({
  eventId: row.event_id,
  studentId: row.student_id,
  worksheetId: row.worksheet_id,
  eventType: row.event_type,
  operation: row.operation,
  topicId: row.topic_id ?? undefined,
  accuracy: row.accuracy,
  durationSeconds: row.duration_seconds,
  masteryAfter: row.mastery_after,
  payload: JSON.parse(row.payload) as Record<string, unknown>,
  createdAt: row.created_at,
});

const round = (value: number): number => Math.round(value * 100) / 100;

export const buildAnalyticsEvents = (
  studentId: string,
  result: WorksheetResult,
  profile: StudentProfile,
  submittedAt: string,
): AnalyticsEvent[] => {
  const topicId =
    result.level === 'Beginner' ? 'foundation' : result.level === 'Intermediate' ? 'elementary' : 'pre-algebra';
  const events: AnalyticsEvent[] = [
    {
      eventId: `${result.worksheetId}-overall`,
      studentId,
      worksheetId: result.worksheetId,
      eventType: 'worksheet_completed',
      operation: 'overall',
      topicId,
      accuracy: result.accuracy,
      durationSeconds: result.totalDurationSeconds,
      masteryAfter: round(
        OPERATIONS.reduce((sum, operation) => sum + profile.masteryLevels[operation], 0) / OPERATIONS.length,
      ),
      payload: {
        attempted: result.attempted,
        correct: result.correct,
        totalQuestions: result.totalQuestions,
      },
      createdAt: submittedAt,
    },
  ];

  const operationGroups = OPERATIONS.reduce<Record<MathOperation, Array<WorksheetResult['questionResults'][number]>>>(
    (accumulator, operation) => {
      accumulator[operation] = result.questionResults.filter((questionResult) => questionResult.operation === operation);
      return accumulator;
    },
    {
      addition: [],
      subtraction: [],
      multiplication: [],
      division: [],
    },
  );

  for (const operation of OPERATIONS) {
    const questionResults = operationGroups[operation].filter((questionResult) => questionResult.submittedAnswer !== null);
    if (questionResults.length === 0) {
      continue;
    }

    const correct = questionResults.filter((questionResult) => questionResult.isCorrect).length;
    const accuracy = Math.round((correct / questionResults.length) * 100);
    // Until per-question timing is captured, apportion worksheet duration across attempted questions.
    const durationSeconds = round((result.totalDurationSeconds / Math.max(result.attempted, 1)) * questionResults.length);

    events.push({
      eventId: `${result.worksheetId}-${operation}`,
      studentId,
      worksheetId: result.worksheetId,
      eventType: 'worksheet_completed',
      operation,
      topicId,
      accuracy,
      durationSeconds,
      masteryAfter: profile.masteryLevels[operation],
      payload: {
        attempted: questionResults.length,
        correct,
      },
      createdAt: submittedAt,
    });
  }

  return events;
};

export const recordAnalyticsEvents = async (events: AnalyticsEvent[]): Promise<void> => {
  if (events.length === 0) {
    return;
  }

  const db = await getDatabase();
  await Promise.all(
    events.map((event) =>
      db.run(
        `INSERT INTO analytics_events (
          event_id, student_id, worksheet_id, event_type, operation, topic_id, accuracy, duration_seconds, mastery_after, payload, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          event.eventId,
          event.studentId,
          event.worksheetId,
          event.eventType,
          event.operation,
          event.topicId ?? null,
          event.accuracy,
          event.durationSeconds,
          event.masteryAfter,
          JSON.stringify(event.payload),
          event.createdAt,
        ],
      ),
    ),
  );
};

const buildRecommendedNextSteps = (profile: StudentProfile, skillBreakdown: SkillBreakdown[]): string[] => {
  const weakestSkills = skillBreakdown
    .slice()
    .sort((left, right) => left.mastery - right.mastery || left.averageAccuracy - right.averageAccuracy)
    .slice(0, 2);

  if (weakestSkills.length === 0) {
    return ['Keep practicing a balanced mix of operations to maintain mastery.'];
  }

  return weakestSkills.map(
    (skill) => `Focus on ${skill.operation} practice to lift mastery from ${skill.mastery}% toward the next level.`,
  ).concat(
    profile.level < profile.learningPathLevel
      ? 'Continue streak-building practice sessions to catch up to the learning path target.'
      : 'Progress is on track; a slightly harder worksheet is recommended next.',
  );
};

export const getStudentAnalytics = async (studentId: string): Promise<StudentAnalytics> => {
  const db = await getDatabase();
  const profile = await getStudentProfile(studentId);
  const rows = await db.all<AnalyticsRow[]>(
    `SELECT event_id, student_id, worksheet_id, event_type, operation, accuracy, duration_seconds, mastery_after, payload, created_at
     SELECT event_id, student_id, worksheet_id, event_type, operation, topic_id, accuracy, duration_seconds, mastery_after, payload, created_at
     FROM analytics_events WHERE student_id = ? ORDER BY created_at ASC`,
    [studentId],
  );
  const events = rows.map(toAnalyticsEvent);
  const overallEvents = events.filter((event) => event.operation === 'overall');

  const operationMastery = OPERATIONS.map<SkillBreakdown>((operation) => {
    const operationEvents = events.filter((event) => event.operation === operation);
    const attempts = operationEvents.reduce((sum, event) => {
      const attempted = event.payload['attempted'];
      return sum + (typeof attempted === 'number' ? attempted : 0);
    }, 0);
    const averageAccuracy = operationEvents.length
      ? round(operationEvents.reduce((sum, event) => sum + event.accuracy, 0) / operationEvents.length)
      : 0;
    const totalTimeSeconds = round(
      operationEvents.reduce((sum, event) => sum + event.durationSeconds, 0),
    );

    return {
      operation,
      mastery: profile.masteryLevels[operation],
      averageAccuracy,
      attempts,
      totalTimeSeconds,
    };
  });

  return {
    studentId,
    accuracyOverTime: overallEvents.map((event) => ({
      worksheetId: event.worksheetId,
      accuracy: event.accuracy,
      createdAt: event.createdAt,
    })),
    operationMastery,
    topicAnalytics: [...new Set(events.map((event) => event.topicId).filter((topicId): topicId is string => Boolean(topicId)))]
      .map((topicId) => {
        const topicEvents = events.filter((event) => event.topicId === topicId && event.operation === 'overall');
        return {
          topicId,
          averageAccuracy: topicEvents.length
            ? round(topicEvents.reduce((sum, event) => sum + event.accuracy, 0) / topicEvents.length)
            : 0,
          attempts: topicEvents.length,
        };
      })
      .sort((left, right) => right.averageAccuracy - left.averageAccuracy),
    averageTimePerWorksheet: overallEvents.length
      ? round(overallEvents.reduce((sum, event) => sum + event.durationSeconds, 0) / overallEvents.length)
      : 0,
    totalWorksheets: overallEvents.length,
    recommendedNextSteps: buildRecommendedNextSteps(profile, operationMastery),
  };
};
