import { type Request, type Response } from 'express';
import { getDatabase } from '../../db/database';
import { type LearningLevel, type WorksheetSubmission, type WorksheetResult } from '../../models/types';
import { createWorksheet } from './practice.service';

const VALID_LEVELS: LearningLevel[] = ['Beginner', 'Intermediate', 'Advanced'];

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

    // Persist worksheet asynchronously so the submit endpoint can look it up
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
    const { worksheetId, level, answers } = submission;

    if (!worksheetId || !level || !Array.isArray(answers)) {
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

    const worksheet = JSON.parse(row.payload) as { questions: Array<{ id: string; answer: number }> };
    const answerMap = new Map(answers.map((a) => [a.questionId, a.answer]));

    let correct = 0;
    let attempted = 0;

    const questionResults = worksheet.questions.map((q) => {
      const submittedAnswer = answerMap.has(q.id) ? answerMap.get(q.id)! : null;
      const isCorrect = submittedAnswer !== null && Number(submittedAnswer) === q.answer;

      if (submittedAnswer !== null) attempted++;
      if (isCorrect) correct++;

      return {
        questionId: q.id,
        expectedAnswer: q.answer,
        submittedAnswer,
        isCorrect,
      };
    });

    const totalQuestions = worksheet.questions.length;
    const incorrect = attempted - correct;
    const accuracy = attempted > 0 ? Math.round((correct / totalQuestions) * 100) : 0;

    const result: WorksheetResult = {
      worksheetId,
      level,
      totalQuestions,
      attempted,
      correct,
      incorrect,
      accuracy,
      questionResults,
    };

    response.json(result);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : 'Unable to process submission.',
    });
  }
};
