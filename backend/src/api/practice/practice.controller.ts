import { type Request, type Response } from 'express';
import { getDatabase } from '../../db/database';
import { type LearningLevel, type WorksheetSubmission, type WorksheetResult } from '../../models/types';
import { recordAnalyticsEvents, buildAnalyticsEvents } from '../analytics/analytics.service';
import { updateStudentProfileAfterWorksheet } from '../students/student-profile.service';
import { createWorksheet } from './practice.service';

const VALID_LEVELS: LearningLevel[] = ['Beginner', 'Intermediate', 'Advanced'];
const DEFAULT_STUDENT_ID = 'student-demo';

const calculateDurationSeconds = (startedAt: string | undefined, submittedAt: string): number => {
  const submittedTime = new Date(submittedAt).getTime();
  const startedTime = startedAt ? new Date(startedAt).getTime() : Number.NaN;

  if (Number.isNaN(submittedTime) || Number.isNaN(startedTime)) {
    return 0;
  }

  return Math.max(0, Math.round((submittedTime - startedTime) / 1000));
};

export const getPracticeQuestions = (request: Request, response: Response): void => {
  const { level } = request.params;

  if (!VALID_LEVELS.includes(level as LearningLevel)) {
    response.status(400).json({
      message: `Invalid level '${level}'. Must be one of: Beginner, Intermediate, Advanced.`,
    });
    return;
  }

  try {
    const worksheet = createWorksheet(level as LearningLevel);

    void (async () => {
      try {
        const db = await getDatabase();
        await db.run(
          `INSERT INTO worksheets (worksheet_id, level, payload, created_at) VALUES (?, ?, ?, ?)`,
          [worksheet.worksheetId, worksheet.level, JSON.stringify(worksheet), worksheet.generatedAt],
        );
      } catch {
        // Non-blocking: worksheet generation succeeds even if DB storage fails
      }
    })();

    response.json(worksheet);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : 'Unable to generate questions.',
    });
  }
};

export const generateWorksheet = async (request: Request, response: Response): Promise<void> => {
  try {
    const level = request.body.level as LearningLevel;
    const worksheet = createWorksheet(level);

    const db = await getDatabase();
    await db.run(
      `INSERT INTO worksheets (worksheet_id, level, payload, created_at) VALUES (?, ?, ?, ?)`,
      [worksheet.worksheetId, worksheet.level, JSON.stringify(worksheet), worksheet.generatedAt],
    );

    response.json(worksheet);
  } catch (error) {
    response.status(400).json({
      message: error instanceof Error ? error.message : 'Unable to generate worksheet.',
    });
  }
};

export const submitWorksheet = async (request: Request, response: Response): Promise<void> => {
  try {
    const submission = request.body as WorksheetSubmission;
    const { worksheetId, level, answers, submittedAt } = submission;

    if (!worksheetId || !level || !submittedAt || !Array.isArray(answers)) {
      response.status(400).json({ message: 'Invalid submission payload.' });
      return;
    }

    const db = await getDatabase();
    const row = await db.get<{ payload: string }>(
      `SELECT payload FROM worksheets WHERE worksheet_id = ?`,
      [worksheetId],
    );

    if (!row) {
      response.status(404).json({ message: `Worksheet '${worksheetId}' not found.` });
      return;
    }

    const worksheet = JSON.parse(row.payload) as {
      questions: Array<{ id: string; answer: number; operation: 'addition' | 'subtraction' | 'multiplication' | 'division' }>;
    };
    const answerMap = new Map(answers.map((answer) => [answer.questionId, answer.answer]));

    let correct = 0;
    let attempted = 0;

    const questionResults = worksheet.questions.map((question) => {
      const submittedAnswer = answerMap.has(question.id) ? answerMap.get(question.id)! : null;
      const isCorrect = submittedAnswer !== null && Number(submittedAnswer) === question.answer;

      if (submittedAnswer !== null) {
        attempted += 1;
      }
      if (isCorrect) {
        correct += 1;
      }

      return {
        questionId: question.id,
        operation: question.operation,
        expectedAnswer: question.answer,
        submittedAnswer,
        isCorrect,
      };
    });

    const totalQuestions = worksheet.questions.length;
    const incorrect = attempted - correct;
    const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
    const studentId = submission.studentId ?? DEFAULT_STUDENT_ID;
    const totalDurationSeconds = calculateDurationSeconds(submission.startedAt, submittedAt);

    const result: WorksheetResult = {
      worksheetId,
      studentId,
      level,
      totalQuestions,
      attempted,
      correct,
      incorrect,
      accuracy,
      totalDurationSeconds,
      questionResults,
    };

    const updatedProfile = await updateStudentProfileAfterWorksheet(studentId, result, submittedAt);
    const analyticsEvents = buildAnalyticsEvents(studentId, result, updatedProfile, submittedAt);
    await recordAnalyticsEvents(analyticsEvents);

    response.json(result);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : 'Unable to process submission.',
    });
  }
};
