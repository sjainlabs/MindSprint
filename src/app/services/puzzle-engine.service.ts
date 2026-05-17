import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type PuzzleType =
  | 'pattern'
  | 'missing-number'
  | 'sequence'
  | 'comparison'
  | 'arithmetic'
  | 'logic';

export type PuzzleInputType = 'numeric' | 'text' | 'mcq';

export interface PuzzleMetadata {
  inputType?: PuzzleInputType;
  blanks?: number;
  numberOfBlanks?: number;
  layout?: 'inline' | 'grid';
  skillId?: string;
}

export interface DynamicPuzzle {
  puzzleId: string;
  type: PuzzleType;
  prompt: string;
  options?: string[];
  metadata?: PuzzleMetadata;
  correctAnswer?: string | string[];
}

export interface GeneratePuzzlesPayload {
  studentId: string;
  difficulty?: number;
  sessionId?: string;
}

export interface GeneratePuzzlesResponse {
  sessionId?: string;
  difficulty?: number;
  puzzles?: DynamicPuzzle[];
}

export interface PuzzleSubmitResult {
  puzzleId: string;
  correct: boolean;
  correctAnswer?: string | string[];
  skillId?: string;
}

export interface SubmitPuzzleAnswersResponse {
  difficulty?: number;
  results?: PuzzleSubmitResult[];
}

@Injectable({
  providedIn: 'root',
})
export class PuzzleEngineService {
  private readonly apiRoot = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  generatePuzzles(payload: GeneratePuzzlesPayload): Observable<GeneratePuzzlesResponse> {
    return this.http.post<GeneratePuzzlesResponse>(`${this.apiRoot}/puzzles/generate`, payload);
  }

  submitPuzzleAnswers(
    sessionId: string,
    answers: Record<string, string | string[]>,
  ): Observable<SubmitPuzzleAnswersResponse> {
    return this.http.post<SubmitPuzzleAnswersResponse>(`${this.apiRoot}/puzzles/submit`, {
      sessionId,
      answers,
    });
  }
}
