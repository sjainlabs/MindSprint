import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { TestApiError, toTestApiError } from './test-api-error';

/* ---------------- Types (mirror /api/placement) ---------------- */

export type SelfReport = 'know' | 'learning' | 'want' | 'unseen';
export type PlacementStatus = 'not-started' | 'in-progress' | 'done' | 'skipped';
export type PlacementPace = 'accelerate' | 'deepen';

export interface StrandTile {
  strand: string;
  examples: string[];
  harderExamples: string[];
}

export interface PlacementQuestion {
  id: string;
  prompt: string;
  type: 'short_text';
  placeholder: string;
  layout: 'horizontal' | 'vertical';
  metadata: Record<string, unknown>;
  strand: string;
}

export interface StrandResult {
  strand: string;
  report: SelfReport;
  grade: number;
  passed: number | null;
  failed: number | null;
}

export interface PlacementResult {
  schoolGrade: number;
  workingGrade: number;
  headlineGrade: number;
  strands: StrandResult[];
  goals: string[];
  questions: number;
  correct: number;
}

export interface PlacementView {
  status: PlacementStatus;
  schoolGrade: number | null;
  tiles: StrandTile[];
  question: PlacementQuestion | null;
  asked: number;
  remaining: number;
  lastCorrect: boolean | null;
  result: PlacementResult | null;
  pace: PlacementPace | null;
}

/** The learning plan's copy of the last placement (students/{id}.placement). */
export interface PlacementSummary {
  status: 'done' | 'skipped';
  schoolGrade: number;
  workingGrade: number;
  headlineGrade: number;
  strands: Array<{ strand: string; grade: number; report: SelfReport }>;
  goals: string[];
  completedAt: string;
  pace: PlacementPace;
}

export type PlacementErrorCode = 'GRADE_REQUIRED' | 'NOT_IN_PROGRESS' | 'STALE_QUESTION' | 'NOT_PLACED' | 'INVALID_REQUEST';
export type PlacementError = TestApiError<PlacementErrorCode>;

export const SELF_REPORT_OPTIONS: Array<{ value: SelfReport; emoji: string; label: string }> = [
  { value: 'know', emoji: '😎', label: 'I know this' },
  { value: 'learning', emoji: '📚', label: 'Learning it now' },
  { value: 'want', emoji: '✨', label: 'Want to learn' },
  { value: 'unseen', emoji: '🤷', label: "Haven't seen it" },
];

export const STRAND_EMOJI: Record<string, string> = {
  'Number Sense': '🔢',
  'Add & subtract': '➕',
  Multiply: '✖️',
  Divide: '➗',
  'Negative numbers': '➖',
  Fractions: '🍕',
  'Decimals, percent & ratio': '💯',
  Operations: '➕',
  'Fractions, Decimals & Percent': '🍕',
  Measurement: '📏',
  Geometry: '📐',
  'Data & Probability': '📊',
  Algebra: '🔤',
};

/** First-time placement: what the kid says they know, then a short adaptive check. */
@Injectable({ providedIn: 'root' })
export class PlacementService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = `${environment.apiUrl}/placement`;

  get(studentId: string): Promise<PlacementView> {
    return this.call(this.http.get<PlacementView>(this.url(studentId)));
  }

  start(studentId: string, reports: Record<string, SelfReport>, ahead: boolean, grade?: string): Promise<PlacementView> {
    return this.call(this.http.post<PlacementView>(`${this.url(studentId)}/start`, { reports, ahead, ...(grade ? { grade } : {}) }));
  }

  answer(studentId: string, questionId: string, answer: string, timeMs: number): Promise<PlacementView> {
    return this.call(this.http.post<PlacementView>(`${this.url(studentId)}/answer`, { questionId, answer, timeMs }));
  }

  skip(studentId: string): Promise<PlacementView> {
    return this.call(this.http.post<PlacementView>(`${this.url(studentId)}/skip`, {}));
  }

  setPace(studentId: string, pace: PlacementPace): Promise<{ pace: PlacementPace }> {
    return this.call(this.http.put<{ pace: PlacementPace }>(`${this.url(studentId)}/pace`, { pace }));
  }

  private url(studentId: string): string {
    return `${this.apiBase}/${encodeURIComponent(studentId)}`;
  }

  private async call<T>(request: Observable<T>): Promise<T> {
    try {
      return await firstValueFrom(request);
    } catch (err) {
      throw toTestApiError<PlacementErrorCode>(err);
    }
  }
}
