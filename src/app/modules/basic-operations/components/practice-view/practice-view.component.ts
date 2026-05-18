import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  type OperationPracticeSession,
  type OperationSubmitPayload,
} from '../../models/operation-practice.model';
import { type OperationType } from '../../models/operation-concept.model';
import { type OperationSubmissionResult } from '../../models/operation-result.model';
import { OperationsService } from '../../operations.service';

@Component({
  selector: 'app-practice-view',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './practice-view.component.html',
  styleUrl: './practice-view.component.scss',
})
export class PracticeViewComponent implements OnInit {
  readonly operation = signal<OperationType>('add');
  readonly loading = signal(true);
  readonly error = signal('');
  readonly submitting = signal(false);
  readonly difficulty = signal(10);
  readonly session = signal<OperationPracticeSession | null>(null);
  readonly studentAnswers = signal<Record<string, string>>({});
  readonly result = signal<OperationSubmissionResult | null>(null);

  readonly allAnswersFilled = computed(() => {
    const currentSession = this.session();
    if (!currentSession || currentSession.problems.length === 0) {
      return false;
    }
    return currentSession.problems.every((problem) => this.studentAnswers()[problem.problemId]?.trim().length);
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly operationsService: OperationsService,
  ) {}

  ngOnInit(): void {
    const operationParam = this.route.snapshot.paramMap.get('operation') as OperationType | null;
    if (operationParam) {
      this.operation.set(operationParam);
    }
    this.loadPractice();
  }

  loadPractice(): void {
    this.loading.set(true);
    this.error.set('');
    this.result.set(null);
    this.operationsService.clearLatestResult();

    this.operationsService.getPractice(this.operation(), this.difficulty()).subscribe({
      next: (session) => {
        this.session.set(session);
        this.studentAnswers.set(
          Object.fromEntries(session.problems.map((problem) => [problem.problemId, ''])),
        );
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load practice right now.');
        this.loading.set(false);
      },
    });
  }

  updateAnswer(problemId: string, value: string): void {
    this.studentAnswers.update((answers) => ({ ...answers, [problemId]: value }));
  }

  submit(): void {
    const activeSession = this.session();
    if (!activeSession || !this.allAnswersFilled() || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.error.set('');

    const payload: OperationSubmitPayload = {
      sessionId: activeSession.sessionId,
      answers: activeSession.problems.map((problem) => ({
        problemId: problem.problemId,
        studentAnswer: this.studentAnswers()[problem.problemId],
      })),
    };

    this.operationsService.submitPractice(payload).subscribe({
      next: (result) => {
        this.result.set(result);
        this.operationsService.syncMasteryState(this.operation(), result).subscribe({
          error: () => undefined,
        });
        this.submitting.set(false);
      },
      error: () => {
        this.error.set('Unable to submit answers right now.');
        this.submitting.set(false);
      },
    });
  }

  tryAgain(): void {
    const nextDifficulty = this.difficulty() >= 50 ? 1 : this.difficulty() + 1;
    this.difficulty.set(nextDifficulty);
    this.loadPractice();
  }
}
