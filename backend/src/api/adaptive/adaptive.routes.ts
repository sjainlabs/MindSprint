import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { recommendNextWorksheet } from './adaptive.controller';

export const adaptiveRouter = Router();
const recommendationLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

adaptiveRouter.post('/next-worksheet', recommendationLimiter, recommendNextWorksheet);
