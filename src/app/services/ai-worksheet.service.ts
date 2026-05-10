import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type AdvancedQuestionType =
  | 'numeric'
  | 'symbolic'
  | 'multi-step'
  | 'graph-interpretation'
  | 'word-problem'
  | 'proof-style'
  | 'function-analysis'
  | 'trig-identity';

export interface AiWorksheetRequest {
  topic: string;
  difficulty: number;
  questionTypes?: AdvancedQuestionType[];
  questionCount?: number;
  studentId?: string;
}

export interface AiWorksheet {
  worksheetId: string;
  topic: string;
  difficulty: number;
  generatedAt: string;
  questionTypes: string[];
  questions: Array<{
    id: string;
    type: string;
    topic: string;
    subtopic: string;
    prompt: string;
    answer: string;
    difficulty: number;
    hints: string[];
  }>;
  validation: {
    allQuestionsHaveAnswers: boolean;
    hasSupportedQuestionTypes: boolean;
    topicSupported: boolean;
  };
}

@Injectable({
  providedIn: 'root',
})
export class AiWorksheetService {
  private readonly isLocalhost =
    typeof window !== 'undefined' && ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  private readonly apiRoot = this.isLocalhost ? 'http://localhost:3001/api' : '/api';

  constructor(private readonly http: HttpClient) {}

  generateWorksheet(payload: AiWorksheetRequest): Observable<AiWorksheet> {
    return this.http.post<AiWorksheet>(`${this.apiRoot}/ai/worksheet`, payload);
  }
}
