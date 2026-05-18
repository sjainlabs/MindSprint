import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { forkJoin, Observable, of, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  type MasteryState,
  MasteryEngineService,
} from '../../core/mastery/mastery-engine.service';
import {
  type OperationConcept,
  type OperationType,
} from './models/operation-concept.model';
import {
  type OperationPracticeSession,
  type OperationSubmitPayload,
} from './models/operation-practice.model';
import {
  type OperationSubmissionResult,
  type OperationAnswerResult,
} from './models/operation-result.model';

@Injectable({
  providedIn: 'root',
})
export class OperationsService {
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
      .pipe(tap(() => undefined), switchMap((data) => of(this.normalizeConcept(operation, data))));
  }

  getPractice(operation: OperationType, difficulty: number): Observable<OperationPracticeSession> {
    const params = new HttpParams()
      .set('operation', operation)
      .set('difficulty', this.clampDifficulty(difficulty));

    return this.http.get<any>(`${this.operationsApiUrl}/practice`, { params }).pipe(
      switchMap((payload) => of(this.normalizePractice(operation, difficulty, payload))),
    );
  }

  submitPractice(payload: OperationSubmitPayload): Observable<OperationSubmissionResult> {
    return this.http
      .post<any>(`${this.operationsApiUrl}/submit`, payload)
      .pipe(switchMap((response) => of(this.normalizeSubmission(payload, response))), tap((result) => this.latestResultState.set(result)));
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
    payload: any,
  ): OperationPracticeSession {
    const problems = (payload?.problems ?? payload?.questions ?? []).map((problem: any, index: number) => ({
      problemId: String(problem?.problemId ?? problem?.id ?? `problem-${index + 1}`),
      prompt: String(problem?.prompt ?? problem?.question ?? 'Solve this problem.'),
      metadata:
        typeof problem?.metadata === 'object' && problem?.metadata !== null ? problem.metadata : {},
      correctAnswer: problem?.correctAnswer ?? problem?.answer,
    }));

    return {
      sessionId: String(payload?.sessionId ?? `ops-${Date.now()}`),
      operation,
      difficulty: Number(payload?.difficulty ?? this.clampDifficulty(difficulty)),
      problems,
    };
  }

  private normalizeSubmission(
    payload: OperationSubmitPayload,
    response: any,
  ): OperationSubmissionResult {
    const submittedById = new Map(payload.answers.map((entry) => [entry.problemId, String(entry.studentAnswer)]));

    const results: OperationAnswerResult[] = (response?.results ?? response?.questionResults ?? []).map(
      (item: any) => {
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

  private clampDifficulty(value: number): string {
    const difficulty = Number.isFinite(value) ? Math.round(value) : 1;
    return String(Math.max(1, Math.min(50, difficulty)));
  }

  private toMasterySkill(operation: OperationType): string {
    if (operation === 'add') return 'addition';
    if (operation === 'sub') return 'subtraction';
    if (operation === 'mul') return 'multiplication';
    if (operation === 'div') return 'division';
    return operation;
  }

  private toSkillDisplayName(operation: OperationType): string {
    if (operation === 'add') return 'Addition';
    if (operation === 'sub') return 'Subtraction';
    if (operation === 'mul') return 'Multiplication';
    if (operation === 'div') return 'Division';
    if (operation === 'fraction') return 'Fractions';
    return 'Decimals';
  }
}
