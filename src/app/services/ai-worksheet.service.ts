import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

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
  downloadUrl?: string;
  questionTypes: string[];
  questions: Array<{
    id?: string;
    questionId?: string;
    type: string;
    topic: string;
    subtopic: string;
    prompt: string;
    questionText?: string;
    answer: string;
    difficulty: number;
    hints?: string[];
    metadata?: {
      topic?: string;
      subtopic?: string;
      type?: string;
      hints?: string[];
    };
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
  private readonly apiRoot = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  generateWorksheet(payload: AiWorksheetRequest): Observable<AiWorksheet> {
    return this.http.post<AiWorksheet>(`${this.apiRoot}/ai/worksheet`, payload);
  }
}
