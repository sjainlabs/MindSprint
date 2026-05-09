import { type Request, type Response } from 'express';
import { getStudentProfile } from './student-profile.service';

export const readStudentProfile = async (request: Request, response: Response): Promise<void> => {
  try {
    const { id } = request.params;
    const profile = await getStudentProfile(id);
    response.json(profile);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : 'Unable to load student profile.',
    });
  }
};
