import { type Request, type Response } from 'express';
import { getOnboardingProfile, saveOnboardingProfile } from './onboarding.service';

export const upsertOnboarding = async (request: Request, response: Response): Promise<void> => {
  try {
    const onboarding = await saveOnboardingProfile({
      studentId: typeof request.body?.studentId === 'string' ? request.body.studentId : undefined,
      age: Number(request.body?.age),
      grade: typeof request.body?.grade === 'number' ? request.body.grade : Number(request.body?.grade),
      goals: request.body?.goals,
      confidenceLevel: request.body?.confidenceLevel,
      placementScore:
        typeof request.body?.placementScore === 'number'
          ? request.body.placementScore
          : Number(request.body?.placementScore),
      avatar: typeof request.body?.avatar === 'string' ? request.body.avatar : undefined,
      mathWorld: typeof request.body?.mathWorld === 'string' ? request.body.mathWorld : undefined,
    });

    response.json(onboarding);
  } catch (error) {
    response.status(400).json({
      message: error instanceof Error ? error.message : 'Unable to save onboarding profile.',
    });
  }
};

export const readOnboarding = async (request: Request, response: Response): Promise<void> => {
  try {
    const studentId = (request.query['studentId'] as string | undefined)?.trim();
    const onboarding = await getOnboardingProfile(studentId);
    if (!onboarding) {
      response.status(404).json({ message: 'Onboarding profile not found.' });
      return;
    }
    response.json(onboarding);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : 'Unable to read onboarding profile.',
    });
  }
};
