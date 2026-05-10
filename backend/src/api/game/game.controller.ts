import { type Request, type Response } from 'express';
import { getGameChallenge, submitGameResult } from './game.service';
import { type GameMode } from '../../models/types';

const isGameMode = (value: unknown): value is GameMode =>
  value === 'abacus-flash' || value === 'falling-numbers' || value === 'boss-battle' || value === 'ai-puzzle';

export const challenge = async (request: Request, response: Response): Promise<void> => {
  try {
    const studentId = (request.query['studentId'] as string | undefined)?.trim() || 'student-demo';
    const difficultyRaw = request.query['difficulty'];
    const streakRaw = request.query['streak'];
    const dailyQuestRaw = request.query['completedDailyQuestCount'];
    const modeRaw = request.query['mode'];

    const difficulty =
      typeof difficultyRaw === 'string' && difficultyRaw.length > 0 ? Number(difficultyRaw) : undefined;
    const streak = typeof streakRaw === 'string' && streakRaw.length > 0 ? Number(streakRaw) : undefined;
    const completedDailyQuestCount =
      typeof dailyQuestRaw === 'string' && dailyQuestRaw.length > 0 ? Number(dailyQuestRaw) : undefined;
    const mode = typeof modeRaw === 'string' && isGameMode(modeRaw) ? modeRaw : undefined;

    const gameChallenge = await getGameChallenge({
      studentId,
      mode,
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

export const submitChallenge = async (request: Request, response: Response): Promise<void> => {
  try {
    const studentId = typeof request.body?.studentId === 'string' ? request.body.studentId.trim() : 'student-demo';
    const mode = request.body?.mode;
    const score = typeof request.body?.score === 'number' ? request.body.score : Number(request.body?.score);
    const accuracy = typeof request.body?.accuracy === 'number' ? request.body.accuracy : Number(request.body?.accuracy);
    const streak = typeof request.body?.streak === 'number' ? request.body.streak : Number(request.body?.streak);

    if (!isGameMode(mode) || !Number.isFinite(score) || !Number.isFinite(accuracy) || !Number.isFinite(streak)) {
      response.status(400).json({ message: 'studentId, mode, score, accuracy, and streak are required.' });
      return;
    }

    const result = await submitGameResult({
      studentId,
      mode,
      score,
      accuracy,
      streak,
    });

    response.json(result);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : 'Unable to submit game result.',
    });
  }
};
