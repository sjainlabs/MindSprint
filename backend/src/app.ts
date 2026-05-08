import express from 'express';
import cors from 'cors';
import { diagnosticRouter } from './api/diagnostic/diagnostic.routes';
import { practiceRouter } from './api/practice/practice.routes';

export const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.use('/api/diagnostic', diagnosticRouter);
app.use('/api/practice', practiceRouter);
