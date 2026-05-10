import { type Request, type Response } from 'express';
import {
  buildExplorationRecommendation,
  buildPersonalizedLearningPath,
  buildTopicBrowser,
  getTopicDifficultyMapping,
  getTopicTaxonomy,
  getTopicsByGrade,
} from './topic.service';
import { getStudentProfile } from '../students/student-profile.service';

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

export const readPersonalizedPath = async (request: Request, response: Response): Promise<void> => {
  try {
    const studentId = (request.query['studentId'] as string | undefined)?.trim() || 'student-demo';
    const profile = await getStudentProfile(studentId);
    response.json({
      studentId,
      personalizedPath: buildPersonalizedLearningPath(profile),
    });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : 'Unable to build personalized path.',
    });
  }
};

export const readTopicBrowser = async (request: Request, response: Response): Promise<void> => {
  try {
    const studentId = (request.query['studentId'] as string | undefined)?.trim() || 'student-demo';
    const profile = await getStudentProfile(studentId);
    response.json({
      studentId,
      browseTopics: buildTopicBrowser(profile),
    });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : 'Unable to load topic browser.',
    });
  }
};

export const readExplorationRecommendation = async (request: Request, response: Response): Promise<void> => {
  try {
    const studentId = (request.query['studentId'] as string | undefined)?.trim() || 'student-demo';
    const requestedTopicId = (request.query['topicId'] as string | undefined)?.trim() || 'foundation';
    const profile = await getStudentProfile(studentId);
    response.json(buildExplorationRecommendation(profile, requestedTopicId));
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : 'Unable to load exploration recommendation.',
    });
  }
};
