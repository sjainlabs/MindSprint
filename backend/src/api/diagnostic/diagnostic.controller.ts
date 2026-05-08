import { type Request, type Response } from 'express';
import { getDatabase } from '../../db/database';
import { createDiagnosticTest, scoreDiagnosticSubmission } from './diagnostic.service';

export const startDiagnostic = (_request: Request, response: Response): void => {
  const test = createDiagnosticTest();
  response.json(test);
};

export const submitDiagnostic = async (request: Request, response: Response): Promise<void> => {
  try {
    const result = scoreDiagnosticSubmission(request.body);

    const db = await getDatabase();

    await db.run(
      `INSERT INTO diagnostic_attempts (test_id, level, final_score, accuracy_score, speed_score, payload, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        request.body.testId,
        result.level,
        result.score.finalScore,
        result.score.accuracyScore,
        result.score.speedScore,
        JSON.stringify(result),
        new Date().toISOString(),
      ],
    );

    response.json(result);
  } catch (error) {
    response.status(400).json({
      message: error instanceof Error ? error.message : 'Unable to score diagnostic submission.',
    });
  }
};
