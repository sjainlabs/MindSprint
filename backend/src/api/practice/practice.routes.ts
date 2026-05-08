import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { generateWorksheet } from './practice.controller';

export const practiceRouter = Router();
const worksheetRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

practiceRouter.post('/worksheet', worksheetRateLimiter, generateWorksheet);
