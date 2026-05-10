import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type LearningLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type GradeLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface DiagnosticQuestion {
  id: string;
  operation: 'addition' | 'subtraction' | 'multiplication' | 'division';
  prompt: string;
}

export interface DiagnosticTest {
  testId: string;
  createdAt: string;
  questions: DiagnosticQuestion[];
}

export interface DiagnosticSubmissionResponse {
  questionId: string;
  answer: number;
  secondsSpent: number;
}

export interface DiagnosticSubmission {
  testId: string;
  startedAt: string;
  completedAt: string;
  responses: DiagnosticSubmissionResponse[];
  studentId?: string;
  age?: number;
  grade?: GradeLevel;
}

export interface DiagnosticGradeEligibility {
  grade: GradeLevel;
  isAgeEligible: boolean;
  isUnlocked: boolean;
  reason: string;
}

export interface DiagnosticProgress {
  studentId: string;
  age: number;
  enrolledGrade: GradeLevel;
  canAttemptCurrentGrade: boolean;
  unlockedThroughGrade: GradeLevel;
  unlockedNextGrade: boolean;
  grades: DiagnosticGradeEligibility[];
}

export interface DiagnosticResult {
  level: LearningLevel;
  score: {
    totalQuestions: number;
    attempted: number;
    correct: number;
    incorrect: number;
    unanswered: number;
    totalDurationSeconds: number;
    averageSecondsPerQuestion: number;
    accuracyScore: number;
    speedScore: number;
    finalScore: number;
  };
  questionResults: Array<{
    questionId: string;
    isCorrect: boolean;
    expectedAnswer: number;
    submittedAnswer: number | null;
    secondsSpent: number;
  }>;
  weakAreas: ('addition' | 'subtraction' | 'multiplication' | 'division')[];
  strongAreas: ('addition' | 'subtraction' | 'multiplication' | 'division')[];
  diagnosticProgress?: DiagnosticProgress;
}

@Injectable({
  providedIn: 'root',
})
export class DiagnosticService {
  private readonly apiRoot =
    typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:3001/api'
      : '/api';
  private readonly baseUrl = `${this.apiRoot}/diagnostic`;

  /** State shared between the start, test, and results pages. */
  currentTest: DiagnosticTest | null = null;
  startedAt: Date | null = null;
  lastResult: DiagnosticResult | null = null;
  eligibility: DiagnosticProgress | null = null;

  constructor(private readonly http: HttpClient) {}

  startDiagnostic(): Observable<DiagnosticTest> {
    return this.http.get<DiagnosticTest>(`${this.baseUrl}/start`);
  }

  getEligibility(age: number, grade: GradeLevel, studentId = 'student-demo'): Observable<DiagnosticProgress> {
    return this.http.get<DiagnosticProgress>(
      `${this.baseUrl}/eligibility?studentId=${encodeURIComponent(studentId)}&age=${age}&grade=${grade}`,
    );
  }

  submitDiagnostic(payload: DiagnosticSubmission): Observable<DiagnosticResult> {
    return this.http.post<DiagnosticResult>(`${this.baseUrl}/submit`, payload);
  }
}
