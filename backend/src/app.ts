import express from 'express';
import cors from 'cors';
import { adaptiveRouter } from './api/adaptive/adaptive.routes';
import { analyticsRouter } from './api/analytics/analytics.routes';
import { diagnosticRouter } from './api/diagnostic/diagnostic.routes';
import { practiceRouter } from './api/practice/practice.routes';
import { studentProfileRouter } from './api/students/student-profile.routes';
import { gameRouter } from './api/game/game.routes';
import { topicRouter } from './api/topics/topic.routes';
import { aiWorksheetRouter } from './api/ai/ai-worksheet.routes';
import { onboardingRouter } from './api/onboarding/onboarding.routes';

export const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.use('/api/diagnostic', diagnosticRouter);
app.use('/api/practice', practiceRouter);
app.use('/api/students', studentProfileRouter);
app.use('/api/adaptive', adaptiveRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/game', gameRouter);
app.use('/api/topics', topicRouter);
app.use('/api/ai', aiWorksheetRouter);
app.use('/api/onboarding', onboardingRouter);
