import { type Request, type Response } from 'express';
import { getNextWorksheetRecommendation } from './adaptive.service';
import { type LearningLevel, type MathOperation } from '../../models/types';

const isLearningLevel = (value: unknown): value is LearningLevel =>
  value === 'Beginner' || value === 'Intermediate' || value === 'Advanced';

export const recommendNextWorksheet = async (request: Request, response: Response): Promise<void> => {
  try {
    const { studentId, currentLevel, recentAccuracy, operationAccuracy } = request.body as {
      studentId?: string;
      currentLevel?: LearningLevel;
      recentAccuracy?: number;
      operationAccuracy?: Partial<Record<MathOperation, number>>;
    };

    if (!studentId || !isLearningLevel(currentLevel) || typeof recentAccuracy !== 'number') {
      response.status(400).json({
        message: 'studentId, currentLevel, and recentAccuracy are required.',
      });
      return;
    }

    const recommendation = await getNextWorksheetRecommendation({
      studentId,
      currentLevel,
      recentAccuracy,
      operationAccuracy,
    });

    response.json(recommendation);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : 'Unable to recommend next worksheet.',
    });
  }
};
