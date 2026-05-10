import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { challenge } from './game.controller';

export const gameRouter = Router();
const gameRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 90,
  standardHeaders: true,
  legacyHeaders: false,
});

gameRouter.get('/challenge', gameRateLimiter, challenge);
