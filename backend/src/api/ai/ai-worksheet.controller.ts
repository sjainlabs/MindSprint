import { type Request, type Response } from 'express';
import { generateAiWorksheet } from './ai-worksheet.service';
import { type AdvancedQuestionType } from '../../models/types';

const parseQuestionTypes = (value: unknown): AdvancedQuestionType[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.filter((entry): entry is AdvancedQuestionType => typeof entry === 'string') as AdvancedQuestionType[];
};

export const createAiWorksheet = (request: Request, response: Response): void => {
  try {
    const topic = typeof request.body?.topic === 'string' ? request.body.topic : '';
    const difficulty =
      typeof request.body?.difficulty === 'number'
        ? request.body.difficulty
        : Number(request.body?.difficulty ?? Number.NaN);

    if (!topic || !Number.isFinite(difficulty)) {
      response.status(400).json({ message: 'topic and numeric difficulty are required.' });
      return;
    }

    const worksheet = generateAiWorksheet({
      topic,
      difficulty,
      questionTypes: parseQuestionTypes(request.body?.questionTypes),
      questionCount:
        typeof request.body?.questionCount === 'number' ? request.body.questionCount : undefined,
      studentId: typeof request.body?.studentId === 'string' ? request.body.studentId : undefined,
    });

    response.json(worksheet);
  } catch (error) {
    response.status(400).json({
      message: error instanceof Error ? error.message : 'Unable to generate AI worksheet.',
    });
  }
};

