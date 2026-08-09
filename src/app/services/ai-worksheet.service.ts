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

export interface AiWorksheetQuestion {
  id: string;
  type: AdvancedQuestionType;
  topic: string;
  subtopic: string;
  prompt: string;
  answer?: string;
  difficulty: number;
  hints: string[];
  metadata?: any;


}

export interface AiWorksheet {
  worksheetId: string;
  topicId: string;
  skills: string[];
  difficulty: number;
  questions: AiWorksheetQuestion[];
  questionTypes?: AdvancedQuestionType[];
  generatedAt: string;
  validation: {
    allQuestionsHaveAnswers: boolean
    hasSupportedQuestionTypes: boolean
    topicSupported: boolean
  }
}

export interface AiWorksheetRequest {
  questionCount: number;
  studentId: string;
  topicId: string;
  skills: string[];
  difficulty: number;
  subtopics?: string[];
  questionTypes?: AdvancedQuestionType[];
}

export interface AiWorksheetSubmission {
  studentId: string;
  worksheetId: string;
  answers: Record<string, string>;
}

@Injectable({
  providedIn: 'root',
})
export class AiWorksheetService {
  private readonly apiRoot = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  /** ⭐ Generate worksheet using modular topic + modular skills */
  generateWorksheet(request: AiWorksheetRequest): Observable<AiWorksheet> {
    return this.http.post<AiWorksheet>(`${this.apiRoot}/ai/worksheet/generate`, request);
  }

  /** ⭐ Submit worksheet answers (must be Record<string,string>) */
  submitWorksheet(payload: AiWorksheetSubmission): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(
      `${this.apiRoot}/ai/worksheet/submit`,
      payload,
    );
  }
}
