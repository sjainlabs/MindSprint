import { type Request, type Response } from 'express';
import { getDatabase } from '../../db/database';
import { type LearningLevel } from '../../models/types';
import { createWorksheet } from './practice.service';

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
