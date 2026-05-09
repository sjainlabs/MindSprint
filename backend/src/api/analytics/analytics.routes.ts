import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { readStudentAnalytics } from './analytics.controller';

export const analyticsRouter = Router();
const analyticsRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

analyticsRouter.get('/student/:id', analyticsRateLimiter, readStudentAnalytics);
