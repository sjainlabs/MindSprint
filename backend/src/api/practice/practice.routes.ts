import { Router } from 'express';
import { generateWorksheet } from './practice.controller';

export const practiceRouter = Router();

practiceRouter.post('/worksheet', generateWorksheet);
