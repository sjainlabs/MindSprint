import { type Request, type Response } from 'express';
import { createDiagnosticTest, scoreDiagnosticSubmission } from './diagnostic.service';

export const startDiagnostic = (_request: Request, response: Response): void => {
  const test = createDiagnosticTest();
  response.json(test);
};

export const submitDiagnostic = (request: Request, response: Response): void => {
  try {
    const result = scoreDiagnosticSubmission(request.body);
    response.json(result);
  } catch (error) {
    response.status(400).json({
      message: error instanceof Error ? error.message : 'Unable to score diagnostic submission.',
    });
  }
};
