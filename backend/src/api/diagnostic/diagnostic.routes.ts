import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { eligibilityDiagnostic, startDiagnostic, submitDiagnostic } from './diagnostic.controller';

export const diagnosticRouter = Router();
const eligibilityRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 90,
  standardHeaders: true,
  legacyHeaders: false,
});
const submitRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

diagnosticRouter.get('/start', startDiagnostic);
diagnosticRouter.get('/eligibility', eligibilityRateLimiter, eligibilityDiagnostic);
diagnosticRouter.post('/submit', submitRateLimiter, submitDiagnostic);
