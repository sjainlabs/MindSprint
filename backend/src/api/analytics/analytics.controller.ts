import { type Request, type Response } from 'express';
import { getStudentAnalytics } from './analytics.service';

export const readStudentAnalytics = async (request: Request, response: Response): Promise<void> => {
  try {
    const { id } = request.params;
    const analytics = await getStudentAnalytics(id);
    response.json(analytics);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : 'Unable to load student analytics.',
    });
  }
};
