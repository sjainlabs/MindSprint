import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { type LearningLevel } from './diagnostic.service';
import { type MathOperation } from './student-intelligence.service';

export interface WorksheetQuestion {
  id: string;
  operation: MathOperation;
  prompt: string;
  answer: number | string;
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
  answer: number | string | null;
}

export interface WorksheetSubmission {
  worksheetId: string;
  studentId?: string;
  level: LearningLevel;
  startedAt?: string;
  submittedAt: string;
  answers: WorksheetAnswerInput[];
}

export interface WorksheetRequest {
  level: LearningLevel;
  skillId?: string;
  studentId?: string;
}

export interface WorksheetQuestionResult {
  questionId: string;
  operation: MathOperation;
  expectedAnswer: number | string;
  submittedAnswer: number | string | null;
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


interface AiWorksheetResponse {
  worksheetId?: string;
  downloadUrl?: string;
}

interface GameMapPracticeSheetPayload {
  gradeLevel: 1 | 2 | 3;
  domain: string;
  questionCount: number;
  studentId: string;
}

interface GameMapPracticeSheetResponse {
  sheetId?: string;
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

  private toMapGradeLevel(ritBand: number): 1 | 2 | 3 {
    if (ritBand <= 200) return 1;
    if (ritBand <= 230) return 2;
    return 3;
  }

  private toMapDomain(domain: string | undefined): string {
    const normalized = (domain ?? '').trim().toLowerCase();
    if (!normalized) return 'Operations & Algebraic Thinking';
    if (normalized.includes('numbers')) return 'Number Sense';
    if (normalized.includes('algebra')) return 'Operations & Algebraic Thinking';
    if (normalized.includes('fraction')) return 'Fractions';
    if (normalized.includes('data')) return 'Measurement & Data';
    if (normalized.includes('measurement')) return 'Measurement & Data';
    if (normalized.includes('geometry')) return 'Geometry';
    if (normalized.includes('graph') || normalized.includes('table')) return 'Graphs & Tables';
    if (normalized.includes('word')) return 'Word Problems';
    return 'Operations & Algebraic Thinking';
  }

  getPractice(level: LearningLevel, skillId?: string, studentId?: string): Observable<Worksheet> {
    if (!skillId?.trim()) {
      return this.http.get<Worksheet>(`${this.baseUrl}/${level}`);
    }

    const payload: WorksheetRequest = {
      level,
      skillId: skillId.trim(),
      studentId: studentId?.trim() || undefined,
    };

    return this.http.post<Worksheet>(`${this.baseUrl}/worksheet`, payload);
  }

  submitWorksheet(payload: WorksheetSubmission): Observable<WorksheetResult> {
    return this.http.post<WorksheetResult>(`${this.baseUrl}/submit`, payload);
  }

  generateMapPracticeSheet(payload: MapPracticeSheetRequest): Observable<AiWorksheetResponse> {
    const requestPayload: GameMapPracticeSheetPayload = {
      studentId: payload.studentId,
      gradeLevel: this.toMapGradeLevel(payload.ritBand),
      domain: this.toMapDomain(payload.domains?.[0]),
      questionCount: payload.questionCount,
    };
    return this.http
      .post<GameMapPracticeSheetResponse>(`${this.apiRoot}/game/map/practice-sheet`, requestPayload)
      .pipe(
        map((response) => ({
          worksheetId: response.worksheetId ?? response.sheetId,
          downloadUrl: response.downloadUrl,
        })),
      );
  }
}
