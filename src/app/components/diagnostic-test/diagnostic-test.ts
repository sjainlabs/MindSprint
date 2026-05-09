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
  testId = '';
  questions: DiagnosticQuestion[] = [];
  answers: Array<number | null> = [];
  currentQuestionIndex = 0;
  submitting = false;
  errorMessage = '';
  private startedAt = '';
  private secondsSpentPerQuestion: number[] = [];
  private questionStartTime = Date.now();

  constructor(
    private readonly diagnosticService: DiagnosticService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    const test = this.diagnosticService.currentTest;
    const startedAt = this.diagnosticService.startedAt;
    if (!test || !startedAt) {
      void this.router.navigate(['/diagnostic']);
      return;
    }
    this.testId = test.testId;
    this.questions = test.questions.slice(0, 20);
    this.startedAt = startedAt.toISOString();
    this.answers = Array.from({ length: this.questions.length }, () => null);
    this.secondsSpentPerQuestion = Array.from({ length: this.questions.length }, () => 0);
    this.questionStartTime = Date.now();
  }

  submitTest(): void {
    if (!this.testId || this.submitting || this.questions.length === 0) {
      return;
    }

    this.recordTimeForCurrentQuestion();
    this.submitting = true;
    this.errorMessage = '';

    const completedAt = new Date().toISOString();

    const responses: DiagnosticSubmissionResponse[] = this.questions
      .map((question, index) => ({
        questionId: question.id,
        answer: this.answers[index],
        secondsSpent: Math.max(1, this.secondsSpentPerQuestion[index]),
      }))
      .filter((r): r is DiagnosticSubmissionResponse => r.answer !== null);

    this.diagnosticService
      .submitDiagnostic({
        testId: this.testId,
        startedAt: this.startedAt,
        completedAt,
        responses,
      })
      .subscribe({
        next: (result) => {
          this.diagnosticService.lastResult = result;
          this.submitting = false;
          void this.router.navigate(['/results']);
        },
        error: () => {
          this.submitting = false;
          this.errorMessage = 'Unable to submit diagnostic test. Please try again.';
        },
      });
  }

  goToPreviousQuestion(): void {
    if (this.currentQuestionIndex === 0) {
      return;
    }
    this.recordTimeForCurrentQuestion();
    this.currentQuestionIndex -= 1;
  }

  goToNextQuestion(): void {
    if (this.currentQuestionIndex >= this.questions.length - 1) {
      return;
    }
    this.recordTimeForCurrentQuestion();
    this.currentQuestionIndex += 1;
  }

  setCurrentAnswer(value: string | number | null): void {
    if (value === '' || value === null || value === undefined) {
      this.answers[this.currentQuestionIndex] = null;
      return;
    }

    const parsedValue = Number(value);
    this.answers[this.currentQuestionIndex] = Number.isFinite(parsedValue) ? parsedValue : null;
  }

  get currentQuestion(): DiagnosticQuestion | null {
    return this.questions[this.currentQuestionIndex] ?? null;
  }

  get answeredCount(): number {
    return this.answers.filter((answer) => answer !== null).length;
  }

  private recordTimeForCurrentQuestion(): void {
    const elapsed = Math.max(1, Math.round((Date.now() - this.questionStartTime) / 1000));
    this.secondsSpentPerQuestion[this.currentQuestionIndex] =
      (this.secondsSpentPerQuestion[this.currentQuestionIndex] ?? 0) + elapsed;
    this.questionStartTime = Date.now();
  }
}
