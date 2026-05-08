import { Router } from 'express';
import { startDiagnostic, submitDiagnostic } from './diagnostic.controller';
import { createRateLimiter } from '../../utils/rate-limit';

export const diagnosticRouter = Router();
const submitRateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 30 });

diagnosticRouter.get('/start', startDiagnostic);
diagnosticRouter.post('/submit', submitRateLimiter, submitDiagnostic);
