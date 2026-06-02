import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { combineLatest } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { PracticeService, type Worksheet } from '../../services/practice.service';
import {
  type LearningLevel,
  normalizeLearningLevelIdentifier,
} from '../../services/diagnostic.service';

const NUMERIC_ANSWER_EPSILON = 1e-9;
const FRACTION_ANSWER_PATTERN = /^-?\d+\/\d+$/;

@Component({
  selector: 'app-worksheet-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './worksheet-page.html',
  styleUrl: './worksheet-page.css',
})
export class WorksheetPageComponent implements OnInit {
  readonly worksheet = signal<Worksheet | null>(null);
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly ready = signal(false);
  readonly errorMessage = signal('');
  readonly submitError = signal('');
  readonly currentLevel = signal<LearningLevel>('Beginner');
  readonly studentId = signal('');
  readonly selectedTopicId = signal('');
  readonly worksheetStartedAt = signal(new Date().toISOString());
  readonly studentAnswers = signal<string[]>([]);

  readonly attemptedCount = computed(() =>
    this.studentAnswers().filter((value) => value.trim().length > 0).length,
  );

  readonly allQuestionsAnswered = computed(() => {
    const worksheet = this.worksheet();
    if (!worksheet) {
      return false;
    }

    return (
      this.studentAnswers().length === worksheet.questions.length &&
      this.attemptedCount() === worksheet.questions.length
    );
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly practiceService: PracticeService,
  ) {}

  ngOnInit(): void {
    combineLatest([this.route.paramMap, this.route.queryParamMap]).subscribe(
      ([params, queryParams]) => {
        const level = normalizeLearningLevelIdentifier(params.get('level'));
        if (!level) {
          this.errorMessage.set('Invalid worksheet level.');
          this.loading.set(false);
          this.ready.set(false);
          return;
        }

        this.currentLevel.set(level);
        this.selectedTopicId.set(queryParams.get('topicId')?.trim() ?? '');
        const requestedStudentId = queryParams.get('studentId')?.trim() ?? '';
        const activeStudentId = requestedStudentId || this.authService.getStoredStudentId()?.trim() || '';
        if (!activeStudentId) {
          this.errorMessage.set('Student not found. Select a child from the parent dashboard first.');
          this.loading.set(false);
          this.ready.set(false);
          return;
        }

        this.studentId.set(activeStudentId);
        this.authService.setActiveStudentId(activeStudentId);
        this.loadWorksheet(level, this.selectedTopicId() || undefined);
      },
    );
  }

  loadWorksheet(level: LearningLevel, topicId?: string): void {
    this.loading.set(true);
    this.ready.set(false);
    this.errorMessage.set('');
    this.submitError.set('');
    this.worksheet.set(null);
    this.studentAnswers.set([]);
    this.worksheetStartedAt.set(new Date().toISOString());

    this.practiceService.getPractice(level, topicId, this.studentId()).subscribe({
      next: (worksheet) => {
        if (!worksheet?.questions?.length) {
          this.errorMessage.set('Unable to load worksheet questions.');
          this.loading.set(false);
          return;
        }

        this.worksheet.set(worksheet);
        this.studentAnswers.set(Array.from({ length: worksheet.questions.length }, () => ''));
        this.loading.set(false);
        this.ready.set(true);
      },
      error: () => {
        this.errorMessage.set('Failed to load worksheet.');
        this.loading.set(false);
      },
    });
  }

  updateAnswer(index: number, value: string): void {
    this.studentAnswers.update((answers) => {
      const nextAnswers = [...answers];
      nextAnswers[index] = value;
      return nextAnswers;
    });
  }

  submitWorksheet(): void {
    const worksheet = this.worksheet();
    if (!worksheet || this.submitting() || !this.allQuestionsAnswered()) {
      return;
    }

    this.submitting.set(true);
    this.submitError.set('');

    this.practiceService
      .submitWorksheet({
        worksheetId: worksheet.worksheetId,
        studentId: this.studentId(),
        level: this.currentLevel(),
        startedAt: this.worksheetStartedAt(),
        submittedAt: new Date().toISOString(),
        answers: worksheet.questions.map((question, index) => ({
          questionId: question.id,
          answer: this.toSubmissionAnswer(this.studentAnswers()[index]),
        })),
      })
      .subscribe({
        next: async () => {
          this.submitting.set(false);
          await this.router.navigate(['/insights', this.studentId(), this.resolveTopicId()]);
        },
        error: () => {
          this.submitError.set('Failed to submit worksheet. Please try again.');
          this.submitting.set(false);
        },
      });
  }

  questionNumber(index: number): number {
    return index + 1;
  }

  private resolveTopicId(): string {
    return this.selectedTopicId() || this.worksheet()?.questions[0]?.operation || 'addition';
  }

  private toSubmissionAnswer(answer: string | undefined): number | string | null {
    const normalizedAnswer = this.normalizeAnswer(answer);
    if (!normalizedAnswer) {
      return null;
    }

    const numericAnswer = this.parseAnswerToNumber(normalizedAnswer);
    return numericAnswer ?? normalizedAnswer;
  }

  private normalizeAnswer(answer: string | number | undefined): string {
    if (answer === undefined) {
      return '';
    }

    return String(answer).trim().replace(/\s+/g, '').toLowerCase();
  }

  private parseAnswerToNumber(answer: string): number | null {
    if (!answer) {
      return null;
    }

    if (FRACTION_ANSWER_PATTERN.test(answer)) {
      const [numerator, denominator] = answer.split('/').map(Number);
      if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
        return null;
      }

      const value = numerator / denominator;
      return Math.abs(value) < NUMERIC_ANSWER_EPSILON ? 0 : value;
    }

    const parsed = Number(answer);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
