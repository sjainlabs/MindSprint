import { Router } from 'express';
import { startDiagnostic, submitDiagnostic } from './diagnostic.controller';

export const diagnosticRouter = Router();

diagnosticRouter.get('/start', startDiagnostic);
diagnosticRouter.post('/submit', submitDiagnostic);
