import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { readOnboarding, upsertOnboarding } from './onboarding.controller';

export const onboardingRouter = Router();
const onboardingLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

onboardingRouter.post('/', onboardingLimiter, upsertOnboarding);
onboardingRouter.get('/', onboardingLimiter, readOnboarding);
