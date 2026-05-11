import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { type LearningLevel } from './diagnostic.service';
import { type MathOperation } from './student-intelligence.service';

export interface WorksheetQuestion {
  id: string;
  operation: MathOperation;
  prompt: string;
  answer: number;
}

export interface Worksheet {
  worksheetId: string;
  level: LearningLevel;
  title: string;
  instructions: string;
  generatedAt: string;
  questions: WorksheetQuestion[];
}

export interface WorksheetAnswerInput {
  questionId: string;
  answer: number | null;
}

export interface WorksheetSubmission {
  worksheetId: string;
  studentId?: string;
  level: LearningLevel;
  startedAt?: string;
  submittedAt: string;
  answers: WorksheetAnswerInput[];
}

export interface WorksheetQuestionResult {
  questionId: string;
  operation: MathOperation;
  expectedAnswer: number;
  submittedAnswer: number | null;
  isCorrect: boolean;
}

export interface WorksheetResult {
  worksheetId: string;
  studentId?: string;
  level: LearningLevel;
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  totalDurationSeconds: number;
  questionResults: WorksheetQuestionResult[];
}

@Injectable({
  providedIn: 'root',
})
export class PracticeService {
  private readonly apiRoot = environment.apiUrl;
  private readonly baseUrl = `${this.apiRoot}/practice`;

  constructor(private readonly http: HttpClient) {}

  getPractice(level: LearningLevel): Observable<Worksheet> {
    return this.http.get<Worksheet>(`${this.baseUrl}/${level}`);
  }

  submitWorksheet(payload: WorksheetSubmission): Observable<WorksheetResult> {
    return this.http.post<WorksheetResult>(`${this.baseUrl}/submit`, payload);
  }
}
