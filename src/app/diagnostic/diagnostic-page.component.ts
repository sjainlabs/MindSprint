import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LearningApiService, DiagnosticQuestion } from '../services/learning-api.service';
import { OnboardingFlowService } from '../services/onboarding-flow.service';

@Component({
  selector: 'app-diagnostic-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="page">
      <section class="card" *ngIf="loading()">Loading diagnostic...</section>

      <section class="card" *ngIf="!loading() && activeQuestion() as question">
        <h1>Diagnostic Test</h1>
        <p>Question {{ currentIndex() + 1 }} of {{ questions().length }}</p>
        <progress [value]="currentIndex() + 1" [max]="questions().length"></progress>

        <h2>{{ question.prompt }}</h2>

        <label class="choice" *ngFor="let choice of question.choices">
          <input
            type="radio"
            [name]="question.id"
            [value]="choice"
            [checked]="answers()[question.id] === choice"
            (change)="saveAnswer(question.id, choice)"
          />
          <span>{{ choice }}</span>
        </label>

        <div class="actions">
          <button (click)="prev()" [disabled]="currentIndex() === 0">Back</button>
          <button *ngIf="!isLastQuestion()" (click)="next()">Next</button>
          <button *ngIf="isLastQuestion()" class="primary" (click)="submit()">Submit Test</button>
        </div>
      </section>
    </main>
  `,
  styles: [
    `
      .page { max-width: 760px; margin: 0 auto; padding: 16px; }
      .card { background: #fff; border-radius: 16px; padding: 16px; display: grid; gap: 12px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08); }
      h1, h2, p { margin: 0; }
      .choice { border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px; display: flex; gap: 8px; align-items: center; }
      .actions { display: flex; justify-content: space-between; gap: 10px; }
      button { border: 0; border-radius: 12px; padding: 10px 14px; font-weight: 700; background: #e2e8f0; }
      .primary { background: #2563eb; color: #fff; }
      progress { width: 100%; height: 10px; }
    `,
  ],
})
export class DiagnosticPageComponent implements OnInit {
  private readonly api = inject(LearningApiService);
  private readonly onboarding = inject(OnboardingFlowService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly questions = signal<DiagnosticQuestion[]>([]);
  readonly currentIndex = signal(0);
  readonly answers = signal<Record<string, string>>({});
  readonly diagnosticId = signal('');

  readonly activeQuestion = computed(() => this.questions()[this.currentIndex()] ?? null);
  readonly isLastQuestion = computed(() => this.currentIndex() === this.questions().length - 1);

  async ngOnInit(): Promise<void> {
    const state = this.onboarding.getState();
    const response = await this.api.startDiagnostic(state.grade || '4', state.topics);
    this.questions.set(response.questions.slice(0, 25));
    this.diagnosticId.set(response.diagnosticId);
    this.loading.set(false);
  }

  saveAnswer(questionId: string, choice: string): void {
    this.answers.set({ ...this.answers(), [questionId]: choice });
  }

  next(): void {
    if (!this.isLastQuestion()) {
      this.currentIndex.set(this.currentIndex() + 1);
    }
  }

  prev(): void {
    if (this.currentIndex() > 0) {
      this.currentIndex.set(this.currentIndex() - 1);
    }
  }

  async submit(): Promise<void> {
    const response = await firstValueFrom(this.api.submitDiagnostic(this.diagnosticId(), this.answers()));
    this.onboarding.setState({ completed: true });
    await this.router.navigate(['/diagnostic/result'], {
      queryParams: {
        score: response.score,
        nextGrade: response.nextGrade,
      },
    });
  }
}

