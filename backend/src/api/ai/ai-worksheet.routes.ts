import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { createAiWorksheet } from './ai-worksheet.controller';

export const aiWorksheetRouter = Router();
const aiWorksheetLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

aiWorksheetRouter.post('/worksheet', aiWorksheetLimiter, createAiWorksheet);
