export interface OperationAnswerResult {
  problemId: string;
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

export interface OperationSubmissionResult {
  sessionId: string;
  totalProblems: number;
  correctCount: number;
  incorrectCount: number;
  scorePercentage: number;
  results: OperationAnswerResult[];
}
