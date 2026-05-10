import { type Request, type Response } from 'express';
import {
  createDiagnosticTest,
  getDiagnosticEligibility,
  scoreAndPersistDiagnosticSubmission,
} from './diagnostic.service';

const parseNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const startDiagnostic = (_request: Request, response: Response): void => {
  const test = createDiagnosticTest();
  response.json(test);
};

export const eligibilityDiagnostic = async (request: Request, response: Response): Promise<void> => {
  try {
    const age = parseNumber(request.query['age']);
    const grade = parseNumber(request.query['grade']);
    const studentId = (request.query['studentId'] as string | undefined)?.trim() || 'student-demo';

    if (age === null || grade === null) {
      response.status(400).json({ message: 'age and grade query params are required.' });
      return;
    }

    const eligibility = await getDiagnosticEligibility({ studentId, age, grade });
    response.json(eligibility);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : 'Unable to calculate diagnostic eligibility.',
    });
  }
};

export const submitDiagnostic = async (request: Request, response: Response): Promise<void> => {
  try {
    const age = parseNumber(request.body?.age);
    const grade = parseNumber(request.body?.grade);
    const studentId = typeof request.body?.studentId === 'string' ? request.body.studentId : undefined;
    const result = await scoreAndPersistDiagnosticSubmission(request.body, { studentId, age: age ?? undefined, grade: grade ?? undefined });
    response.json(result);
  } catch (error) {
    response.status(400).json({
      message: error instanceof Error ? error.message : 'Unable to score diagnostic submission.',
    });
  }
};
