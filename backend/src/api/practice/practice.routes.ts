import { Router } from 'express';
import { generateWorksheet } from './practice.controller';
import { createRateLimiter } from '../../utils/rate-limit';

export const practiceRouter = Router();
const worksheetRateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 30 });

practiceRouter.post('/worksheet', worksheetRateLimiter, generateWorksheet);
