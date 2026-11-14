import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { auth } from '../firebase/firebase.config';
import { TestApiError, toTestApiError } from './test-api-error';

/* ---------------- Types (mirror /api/tests/answer-fixes) ---------------- */

export type FixableKind = 'practice' | 'topic-test' | 'review-test' | 'adhoc-test';

export interface FixableQuestion {
  questionId: string;
  prompt: string;
  expectedAnswer: string;
  submittedAnswer: string;
  correct: boolean;
  /** A parent already changed this answer. */
  fixedByParent: boolean;
  /** Only wrong answers can be fixed, so a fix can only raise the score. */
  canFix: boolean;
  /** Not sent today; a column sum is stacked when it is 'vertical'. */
  layout?: 'horizontal' | 'vertical';
  metadata?: Record<string, unknown> | null;
}

export interface FixableSubmission {
  worksheetId: string;
  kind: FixableKind;
  score: number;
  total: number;
  accuracy: number;
  submittedAt: string | null;
  questions: FixableQuestion[];
}

export interface AnswerFixResult extends FixableSubmission {
  previousAccuracy: number;
  fixedQuestionIds: string[];
}

export type AnswerFixErrorCode = 'ALREADY_CORRECT' | 'INVALID_REQUEST' | 'NOT_SUBMITTED' | 'NOT_FOUND';
export type AnswerFixError = TestApiError<AnswerFixErrorCode>;

export const FIX_KIND_LABELS: Record<FixableKind, string> = {
  practice: 'Practice sheet',
  'topic-test': 'Topic test',
  'review-test': 'Review test',
  'adhoc-test': 'Custom test',
};

export const TOPIC_TEST_PASS = 80;

/** A parent fixes typos in a child's submitted work (Firebase ID token; the parent must own the child). */
@Injectable({ providedIn: 'root' })
export class AnswerFixService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = `${environment.apiUrl}/tests/answer-fixes`;

  async get(studentId: string, worksheetId: string): Promise<FixableSubmission> {
    const url = `${this.apiBase}/${encodeURIComponent(studentId)}/${encodeURIComponent(worksheetId)}`;
    return this.call(this.http.get<FixableSubmission>(url, { headers: await authHeaders() }));
  }

  /** Sends only the changed answers; everything is re-scored on the server. */
  async save(studentId: string, worksheetId: string, answers: Record<string, string>): Promise<AnswerFixResult> {
    return this.call(
      this.http.post<AnswerFixResult>(this.apiBase, { studentId, worksheetId, answers }, { headers: await authHeaders() }),
    );
  }

  private async call<T>(request: Observable<T>): Promise<T> {
    try {
      return await firstValueFrom(request);
    } catch (err) {
      throw toTestApiError<AnswerFixErrorCode>(err);
    }
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
