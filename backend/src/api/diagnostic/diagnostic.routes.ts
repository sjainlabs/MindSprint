import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { startDiagnostic, submitDiagnostic } from './diagnostic.controller';

export const diagnosticRouter = Router();
const submitRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

diagnosticRouter.get('/start', startDiagnostic);
diagnosticRouter.post('/submit', submitRateLimiter, submitDiagnostic);
