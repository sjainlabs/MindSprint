import { type OperationType } from './operation-concept.model';

export interface OperationPracticeProblem {
  problemId: string;
  prompt: string;
  metadata?: Record<string, unknown>;
  correctAnswer?: string | number;
}

export interface OperationPracticeSession {
  sessionId: string;
  operation: OperationType;
  difficulty: number;
  problems: OperationPracticeProblem[];
}

export interface OperationAnswerInput {
  problemId: string;
  studentAnswer: string;
}

export interface OperationSubmitPayload {
  sessionId: string;
  answers: OperationAnswerInput[];
}
