import { type Request, type Response } from 'express';
import { getTopicDifficultyMapping, getTopicTaxonomy, getTopicsByGrade } from './topic.service';

const parseGrade = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : null;
  }
  return null;
};

export const readTopicTaxonomy = (_request: Request, response: Response): void => {
  response.json({
    topics: getTopicTaxonomy(),
    difficultyMapping: getTopicDifficultyMapping(),
  });
};

export const readTopicsByGrade = (request: Request, response: Response): void => {
  const grade = parseGrade(request.query['grade']);
  if (grade === null || grade < 0 || grade > 12) {
    response.status(400).json({ message: 'grade query param must be an integer between 0 and 12.' });
    return;
  }

  response.json({
    grade,
    topics: getTopicsByGrade(grade as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12),
  });
};

