import { type Request, type Response } from 'express';
import { getGameChallenge } from './game.service';

export const challenge = async (request: Request, response: Response): Promise<void> => {
  try {
    const studentId = (request.query['studentId'] as string | undefined)?.trim() || 'student-demo';
    const difficultyRaw = request.query['difficulty'];
    const streakRaw = request.query['streak'];
    const dailyQuestRaw = request.query['completedDailyQuestCount'];

    const difficulty =
      typeof difficultyRaw === 'string' && difficultyRaw.length > 0 ? Number(difficultyRaw) : undefined;
    const streak = typeof streakRaw === 'string' && streakRaw.length > 0 ? Number(streakRaw) : undefined;
    const completedDailyQuestCount =
      typeof dailyQuestRaw === 'string' && dailyQuestRaw.length > 0 ? Number(dailyQuestRaw) : undefined;

    const gameChallenge = await getGameChallenge({
      studentId,
      difficulty: Number.isFinite(difficulty) ? difficulty : undefined,
      streak: Number.isFinite(streak) ? streak : undefined,
      completedDailyQuestCount: Number.isFinite(completedDailyQuestCount) ? completedDailyQuestCount : undefined,
    });
    response.json(gameChallenge);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : 'Unable to generate game challenge.',
    });
  }
};
