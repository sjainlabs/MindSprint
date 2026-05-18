import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { forkJoin, Observable, of, switchMap, tap, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  type MasteryState,
  MasteryEngineService,
} from '../../core/mastery/mastery-engine.service';
import {
  type OperationConcept,
  type OperationType,
  OPERATION_DIFFICULTY_BOUNDS,
  OPERATION_DISPLAY_NAME_MAP,
  OPERATION_SKILL_MAP,
} from './models/operation-concept.model';
import {
  type OperationPracticeSession,
  type OperationSubmitPayload,
} from './models/operation-practice.model';
import {
  type OperationSubmissionResult,
  type OperationAnswerResult,
} from './models/operation-result.model';

interface OperationPracticeApiProblem {
  problemId?: string | number;
  id?: string | number;
  prompt?: string;
  question?: string;
  metadata?: Record<string, unknown>;
  correctAnswer?: string | number;
  answer?: string | number;
}

interface OperationPracticeApiResponse {
  sessionId?: string;
  difficulty?: number;
  problems?: OperationPracticeApiProblem[];
  questions?: OperationPracticeApiProblem[];
}

interface OperationSubmitApiResult {
  problemId?: string | number;
  questionId?: string | number;
  studentAnswer?: string | number;
  submittedAnswer?: string | number;
  correctAnswer?: string | number;
  expectedAnswer?: string | number;
  isCorrect?: boolean;
}

interface OperationSubmitApiResponse {
  sessionId?: string;
  totalProblems?: number;
  totalQuestions?: number;
  correctCount?: number;
  correct?: number;
  incorrectCount?: number;
  incorrect?: number;
  scorePercentage?: number;
  accuracy?: number;
  results?: OperationSubmitApiResult[];
  questionResults?: OperationSubmitApiResult[];
}

@Injectable({
  providedIn: 'root',
})
export class OperationsService {
  private readonly minDifficulty = OPERATION_DIFFICULTY_BOUNDS.min;
  private readonly maxDifficulty = OPERATION_DIFFICULTY_BOUNDS.max;
  private readonly operationsApiUrl = `${environment.apiUrl}/operations`;
  private readonly defaultStudentId = 'student-demo';
  private readonly latestResultState = signal<OperationSubmissionResult | null>(null);
  private readonly latestMasteryState = signal<MasteryState | null>(null);

  constructor(
    private readonly http: HttpClient,
    private readonly masteryEngine: MasteryEngineService,
  ) {}

  getConcept(operation: OperationType): Observable<OperationConcept> {
    const params = new HttpParams().set('operation', operation);
    return this.http
      .get<Partial<OperationConcept>>(`${this.operationsApiUrl}/concept`, { params })
      .pipe(map((data) => this.normalizeConcept(operation, data)));
  }

  getPractice(operation: OperationType, difficulty: number): Observable<OperationPracticeSession> {
    const params = new HttpParams()
      .set('operation', operation)
      .set('difficulty', this.clampAndStringifyDifficulty(difficulty));

    return this.http
      .get<OperationPracticeApiResponse>(`${this.operationsApiUrl}/practice`, { params })
      .pipe(map((payload) => this.normalizePractice(operation, difficulty, payload)));
  }

  submitPractice(payload: OperationSubmitPayload): Observable<OperationSubmissionResult> {
    return this.http
      .post<OperationSubmitApiResponse>(`${this.operationsApiUrl}/submit`, payload)
      .pipe(
        map((response) => this.normalizeSubmission(payload, response)),
        tap((result) => this.latestResultState.set(result)),
      );
  }

  syncMasteryState(
    operation: OperationType,
    result: OperationSubmissionResult,
    studentId = this.defaultStudentId,
  ): Observable<MasteryState> {
    const skillId = this.toMasterySkill(operation);
    const updates = result.results.map((entry) =>
      this.masteryEngine.updateMastery({
        studentId,
        skillId,
        skillName: this.toSkillDisplayName(operation),
        isCorrect: entry.isCorrect,
      }),
    );

    return (updates.length ? forkJoin(updates) : of([])).pipe(
      switchMap(() => this.masteryEngine.fetchMasteryState(studentId)),
      tap((state) => this.latestMasteryState.set(state)),
    );
  }

