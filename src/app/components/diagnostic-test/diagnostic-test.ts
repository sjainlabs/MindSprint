import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  type DiagnosticQuestion,
  type DiagnosticResult,
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
  answers: Record<string, number | null> = {};
  loading = false;
  submitting = false;
  errorMessage = '';
  result: DiagnosticResult | null = null;
  private startedAt = '';

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
    this.result = null;

    this.diagnosticService.startDiagnostic().subscribe({
      next: (test) => {
        this.testId = test.testId;
        this.questions = test.questions;
        this.startedAt = new Date().toISOString();
        this.answers = Object.fromEntries(this.questions.map((question) => [question.id, null]));
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Unable to load diagnostic test. Please try again.';
      },
    });
  }

  submitTest(): void {
    if (!this.testId || this.submitting) {
      return;
    }

    this.submitting = true;
    this.errorMessage = '';

    const elapsedSeconds = Math.max(1, Math.round((Date.now() - Date.parse(this.startedAt)) / 1000));
    const averageSeconds = Math.max(1, Math.round(elapsedSeconds / this.questions.length));

    const responses: DiagnosticSubmissionResponse[] = this.questions
      .map((question) => ({
        questionId: question.id,
        answer: this.answers[question.id],
      }))
      .filter((response): response is { questionId: string; answer: number } => response.answer !== null)
      .map((response) => ({ ...response, secondsSpent: averageSeconds }));

    this.diagnosticService
      .submitDiagnostic({
        testId: this.testId,
        startedAt: this.startedAt,
        completedAt: new Date().toISOString(),
        responses,
      })
      .subscribe({
        next: (result) => {
          this.result = result;
          this.submitting = false;
        },
        error: () => {
          this.submitting = false;
          this.errorMessage = 'Unable to submit diagnostic test. Please try again.';
        },
      });
  }

  goToWorksheet(): void {
    if (!this.result) {
      return;
    }

    this.router.navigate(['/worksheet', this.result.level]);
  }
}
