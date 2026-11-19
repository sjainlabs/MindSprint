import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { auth } from '../firebase/firebase.config';
import { AdhocTest } from './adhoc-test.service';
import { TestApiError, toTestApiError } from './test-api-error';

/* ---------------- Types (mirror /api/tests/parent-tests and /api/tests/assigned) ---------------- */

/** Who wrote a hand-written test: the child's parent or a linked teacher (with their name) */
export interface TestAuthor {
  role: 'parent' | 'teacher';
  uid: string;
  name: string;
}

export interface ParentTestSummary {
  testId: string;
  title: string;
  author: TestAuthor;
  questionCount: number;
  createdAt: string;
  status: 'open' | 'submitted';
  score: number | null;
  total: number | null;
  accuracy: number | null;
  submittedAt: string | null;
}

export interface ParentTestQuestionInput {
  prompt: string;
  answer: string;
}

export interface ParentTestDetail extends ParentTestSummary {
  questions: Array<{ id: string; prompt: string; answer: string }>;
}

/** A test from a parent or teacher, ready to take: the custom test shape plus its title and author. */
export type AssignedTest = AdhocTest & { title: string; fromParent: true; author?: TestAuthor };

/** "your parent", or the teacher's name ("Ms Rao"), for showing the child who set a test */
export function authorLabel(author: TestAuthor | undefined): string {
  if (author?.role === 'teacher') return author.name || 'your teacher';
  return 'your parent';
}

export type ParentTestErrorCode = 'INVALID_REQUEST' | 'NOT_FOUND' | 'ALREADY_SUBMITTED' | 'FORBIDDEN';
export type ParentTestError = TestApiError<ParentTestErrorCode>;

export const PARENT_TEST_MAX_QUESTIONS = 50;

/**
 * Tests a parent or linked teacher types in for one child. Writing, listing and deleting need their Firebase
 * ID token; the child lists and opens waiting tests by student id, and submits them as custom tests.
 */
@Injectable({ providedIn: 'root' })
export class ParentTestService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = `${environment.apiUrl}/tests`;

  async write(studentId: string, title: string, questions: ParentTestQuestionInput[]): Promise<ParentTestDetail> {
    return this.call(
      this.http.post<ParentTestDetail>(`${this.apiBase}/parent-tests`, { studentId, title, questions }, { headers: await authHeaders() }),
    );
  }

  async list(studentId: string): Promise<ParentTestSummary[]> {
    const url = `${this.apiBase}/parent-tests/${encodeURIComponent(studentId)}`;
    return (await this.call(this.http.get<{ tests: ParentTestSummary[] }>(url, { headers: await authHeaders() }))).tests;
  }

  async remove(studentId: string, testId: string): Promise<void> {
    const url = `${this.apiBase}/parent-tests/${encodeURIComponent(studentId)}/${encodeURIComponent(testId)}`;
    await this.call(this.http.delete<void>(url, { headers: await authHeaders() }));
  }

  /** The child's side: tests from a parent still waiting to be taken. */
  async assigned(studentId: string): Promise<ParentTestSummary[]> {
    const url = `${this.apiBase}/assigned/${encodeURIComponent(studentId)}`;
    return (await this.call(this.http.get<{ tests: ParentTestSummary[] }>(url))).tests;
  }

  async open(studentId: string, testId: string): Promise<AssignedTest> {
    const url = `${this.apiBase}/assigned/${encodeURIComponent(studentId)}/${encodeURIComponent(testId)}`;
    return this.call(this.http.get<AssignedTest>(url));
  }

  private async call<T>(request: Observable<T>): Promise<T> {
    try {
      return await firstValueFrom(request);
    } catch (err) {
      throw toTestApiError<ParentTestErrorCode>(err);
    }
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