  getLatestResult(): OperationSubmissionResult | null {
    return this.latestResultState();
  }

  getLatestMasteryState(): MasteryState | null {
    return this.latestMasteryState();
  }

  clearLatestResult(): void {
    this.latestResultState.set(null);
  }

  private normalizeConcept(operation: OperationType, payload: Partial<OperationConcept> | null | undefined): OperationConcept {
    return {
      operation,
      definition: payload?.definition?.trim() || 'A foundational math idea.',
      kidFriendlyExplanation:
        payload?.kidFriendlyExplanation?.trim() ||
        'Let’s solve it step by step using simple numbers.',
      visualExplanation:
        payload?.visualExplanation?.trim() ||
        'Imagine blocks and count what changes.',
      examples: payload?.examples?.length ? payload.examples : ['1 and 1 make 2.'],
      commonMistakes: payload?.commonMistakes?.length
        ? payload.commonMistakes
        : ['Rushing without checking each step.'],
    };
  }

  private normalizePractice(
    operation: OperationType,
    difficulty: number,
    payload: OperationPracticeApiResponse,
  ): OperationPracticeSession {
    const problems = (payload?.problems ?? payload?.questions ?? []).map((problem, index) => ({
      problemId: String(problem.problemId ?? problem.id ?? `problem-${index + 1}`),
      prompt: String(problem.prompt ?? problem.question ?? 'Solve this problem.'),
      metadata:
        typeof problem.metadata === 'object' && problem.metadata !== null ? problem.metadata : {},
      correctAnswer: problem.correctAnswer ?? problem.answer,
    }));

    return {
      sessionId: String(payload?.sessionId ?? `ops-${Date.now()}`),
      operation,
      difficulty: Number(payload?.difficulty ?? this.clampAndStringifyDifficulty(difficulty)),
      problems,
    };
  }

  private normalizeSubmission(
    payload: OperationSubmitPayload,
    response: OperationSubmitApiResponse,
  ): OperationSubmissionResult {
    const submittedById = new Map(payload.answers.map((entry) => [entry.problemId, String(entry.studentAnswer)]));

    const results: OperationAnswerResult[] = (response?.results ?? response?.questionResults ?? []).map(
      (item) => {
        const problemId = String(item?.problemId ?? item?.questionId ?? '');
        const studentAnswer = String(item?.studentAnswer ?? item?.submittedAnswer ?? submittedById.get(problemId) ?? '');
        const correctAnswer = String(item?.correctAnswer ?? item?.expectedAnswer ?? '');
        const isCorrect =
          typeof item?.isCorrect === 'boolean'
            ? item.isCorrect
            : studentAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();

        return {
          problemId,
          studentAnswer,
          correctAnswer,
          isCorrect,
        };
      },
    );

    const totalProblems = Number(response?.totalProblems ?? response?.totalQuestions ?? results.length);
    const correctCount = Number(
      response?.correctCount ?? response?.correct ?? results.filter((item) => item.isCorrect).length,
    );
    const incorrectCount = Number(
      response?.incorrectCount ?? response?.incorrect ?? Math.max(0, totalProblems - correctCount),
    );
    const scorePercentage =
      Number(response?.scorePercentage ?? response?.accuracy) ||
      (totalProblems > 0 ? Math.round((correctCount / totalProblems) * 100) : 0);

    return {
      sessionId: String(response?.sessionId ?? payload.sessionId),
      totalProblems,
      correctCount,
      incorrectCount,
      scorePercentage,
      results,
    };
  }

  private clampAndStringifyDifficulty(value: number): string {
    const difficulty = Number.isFinite(value) ? Math.round(value) : 1;
    return String(Math.max(this.minDifficulty, Math.min(this.maxDifficulty, difficulty)));
  }

  private toMasterySkill(operation: OperationType): string {
    return OPERATION_SKILL_MAP[operation] ?? operation;
  }

  private toSkillDisplayName(operation: OperationType): string {
    return OPERATION_DISPLAY_NAME_MAP[operation];
  }
}
