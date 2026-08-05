import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { InsightsService } from '../../services/insights.service';
import {
  type PracticeWorksheetResponse,
  type PracticeWorksheetQuestion,
} from '../../services/learning-api.service';

interface AnswerRecord {
  questionId: string;
  answer: string;
  timeMs: number;
}

@Component({
  selector: 'app-worksheet',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './worksheet.component.html',
})
export class WorksheetComponent implements OnInit {
  private readonly insights = inject(InsightsService);
  private readonly auth = inject(AuthService);
  protected readonly router = inject(Router);
  readonly results = signal<any>(null);

  // ── Worksheet data from router state ────────────────────────────────────────
  worksheet = signal<PracticeWorksheetResponse | null>(null);
  selectedTopics = signal<string[]>([]);
  selectedGrade = signal<number | string>('');
  selectedLevel = signal<string>('');

  // ── Answer state ─────────────────────────────────────────────────────────────
  currentIndex = signal(0);
  currentAnswer = signal('');
  answers = signal<AnswerRecord[]>([]);
  questionStartTime = signal(Date.now());

  // ── UI state ─────────────────────────────────────────────────────────────────
  loading = signal(false);
  feedback = signal('');
  submitted = signal(false);

  // ── Derived ──────────────────────────────────────────────────────────────────
  questions = computed<PracticeWorksheetQuestion[]>(
    () => this.worksheet()?.questions ?? [],
  );

  currentQuestion = computed<PracticeWorksheetQuestion | null>(
    () => this.questions()[this.currentIndex()] ?? null,
  );

  isLastQuestion = computed(
    () => this.currentIndex() === this.questions().length - 1,
  );

  percentComplete = computed(() => {
    const total = this.questions().length;
    if (!total) return 0;
    return Math.round((this.answers().length / total) * 100);
  });

  ngOnInit(): void {
    const state = history.state as {
      worksheet?: PracticeWorksheetResponse;
      selectedTopics?: string[];
      selectedGrade?: number | string;
      selectedLevel?: string;
    };

    if (!state?.worksheet?.questions?.length) {
      // No worksheet in state — redirect back to hub
      void this.router.navigate(['/practice/hub']);
      return;
    }

    this.worksheet.set(state.worksheet);
    this.selectedTopics.set(state.selectedTopics ?? []);
    this.selectedGrade.set(state.selectedGrade ?? '');
    this.selectedLevel.set(state.selectedLevel ?? '');
    this.questionStartTime.set(Date.now());
  }

  next(): void {
    const answer = this.currentAnswer().trim();
    if (!answer) {
      this.feedback.set('Please enter an answer.');
      return;
    }

    const q = this.currentQuestion();
    if (!q) return;

    const timeMs = Date.now() - this.questionStartTime();
    this.answers.update((prev) => [
      ...prev,
      { questionId: q.id, answer, timeMs },
    ]);
    this.currentAnswer.set('');
    this.feedback.set('');
    this.questionStartTime.set(Date.now());

    if (!this.isLastQuestion()) {
      this.currentIndex.update((i) => i + 1);
    }
  }

  submit(): void {
    // Capture current answer if not yet recorded
    const answer = this.currentAnswer().trim();
    const q = this.currentQuestion();
    const allAnswers = [...this.answers()];

    if (answer && q && !allAnswers.find((a) => a.questionId === q.id)) {
      allAnswers.push({ questionId: q.id, answer, timeMs: Date.now() - this.questionStartTime() });
    }

    const worksheetData = this.worksheet();
    const studentId = this.auth.getStoredStudentId() ?? 'unknown';

    const payload = {
      studentId,
      topicId: this.selectedTopics().join(','),
      worksheetId: worksheetData?.worksheetId ?? `worksheet-${Date.now()}`,
      answers: allAnswers,
      metadata: {
        grade: this.selectedGrade(),
        level: this.selectedLevel(),
        topics: this.selectedTopics(),
        submittedAt: new Date().toISOString(),
      },
    };

    this.loading.set(true);
    this.feedback.set('');

    this.insights.submitWorksheetResults(payload).subscribe({
      next: (res) => {
        this.loading.set(false);
        // NEW — store progression results (status, mastery, etc.)
        this.results.set(res);
        this.submitted.set(true);
        this.feedback.set('Worksheet submitted successfully!');
      },
      error: () => {
        this.loading.set(false);
        this.feedback.set('Failed to submit worksheet. Please try again.');
      },
    });
  }

  goBack(): void {
    void this.router.navigate(['/practice/hub']);
  }
}
