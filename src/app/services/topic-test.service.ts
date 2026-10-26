import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { TestApiError, toTestApiError } from './test-api-error';
import { isHiddenTopic } from '../constants/hidden-topics';

/* ---------------- Types (mirror /api/tests/topic) ---------------- */

export type TopicTestState = 'practising' | 'eligible' | 'passed';

export interface TopicTestStatus {
  topicId: string;
  topicName: string;
  state: TopicTestState;
  qualifyingSheets: number;
  sheetsRequired: number;
  sheetsRemaining: number;
  attempts: number;
  lastTestAccuracy: number | null;
  lastTestAt: string | null;
}

export interface TopicTestQuestion {
  id: string;
  prompt: string;
  type: 'short_text';
  placeholder: string;
  layout: 'horizontal' | 'vertical';
  metadata: Record<string, unknown>;
}

export interface TopicTest {
  testId: string;
  topicId: string;
  topicName: string;
  passAccuracy: number;
  questionCount: number;
  generatedAt: string;
  questions: TopicTestQuestion[];
}

export interface TopicTestResult {
  testId: string;
  topicId: string;
  score: number;
  total: number;
  accuracy: number;
  passed: boolean;
  results: Array<{
    questionId: string;
    prompt: string;
    correct: boolean;
    expectedAnswer: string;
    submittedAnswer: string;
  }>;
  status: TopicTestStatus;
  submittedAt: string;
}

export type TopicTestErrorCode =
  | 'NOT_ELIGIBLE'
  | 'ALREADY_PASSED'
  | 'ALREADY_SUBMITTED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INVALID_REQUEST';

export { TestApiError as TopicTestError };

/** A generated-but-unsubmitted test, kept in localStorage so a refresh resumes it. */
export interface ActiveTopicTest {
  studentId: string;
  test: TopicTest;
  answers: Record<string, string>;
  startedAt: string;
  currentIndex: number;
}

const ACTIVE_TEST_PREFIX = 'mindsprint.topicTest.active';
const SHEETS_REQUIRED = 10;

@Injectable({ providedIn: 'root' })
export class TopicTestService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = `${environment.apiUrl}/tests/topic`;

  /** Latest known status per (lowercased) topicId, shared by every screen that shows a topic test card. */
  readonly statuses = signal<Record<string, TopicTestStatus>>({});

  /** Keys are lowercased: the worksheet API lowercases topic IDs, the FE catalog may not. */
  statusFor(topicId: string | null | undefined): TopicTestStatus | null {
    if (!topicId) return null;
    return this.statuses()[topicId.toLowerCase()] ?? null;
  }

  /**
   * Placeholder for a topic the backend has no status for yet (it only returns practised topics),
   * so every topic can show its 0/10 progress toward the test.
   */
  notStartedStatus(topicId: string, topicName: string): TopicTestStatus {
    return {
      topicId,
      topicName,
      state: 'practising',
      qualifyingSheets: 0,
      sheetsRequired: SHEETS_REQUIRED,
      sheetsRemaining: SHEETS_REQUIRED,
      attempts: 0,
      lastTestAccuracy: null,
      lastTestAt: null,
    };
  }

  /** Merge statuses from any source (status endpoint, insights.topicTests, submit result). */
  ingest(statuses: TopicTestStatus[] | null | undefined): void {
    if (!statuses?.length) return;
    this.statuses.update((prev) => {
      const next = { ...prev };
      for (const s of statuses) {
        if (!isHiddenTopic(s.topicId)) next[s.topicId.toLowerCase()] = s;
      }
      return next;
    });
  }

  async getStatus(studentId: string, topicId?: string): Promise<TopicTestStatus[]> {
    const query = topicId ? `?topicId=${encodeURIComponent(topicId)}` : '';
    try {
      const res = await firstValueFrom(
        this.http.get<{ topics: TopicTestStatus[] }>(
          `${this.apiBase}/status/${encodeURIComponent(studentId)}${query}`,
        ),
      );
      const topics = res?.topics ?? [];
      this.ingest(topics);
      return topics;
    } catch (err) {
      throw this.toError(err);
    }
  }

  async generate(studentId: string, topicId: string): Promise<TopicTest> {
    try {
      return await firstValueFrom(
        this.http.post<TopicTest>(`${this.apiBase}/generate`, { studentId, topicId }),
      );
    } catch (err) {
      throw this.toError(err);
    }
  }

  async submit(payload: {
    testId: string;
    studentId: string;
    answers: Record<string, string>;
    startedAt?: string;
  }): Promise<TopicTestResult> {
    try {
      const result = await firstValueFrom(
        this.http.post<TopicTestResult>(`${this.apiBase}/submit`, payload),
      );
      this.ingest([result.status]);
      return result;
    } catch (err) {
      throw this.toError(err);
    }
  }

  /* ---------------- Active test persistence ---------------- */

  loadActive(studentId: string, topicId: string): ActiveTopicTest | null {
    try {
      const raw = window.localStorage.getItem(this.activeKey(studentId, topicId));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as ActiveTopicTest;
      if (parsed?.studentId !== studentId || !parsed.test?.testId) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  saveActive(active: ActiveTopicTest): void {
    try {
      window.localStorage.setItem(
        this.activeKey(active.studentId, active.test.topicId),
        JSON.stringify(active),
      );
    } catch {
      // Storage full or blocked: the test still works, it just won't survive a refresh.
    }
  }

  clearActive(studentId: string, topicId: string): void {
    try {
      window.localStorage.removeItem(this.activeKey(studentId, topicId));
    } catch {
      // ignore
    }
  }

  private activeKey(studentId: string, topicId: string): string {
    return `${ACTIVE_TEST_PREFIX}.${studentId}.${topicId}`;
  }

  private toError(err: unknown): TestApiError<TopicTestErrorCode> {
    return toTestApiError<TopicTestErrorCode>(err);
  }
}
