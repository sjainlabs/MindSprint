import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  type DiagnosticQuestion,
  DiagnosticService,
  type DiagnosticSubmissionResponse,
} from '../../services/diagnostic.service';

@Component({
  selector: 'app-diagnostic-test',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './diagnostic-test.html',
  styleUrl: './diagnostic-test.css',
})
export class DiagnosticTestComponent implements OnInit {
  private static readonly QUESTION_LIMIT = 20;
  testId = '';
  questions: DiagnosticQuestion[] = [];
  answers: Array<number | null> = [];
  currentQuestionIndex = 0;
  loading = false;
  submitting = false;
  errorMessage = '';
  private startedAt = '';
  private startedAtMs = 0;
  private completedAt = '';

  constructor(
    private readonly diagnosticService: DiagnosticService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.startTest();
  }

  startTest(): void {
    this.loading = true;
    this.errorMessage = '';
    this.testId = '';
    this.questions = [];
    this.answers = [];
    this.currentQuestionIndex = 0;
    this.startedAt = '';
    this.startedAtMs = 0;
    this.completedAt = '';

    this.diagnosticService.startDiagnostic().subscribe({
      next: (test) => {
        this.testId = test.testId;
        this.questions = test.questions.slice(0, DiagnosticTestComponent.QUESTION_LIMIT);
        this.startedAtMs = Date.now();
        this.startedAt = new Date(this.startedAtMs).toISOString();
        this.answers = this.questions.map(() => null);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Unable to load diagnostic test. Please try again.';
      },
    });
  }

  submitTest(): void {
    if (!this.testId || this.submitting || !this.questions.length || !this.startedAt) {
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    this.completedAt = new Date().toISOString();

    const elapsedSeconds = Math.max(
      1,
      Math.round((Date.parse(this.completedAt) - this.startedAtMs) / 1000),
    );
    const averageSeconds = Math.max(1, Math.round(elapsedSeconds / this.questions.length));

    const responses: DiagnosticSubmissionResponse[] = this.questions
      .map((question, index) => ({
        questionId: question.id,
        answer: this.answers[index],
      }))
      .filter((response): response is { questionId: string; answer: number } => response.answer !== null)
      .map((response) => ({ ...response, secondsSpent: averageSeconds }));

    this.diagnosticService
      .submitDiagnostic({
        testId: this.testId,
        startedAt: this.startedAt,
        completedAt: this.completedAt,
        responses,
      })
      .subscribe({
        next: (result) => {
          this.submitting = false;
          this.router.navigate(['/worksheet', result.level]);
        },
        error: () => {
          this.submitting = false;
          this.errorMessage = 'Unable to submit diagnostic test. Please try again.';
        },
      });
  }

  previousQuestion(): void {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex -= 1;
    }
  }

  nextQuestion(): void {
    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.currentQuestionIndex += 1;
    }
  }

  get currentQuestion(): DiagnosticQuestion | null {
    return this.questions[this.currentQuestionIndex] ?? null;
  }

  get isLastQuestion(): boolean {
    return this.currentQuestionIndex === this.questions.length - 1;
  }
}
