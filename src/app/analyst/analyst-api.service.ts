import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { auth } from '../firebase/firebase.config';
import type { FullInsightsResponse } from '../services/learning-api.service';
import type { LearningPlan, TopicStanding } from '../services/learning-plan.service';
import { TestApiError, toTestApiError } from '../services/test-api-error';
import { AnalystSession } from './analyst-session.service';
import { normalizeAnalystCode } from './analyst-code';

export const ANALYST_API = `${environment.apiUrl}/analyst`;
/** The parent-only part of /analyst (managing a child's code); the analyst header is never sent there. */
export const ANALYST_PARENT_API = `${ANALYST_API}/students/`;
export const INVALID_ANALYST_CODE = 'INVALID_ANALYST_CODE';

export interface AnalystCode {
  code: string;
  studentId: string;
  createdAt: string;
  expiresAt: string;
}

export type AnalystApiError = TestApiError;

/** What the analyst reads. The code goes in X-Analyst-Code, added by analystInterceptor. */
@Injectable({ providedIn: 'root' })
export class AnalystApiService {
  private readonly http = inject(HttpClient);

  /** Checks a code and returns the child it opens. */
  async startSession(code: string): Promise<AnalystSession> {
    const normalized = normalizeAnalystCode(code);
    const res = await call(
      this.http.post<Omit<AnalystSession, 'code'>>(`${ANALYST_API}/session`, { code: normalized }),
    );
    return { code: normalized, studentId: res.studentId, studentName: res.studentName, grade: res.grade, expiresAt: res.expiresAt };
  }

  plan(): Promise<LearningPlan> {
    return call(this.http.get<LearningPlan>(`${ANALYST_API}/learning-plan`));
  }

  topics(): Promise<TopicStanding[]> {
    return call(this.http.get<{ topics: TopicStanding[] }>(`${ANALYST_API}/learning-plan/topics`)).then((r) => r.topics ?? []);
  }

  insights(): Promise<FullInsightsResponse> {
    return call(this.http.get<FullInsightsResponse>(`${ANALYST_API}/insights`));
  }

  worksheetHistory(): Promise<any[]> {
    return call(this.http.get<any[]>(`${ANALYST_API}/insights/worksheets`));
  }
}

/** The parent's side: create, read and revoke a child's analyst code (Firebase ID token). */
@Injectable({ providedIn: 'root' })
export class AnalystCodeService {
  private readonly http = inject(HttpClient);

  async get(studentId: string): Promise<AnalystCode | null> {
    const res = await call(this.http.get<{ analystCode: AnalystCode | null }>(this.url(studentId), { headers: await authHeaders() }));
    return res.analystCode ?? null;
  }

  /** Creates a code, or replaces the current one (which stops working). */
  async create(studentId: string): Promise<AnalystCode> {
    const res = await call(this.http.post<{ analystCode: AnalystCode }>(this.url(studentId), {}, { headers: await authHeaders() }));
    return res.analystCode;
  }

  async revoke(studentId: string): Promise<void> {
    await call(this.http.delete<{ ok: true }>(this.url(studentId), { headers: await authHeaders() }));
  }

  private url(studentId: string): string {
    return `${ANALYST_PARENT_API}${encodeURIComponent(studentId)}/code`;
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function call<T>(request: Observable<T>): Promise<T> {
  try {
    return await firstValueFrom(request);
  } catch (err) {
    throw toTestApiError(err);
  }
}

/** A message for a failed code check or load, written for the analyst. */
export function analystErrorMessage(err: unknown): string {
  const e = err as Partial<TestApiError>;
  if (e?.httpStatus === 429) return 'Too many tries, wait a few minutes and try again.';
  if (e?.code === INVALID_ANALYST_CODE) return "That code didn't work. Check it, or ask the parent for a new one.";
  return e?.message || 'Something went wrong. Please try again.';
}
