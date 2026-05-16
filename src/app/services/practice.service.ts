import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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

export interface MapPracticeSheetRequest {
  studentId: string;
  ritBand: number;
  domains: string[];
  questionCount: number;
  includeHints: boolean;
  includeExplanations: boolean;
}

export interface MapPracticeSheetResponse {
  worksheetId: string;
  title: string;
  generatedAt: string;
  questionCount: number;
  domains: string[];
  ritBand: number;
  downloadUrl?: string;
}

interface AiWorksheetPayload {
  topic: string;
  difficulty: number;
  questionCount: number;
  studentId: string;
  domainId?: string;
  skillId?: string;
}

interface AiWorksheetResponse {
  worksheetId?: string;
  downloadUrl?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PracticeService {
  private readonly apiRoot = environment.apiUrl;
  private readonly baseUrl = `${this.apiRoot}/practice`;

  constructor(private readonly http: HttpClient) {}

  getPractice(level: LearningLevel, skillId?: string): Observable<Worksheet> {
    if (!skillId?.trim()) {
      return this.http.get<Worksheet>(`${this.baseUrl}/${level}`);
    }
    const params = new HttpParams().set('skillId', skillId.trim());
    return this.http.get<Worksheet>(`${this.baseUrl}/${level}`, { params });
  }

  submitWorksheet(payload: WorksheetSubmission): Observable<WorksheetResult> {
    return this.http.post<WorksheetResult>(`${this.baseUrl}/submit`, payload);
  }

  generateMapPracticeSheet(payload: MapPracticeSheetRequest): Observable<AiWorksheetResponse> {
    const aiPayload: AiWorksheetPayload = {
      topic: payload.domains?.[0] ?? 'General',
      difficulty: payload.ritBand,
      questionCount: payload.questionCount,
      studentId: payload.studentId,
    };
    return this.http.post<AiWorksheetResponse>(`${this.baseUrl}/worksheet`, aiPayload);
  }
}
