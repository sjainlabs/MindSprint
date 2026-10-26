import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { TestApiError, toTestApiError } from './test-api-error';
import type { TopicStudyGuideResponse } from './study-guide.service';

/* ---------------- Types (mirror /api/assessment) ---------------- */

export type DailyTopicStatus = 'new' | 'learning' | 'needs-work' | 'mastered' | 'excelled';
export type NeedsWorkReason = 'accuracy' | 'speed';
export type GradeState = 'locked' | 'in-progress' | 'mastered';

export interface DailyQuestion {
  questionId: string;
  topicId: string;
  topicName: string;
  grade: number;
  kind: 'learn' | 'probe' | 'review';
  prompt: string;
  type: 'short_text';
  placeholder: string;
  layout: 'horizontal' | 'vertical';
  metadata: Record<string, unknown> | null;
  /** For the backend's speed check only; never shown to the child. */
  targetSeconds: number;
  difficultyStep: number;
  servedAt: string;
}

/** One day of practice, in the child's own timezone. */
export interface DailySession {
  date: string;
  activeMinutes: number;
  questions: number;
  correct: number;
  accuracy: number | null;
  averageSeconds: number | null;
  slow: number;
  topicsPractised: number;
  goalReached: boolean;
}

export interface SessionStartResponse {
  startGrade: number;
  frontierGrade: number;
  resumed: boolean;
  completed: boolean;
  question: DailyQuestion | null;
  today: DailySession | null;
  dailyGoalReached: boolean;
}

export interface AnswerTopic {
  topicId: string;
  topicName: string;
  grade: number;
  previousStatus: DailyTopicStatus;
  status: DailyTopicStatus;
  needsWorkReason: NeedsWorkReason | null;
  attempts: number;
  recentAccuracy: number | null;
  streak: number;
  bestStreak: number;
}

export interface RecommendedGuide {
  topicId: string;
  topicName: string;
  guideId: string;
  guideTitle: string;
}

export interface AnswerResponse {
  correct: boolean;
  slow: boolean;
  expectedAnswer: string;
  submittedAnswer: string;
  timeTakenSeconds: number;
  targetSeconds: number;
  topic: AnswerTopic;
  recommendStudyGuide: RecommendedGuide | null;
  gradeMastered: number | null;
  gradeUnlocked: number | null;
  frontierGrade: number;
  today: DailySession | null;
  dailyGoalReached: boolean;
  dailyGoalJustReached: boolean;
  next: DailyQuestion | null;
  completed: boolean;
}

export interface PauseResponse {
  paused: boolean;
  pausedAt: string;
  currentTopicId: string | null;
  studyGuide: TopicStudyGuideResponse | null;
}

export interface ProgressTopic {
  topicId: string;
  topicName: string;
  status: DailyTopicStatus;
  needsWorkReason: NeedsWorkReason | null;
  attempts: number;
  recentAccuracy: number | null;
  bestStreak: number;
  averageSeconds: number | null;
  reviewDue: boolean;
  nextReviewAt: string | null;
  lastPractisedAt: string | null;
}

export interface ProgressGrade {
  grade: number;
  state: GradeState;
  totalTopics: number;
  excelled: number;
  mastered: number;
  needsWork: number;
  learning: number;
  notStarted: number;
  /** Empty for locked grades. */
  topics: ProgressTopic[];
}

export interface DailyProgress {
  startGrade: number;
  frontierGrade: number;
  lowestGradeWithGaps: number | null;
  highestReachableGrade: number;
  completedGrades: number[];
  paused: boolean;
  currentTopicId: string | null;
  dailyGoalMinutes: number;
  grades: ProgressGrade[];
}

export interface DailyHistory {
  dailyGoalMinutes: number;
  daysPractised: number;
  daysGoalReached: number;
  /** Newest first. */
  sessions: DailySession[];
}

export type DailyErrorCode = 'GRADE_REQUIRED' | 'STALE_QUESTION' | 'NOT_FOUND' | 'INVALID_REQUEST';
export { TestApiError as DailyChallengeError };

export const DAILY_GOAL_MINUTES = 30;

/** The device's local date as YYYY-MM-DD, so "today" matches the child's timezone. */
export function localDate(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function gradeName(grade: number | null | undefined): string {
  if (grade === null || grade === undefined) return '';
  return grade === 0 ? 'Kindergarten' : `Grade ${grade}`;
}

/** Accuracy as a whole percentage; accepts 0–1 or 0–100 from the API. */
export function percent(value: number | null | undefined): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return Math.round(value <= 1 ? value * 100 : value);
}

/** Days in a row with the goal reached, ending today (or yesterday, while today is still in progress). */
export function goalStreak(sessions: DailySession[], today = localDate()): number {
  const reached = new Set(sessions.filter((s) => s.goalReached).map((s) => s.date));
  const day = new Date(`${today}T12:00:00`);
  if (!reached.has(today)) day.setDate(day.getDate() - 1);
  let streak = 0;
  while (reached.has(localDate(day))) {
    streak += 1;
    day.setDate(day.getDate() - 1);
  }
  return streak;
}

const ELAPSED_PREFIX = 'mindsprint.daily.elapsed';

@Injectable({ providedIn: 'root' })
export class DailyChallengeService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = `${environment.apiUrl}/assessment`;

  start(studentId: string, grade?: string): Promise<SessionStartResponse> {
    const body: Record<string, unknown> = { studentId, localDate: localDate() };
    if (grade !== undefined) body['grade'] = grade;
    return this.call(this.http.post<SessionStartResponse>(`${this.apiBase}/session/start`, body));
  }

  answer(studentId: string, questionId: string, answer: string, timeTakenMs: number): Promise<AnswerResponse> {
    return this.call(
      this.http.post<AnswerResponse>(`${this.apiBase}/answer`, {
        studentId,
        questionId,
        answer,
        timeTakenMs: Math.max(0, Math.round(timeTakenMs)),
        localDate: localDate(),
      }),
    );
  }

  pause(studentId: string, reason: 'study-guide' | 'break', topicId?: string): Promise<PauseResponse> {
    const body: Record<string, unknown> = { studentId, reason };
    if (topicId) body['topicId'] = topicId;
    return this.call(this.http.post<PauseResponse>(`${this.apiBase}/session/pause`, body));
  }

  progress(studentId: string): Promise<DailyProgress> {
    return this.call(this.http.get<DailyProgress>(`${this.apiBase}/progress/${encodeURIComponent(studentId)}`));
  }

  daily(studentId: string, days = 30): Promise<DailyHistory> {
    return this.call(
      this.http.get<DailyHistory>(`${this.apiBase}/daily/${encodeURIComponent(studentId)}`, { params: { days } }),
    );
  }

  /* ---------------- Time on the current question (survives leaving the app) ---------------- */

  loadElapsed(studentId: string, questionId: string): number {
    try {
      const raw = window.localStorage.getItem(`${ELAPSED_PREFIX}.${studentId}`);
      const saved = raw ? (JSON.parse(raw) as { questionId: string; ms: number }) : null;
      return saved?.questionId === questionId ? saved.ms : 0;
    } catch {
      return 0;
    }
  }

  saveElapsed(studentId: string, questionId: string, ms: number): void {
    try {
      window.localStorage.setItem(`${ELAPSED_PREFIX}.${studentId}`, JSON.stringify({ questionId, ms }));
    } catch {
      // Storage blocked: the time still counts for this visit.
    }
  }

  private async call<T>(request: Observable<T>): Promise<T> {
    try {
      return await firstValueFrom(request);
    } catch (err) {
      throw toTestApiError<DailyErrorCode>(err);
    }
  }
}
