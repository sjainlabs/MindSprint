import express from 'express';
import cors from 'cors';
import { diagnosticRouter } from './api/diagnostic/diagnostic.routes';
import { practiceRouter } from './api/practice/practice.routes';

export const app = express();

const allowedOrigins = [
  'http://localhost:4200',
  'http://127.0.0.1:4200',
  ...(process.env['FRONTEND_ORIGIN'] ? [process.env['FRONTEND_ORIGIN']] : []),
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. server-to-server, curl)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin '${origin}' not allowed`));
      }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  }),
);
app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.use('/api/diagnostic', diagnosticRouter);
app.use('/api/practice', practiceRouter);
