import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AdhocTest, AdhocTestResult } from './adhoc-test.service';
import { TestApiError, toTestApiError } from './test-api-error';

/* ---------------- Types (mirror /api/learning-plan) ---------------- */

export type PlanStatus = 'not-started' | 'needs-work' | 'learning' | 'strong' | 'mastered';
export type Trend = 'improving' | 'steady' | 'slipping' | 'new';

export interface TopicStanding {
  topicId: string;
  topicName: string;
  grade: number;
  band: string;
  practiceLevel: string;
  strand: string;
  status: PlanStatus;
  /** 0–100, null before any practice. */
  score: number | null;
  evidenceCount: number;
  trend: Trend;
  slow: boolean;
  averageSecondsPerQuestion: number | null;
  targetSecondsPerQuestion: number;
  lastPractisedAt: string | null;
  daysSincePractice: number | null;
  testState: 'practising' | 'eligible' | 'passed' | null;
}

export interface GradeSummary {
  grade: number;
  totalTopics: number;
  mastered: number;
  strong: number;
  learning: number;
  needsWork: number;
  notStarted: number;
  /** Share of topics strong or mastered, 0–100. */
  securePercent: number;
  secure: boolean;
}

export interface LevelEstimate {
  profileGrade: number;
  workingGrade: number;
  workingBand: string | null;
  grades: GradeSummary[];
  gaps: TopicStanding[];
  summary: string;
}

export type RecommendationKind = 'test-ready' | 'fix' | 'continue' | 'new' | 'speed' | 'review';
export type PlanActionType = 'topic-test' | 'practice-sheet' | 'study-guide-then-practice';

export interface PlanAction {
  type: PlanActionType;
  topicId: string;
  level: string;
}

export interface Recommendation {
  rank: number;
  kind: RecommendationKind;
  topicId: string;
  topicName: string;
  grade: number;
  band: string;
  practiceLevel: string;
  strand: string;
  status: PlanStatus;
  score: number | null;
  reason: string;
  action: PlanAction;
}

export interface NextWorksheet extends PlanAction {
  topicName: string;
  label: string;
  reason: string;
}

export interface StrandSummary {
  strand: string;
  topicsPractised: number;
  averageScore: number;
  strongOrMastered: number;
  needsWork: number;
}

export interface ActivityWindow {
  from: string;
  to: string;
  sheets: number;
  topics: number;
  averageAccuracy: number | null;
}

export type ReviewStatus = 'upcoming' | 'open' | 'overdue';

export interface ReviewTopic {
  topicId: string;
  topicName: string;
  grade: number | null;
  status: PlanStatus;
  score: number | null;
}

export interface ReviewSchedule {
  cadenceDays: number;
  weekday: number;
  weekdayName: string;
  current: {
    cycle: number;
    windowStart: string;
    dueDate: string;
    opensOn: string;
    closesOn: string;
    daysUntil: number;
    status: ReviewStatus;
    canStart: boolean;
    topics: ReviewTopic[];
    questionCount: number;
    reviseFirst: ReviewTopic[];
    reminder: { stage: string; kid: string; parent: string };
    inProgressTestId: string | null;
  };
  upcoming: string[];
  history: Array<{
    cycle: number;
    dueDate: string;
    status: 'completed' | 'missed';
    accuracy: number | null;
    submittedAt: string | null;
  }>;
}

export interface LearningPlan {
  studentId: string;
  generatedAt: string;
  level: LevelEstimate;
  nextWorksheet: NextWorksheet | null;
  recommendations: Recommendation[];
  strengths: TopicStanding[];
  focusAreas: TopicStanding[];
  strands: StrandSummary[];
  activity: { last7Days: ActivityWindow; previous7Days: ActivityWindow; accuracyChange: number | null };
  tips: string[];
  reviewTest: ReviewSchedule;
}

export interface ReviewTest extends AdhocTest {
  cycle: number;
  dueDate: string;
}

export interface ReviewTestResult extends AdhocTestResult {
  cycle: number;
  nextReviewDate: string;
}

export type LearningPlanErrorCode = 'GRADE_REQUIRED' | 'NOT_OPEN' | 'NO_TOPICS' | 'NOT_FOUND' | 'ALREADY_SUBMITTED' | 'INVALID_REQUEST';
export { TestApiError as LearningPlanError };

export const KIND_LABELS: Record<RecommendationKind, string> = {
  fix: 'Fix',
  continue: 'Keep going',
  new: 'New',
  'test-ready': 'Test ready',
  speed: 'Speed',
  review: 'Refresher',
};

export const STATUS_LABELS: Record<PlanStatus, string> = {
  mastered: 'Mastered',
  strong: 'Strong',
  learning: 'Learning',
  'needs-work': 'Needs work',
  'not-started': 'Not started',
};

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function gradeLabel(grade: number | null | undefined): string {
  return grade === 0 ? 'K' : String(grade ?? '');
}

/** "Grade 3 · Band C" */
export function gradeBand(grade: number | null | undefined, band?: string | null): string {
  return `Grade ${gradeLabel(grade)}${band ? ` · Band ${band}` : ''}`;
}

/** A YYYY-MM-DD day shown as "Sat 15 Nov", without timezone drift. */
export function shortDate(day: string, withYear = false): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  });
}

@Injectable({ providedIn: 'root' })
export class LearningPlanService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = `${environment.apiUrl}/learning-plan`;
  /** The grade picked after a GRADE_REQUIRED, reused for the rest of the visit. */
  private readonly grades = new Map<string, string>();

  plan(studentId: string): Promise<LearningPlan> {
    return this.call(this.http.get<LearningPlan>(`${this.apiBase}/${encodeURIComponent(studentId)}`, { params: this.gradeParam(studentId) }));
  }

  topics(studentId: string): Promise<TopicStanding[]> {
    return this.call(
      this.http.get<{ topics: TopicStanding[] }>(`${this.apiBase}/${encodeURIComponent(studentId)}/topics`, { params: this.gradeParam(studentId) }),
    ).then((r) => r.topics);
  }

  saveWeekday(studentId: string, reviewWeekday: number): Promise<unknown> {
    return this.call(this.http.put(`${this.apiBase}/${encodeURIComponent(studentId)}/settings`, { reviewWeekday }));
  }

  generateReview(studentId: string): Promise<ReviewTest> {
    const grade = this.grades.get(studentId);
    return this.call(this.http.post<ReviewTest>(`${this.apiBase}/review-test/generate`, { studentId, ...(grade ? { grade } : {}) }));
  }

  submitReview(payload: { studentId: string; testId: string; answers: Record<string, string>; startedAt?: string }): Promise<ReviewTestResult> {
    return this.call(this.http.post<ReviewTestResult>(`${this.apiBase}/review-test/submit`, payload));
  }

  calendarUrl(studentId: string): string {
    return `${this.apiBase}/${encodeURIComponent(studentId)}/review-tests.ics`;
  }

  setGrade(studentId: string, grade: string): void {
    this.grades.set(studentId, grade);
  }

  private gradeParam(studentId: string): Record<string, string> {
    const grade = this.grades.get(studentId);
    return grade ? { grade } : {};
  }

  private async call<T>(request: Observable<T>): Promise<T> {
    try {
      return await firstValueFrom(request);
    } catch (err) {
      throw toTestApiError<LearningPlanErrorCode>(err);
    }
  }
}
