import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { TestApiError, toTestApiError } from './test-api-error';

/* ---------------- Types (mirror /api/tests/adhoc) ---------------- */

export interface AdhocTestTopic {
  topicId: string;
  topicName: string;
  practiceLevel: string;
  cbseGrade: number;
  questionCount: number;
}

export interface AdhocTestQuestion {
  id: string;
  prompt: string;
  type: 'short_text';
  placeholder: string;
  topicId: string;
  layout: 'horizontal' | 'vertical';
  metadata: Record<string, unknown>;
}

export interface AdhocTest {
  testId: string;
  topics: AdhocTestTopic[];
  questionCount: number;
  questions: AdhocTestQuestion[];
  generatedAt: string;
}

export interface AdhocTopicScore {
  topicId: string;
  topicName: string;
  score: number;
  total: number;
  accuracy: number;
}

export interface AdhocTestResult {
  testId: string;
  score: number;
  total: number;
  accuracy: number;
  byTopic: AdhocTopicScore[];
  results: Array<{
    questionId: string;
    topicId: string;
    prompt: string;
    correct: boolean;
    expectedAnswer: string;
    submittedAnswer: string;
  }>;
  submittedAt: string;
}

export type AdhocTestErrorCode = 'INVALID_REQUEST' | 'NOT_FOUND' | 'ALREADY_SUBMITTED' | 'FORBIDDEN';
export type AdhocTestError = TestApiError<AdhocTestErrorCode>;

/** What the student picked in the builder; reused for "Retake" and to pre-fill the next build. */
export interface AdhocSelection {
  topicIds: string[];
  questionCount: number;
}

/** A generated-but-unsubmitted test, kept in localStorage so a refresh resumes it. */
export interface ActiveAdhocTest {
  studentId: string;
  test: AdhocTest;
  selection: AdhocSelection;
  answers: Record<string, string>;
  startedAt: string;
  currentIndex: number;
  /** Set for a 3-weekly review test, which is graded through /api/learning-plan. */
  review?: { cycle: number; dueDate: string };
}

/** Custom tests and review tests are saved separately, so starting one never loses the other. */
export type ActiveTestSlot = 'adhoc' | 'review';

export const ADHOC_MAX_TOPICS = 10;
export const ADHOC_MAX_QUESTIONS = 50;
export const ADHOC_MAX_PER_TOPIC = 25;
export const ADHOC_DEFAULT_QUESTIONS = 20;

const ACTIVE_KEY = 'mindsprint.adhocTest.active';
const SELECTION_KEY = 'mindsprint.adhocTest.lastSelection';

@Injectable({ providedIn: 'root' })
export class AdhocTestService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = `${environment.apiUrl}/tests/adhoc`;

  /** Allowed question counts for a number of topics: one per topic up to 50, at most 25 per topic. */
  questionRange(topicCount: number): { min: number; max: number } {
    const n = Math.max(1, topicCount);
    return { min: n, max: Math.min(ADHOC_MAX_QUESTIONS, n * ADHOC_MAX_PER_TOPIC) };
  }

  async generate(studentId: string, selection: AdhocSelection): Promise<AdhocTest> {
    try {
      return await firstValueFrom(
        this.http.post<AdhocTest>(`${this.apiBase}/generate`, {
          studentId,
          topicIds: selection.topicIds,
          questionCount: selection.questionCount,
        }),
      );
    } catch (err) {
      throw toTestApiError<AdhocTestErrorCode>(err);
    }
  }

  async submit(payload: {
    testId: string;
    studentId: string;
    answers: Record<string, string>;
    startedAt?: string;
  }): Promise<AdhocTestResult> {
    try {
      return await firstValueFrom(this.http.post<AdhocTestResult>(`${this.apiBase}/submit`, payload));
    } catch (err) {
      throw toTestApiError<AdhocTestErrorCode>(err);
    }
  }

  /* ---------------- Active test persistence ---------------- */

  loadActive(studentId: string, slot: ActiveTestSlot = 'adhoc'): ActiveAdhocTest | null {
    const parsed = this.read<ActiveAdhocTest>(this.activeKey(studentId, slot));
    return parsed?.studentId === studentId && parsed.test?.testId ? parsed : null;
  }

  saveActive(active: ActiveAdhocTest, slot: ActiveTestSlot = 'adhoc'): void {
    this.write(this.activeKey(active.studentId, slot), active);
  }

  clearActive(studentId: string, slot: ActiveTestSlot = 'adhoc'): void {
    this.remove(this.activeKey(studentId, slot));
  }

  private activeKey(studentId: string, slot: ActiveTestSlot): string {
    return slot === 'review' ? `${ACTIVE_KEY}.review.${studentId}` : `${ACTIVE_KEY}.${studentId}`;
  }

  /* ---------------- Last selection ---------------- */

  loadLastSelection(studentId: string): AdhocSelection | null {
    const parsed = this.read<AdhocSelection>(`${SELECTION_KEY}.${studentId}`);
    return Array.isArray(parsed?.topicIds) && parsed.topicIds.length ? parsed : null;
  }

  saveLastSelection(studentId: string, selection: AdhocSelection): void {
    this.write(`${SELECTION_KEY}.${studentId}`, selection);
  }

  private read<T>(key: string): T | null {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  private write(key: string, value: unknown): void {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or blocked: the test still works, it just won't survive a refresh.
    }
  }

  private remove(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}
