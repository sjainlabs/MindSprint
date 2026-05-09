import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  type DiagnosticQuestion,
  DiagnosticService,
  type DiagnosticSubmissionResponse,
} from '../../services/diagnostic.service';

@Component({
  selector: 'app-diagnostic-test',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './diagnostic-test.html',
  styleUrl: './diagnostic-test.css',
})
export class DiagnosticTestComponent implements OnInit {
  testId = '';
  questions: DiagnosticQuestion[] = [];
  answers: Array<number | null> = [];
  currentQuestionIndex = 0;
  loading = false;
  submitting = false;
  errorMessage = '';
  startTime = '';
  endTime = '';

  constructor(
    private readonly diagnosticService: DiagnosticService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
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
    this.startTime = '';
    this.endTime = '';

    this.diagnosticService.startDiagnostic().subscribe({
      next: (test) => {
        this.testId = test.testId;
        this.questions = test.questions.slice(0, 20);
        this.startTime = new Date().toISOString();
        this.answers = this.questions.map(() => null);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Unable to load diagnostic test. Please try again.';
        this.cdr.detectChanges();
      },
    });
  }

  get currentQuestion(): DiagnosticQuestion | null {
    return this.questions[this.currentQuestionIndex] ?? null;
  }

  get isLastQuestion(): boolean {
    return this.currentQuestionIndex === this.questions.length - 1;
  }

  get answeredCount(): number {
    return this.answers.filter((answer) => answer !== null).length;
  }

  updateAnswer(value: number | string | null): void {
    if (!this.currentQuestion) {
      return;
    }

    const answer = value === '' || value === null ? null : Number(value);
    this.answers[this.currentQuestionIndex] = answer === null || Number.isNaN(answer) ? null : answer;
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

  submitTest(): void {
    if (!this.testId || !this.questions.length || !this.startTime || this.submitting) {
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    this.endTime = new Date().toISOString();

    const elapsedSeconds = Math.max(1, Math.round((Date.parse(this.endTime) - Date.parse(this.startTime)) / 1000));
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
        startedAt: this.startTime,
        completedAt: this.endTime,
        responses,
      })
      .subscribe({
        next: (result) => {
          this.submitting = false;
          this.cdr.detectChanges();
          void this.router.navigate(['/worksheet'], { queryParams: { level: result.level } });
        },
        error: () => {
          this.submitting = false;
          this.errorMessage = 'Unable to submit diagnostic test. Please try again.';
          this.cdr.detectChanges();
        },
      });
  }
}
