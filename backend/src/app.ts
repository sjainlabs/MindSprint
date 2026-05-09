import express from 'express';
import cors from 'cors';
import { adaptiveRouter } from './api/adaptive/adaptive.routes';
import { analyticsRouter } from './api/analytics/analytics.routes';
import { diagnosticRouter } from './api/diagnostic/diagnostic.routes';
import { practiceRouter } from './api/practice/practice.routes';
import { studentProfileRouter } from './api/students/student-profile.routes';

export const app = express();

const allowedOrigins = [
  'http://localhost:4200',
  'http://127.0.0.1:4200',
];

const frontendOrigin = process.env['FRONTEND_ORIGIN'];
if (frontendOrigin && /^https?:\/\/.+/.test(frontendOrigin)) {
  allowedOrigins.push(frontendOrigin);
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin '${origin}' not allowed`));
      }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.use('/api/diagnostic', diagnosticRouter);
app.use('/api/practice', practiceRouter);
app.use('/api/students', studentProfileRouter);
app.use('/api/adaptive', adaptiveRouter);
app.use('/api/analytics', analyticsRouter);
