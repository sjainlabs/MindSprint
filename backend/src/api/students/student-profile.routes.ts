import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { readStudentProfile } from './student-profile.controller';

export const studentProfileRouter = Router();
const profileRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

studentProfileRouter.get('/:id/profile', profileRateLimiter, readStudentProfile);
