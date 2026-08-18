import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EnhancedWorksheetQuestionV2, QuestionType } from '../../services/learning-api.service';
import { MultiSelectQuestionComponent } from './multi-select-question.component';
import { NumberPadInputComponent } from './number-pad-input.component';
import { FractionInputComponent } from './fraction-input.component';

/**
 * Universal Question Renderer Component
 * Routes questions to the correct input component based on type
 * Provides fallback UI for unsupported question types
 * Handles answer validation and tracking
 */
@Component({
  selector: 'app-question-renderer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MultiSelectQuestionComponent,
    NumberPadInputComponent,
    FractionInputComponent
  ],
  template: `
    <section class="question-card" [class.read-only]="isReadOnly">
      <div class="question-header">
        <h2>Question {{ questionIndex }}</h2>
        <span class="question-count">of {{ totalQuestions }}</span>
      </div>

      <!-- Multi-Select Questions -->
      <app-multi-select-question
        *ngIf="question.type === 'multi_select'"
        [question]="question"
        [isReadOnly]="isReadOnly"
        (answerChange)="onAnswerChange($event)"
      ></app-multi-select-question>

      <!-- Number Pad for Arithmetic -->
      <app-number-pad-input
        *ngIf="question.type === 'number_pad' || (question.type === 'short_text' && question.metadata?.['operation'])"
        [question]="question"
        [isReadOnly]="isReadOnly"
        (answerChange)="onAnswerChange($event)"
      ></app-number-pad-input>

      <!-- Fraction Input -->
      <app-fraction-input
        *ngIf="question.type === 'fraction_input'"
        [question]="question"
        [isReadOnly]="isReadOnly"
        (answerChange)="onAnswerChange($event)"
      ></app-fraction-input>

      <!-- Multiple Choice (Standard) -->
      <div *ngIf="question.type === 'multiple_choice'" class="multiple-choice-container">
        <h3>{{ question.prompt }}</h3>
        <div class="options">
          <label class="option-item" *ngFor="let choice of question.choices; let i = index">
            <input
              type="radio"
              [name]="'q-' + question.id"
              [value]="choice"
              [disabled]="isReadOnly"
              (change)="onAnswerChange(choice)"
              [checked]="currentAnswer() === choice"
              aria-label="Option {{ i + 1 }}"
            />
            <span class="option-text">{{ choice }}</span>
          </label>
        </div>
      </div>

      <!-- Short Text (Fallback) -->
      <div *ngIf="question.type === 'short_text' && !question.metadata?.['operation']" class="short-text-container">
        <h3>{{ question.prompt }}</h3>
        <textarea
          class="answer-input"
          [(ngModel)]="textAnswer"
          (ngModelChange)="onAnswerChange($event)"
          [disabled]="isReadOnly"
          placeholder="Type your answer here..."
          rows="3"
          aria-label="Answer text"
        ></textarea>
      </div>

      <!-- Unsupported/Placeholder -->
      <div *ngIf="isUnsupported()" class="unsupported-container">
        <h3>{{ question.prompt }}</h3>
        <p class="unsupported-message">
          This question type ({{ question.type }}) is not yet fully supported.
          Please provide your best answer below.
        </p>
        <textarea
          class="answer-input"
          [(ngModel)]="textAnswer"
          (ngModelChange)="onAnswerChange($event)"
          [disabled]="isReadOnly"
          placeholder="Type your answer..."
          rows="3"
          aria-label="Answer text"
        ></textarea>
      </div>

      <!-- Review Mode (Show Correct Answer) -->
      <div *ngIf="isReadOnly && question.correct !== undefined" class="review-section">
        <div class="review-badge" [class.correct]="question.correct" [class.incorrect]="!question.correct">
          {{ question.correct ? '✔ Correct' : '❌ Incorrect' }}
        </div>
        <div class="mastery-info" *ngIf="question.masteryDelta">
          Mastery change: <span [class.positive]="question.masteryDelta > 0">
            {{ question.masteryDelta > 0 ? '+' : '' }}{{ question.masteryDelta.toFixed(1) }}%
          </span>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .question-card {
      background: linear-gradient(180deg, #ffffff, #fbfbff);
      border-radius: 14px;
      padding: 16px;
      margin-bottom: 12px;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
      display: grid;
      gap: 12px;
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .question-card.read-only {
      opacity: 0.95;
      background: linear-gradient(180deg, #f8f9ff, #f0f2ff);
    }

    .question-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .question-header h2 {
      margin: 0;
      font-size: 1.05rem;
      color: var(--primary, #6C63FF);
    }

    .question-count {
      font-size: 0.85rem;
      color: #64748b;
      font-weight: 600;
    }

    .multiple-choice-container,
    .short-text-container,
    .unsupported-container {
      display: grid;
      gap: 10px;
    }

    h3 {
      margin: 0;
      font-size: 1rem;
      color: #1f2937;
      line-height: 1.5;
    }

    .options {
      display: grid;
      gap: 8px;
    }

    .option-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px;
      background: white;
      border: 2px solid rgba(108, 99, 255, 0.1);
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.15s;
    }

    .option-item:hover {
      background: rgba(108, 99, 255, 0.05);
      border-color: var(--primary, #6C63FF);
    }

    .option-item input[type="radio"] {
      margin-top: 2px;
      cursor: pointer;
      accent-color: var(--primary, #6C63FF);
    }

    .option-text {
      flex: 1;
      color: #334155;
      font-weight: 500;
    }

    .answer-input {
      width: 100%;
      padding: 12px;
      border: 2px solid rgba(108, 99, 255, 0.15);
      border-radius: 10px;
      font-size: 0.95rem;
      font-family: inherit;
      resize: vertical;
      min-height: 80px;
      background: white;
      transition: all 0.15s;
    }

    .answer-input:focus {
      outline: none;
      border-color: var(--primary, #6C63FF);
      background: rgba(108, 99, 255, 0.02);
      box-shadow: 0 0 0 3px rgba(108, 99, 255, 0.1);
    }

    .answer-input:disabled {
      background: #f0f0f0;
      color: #64748b;
    }

    .unsupported-message {
      font-size: 0.85rem;
      color: #64748b;
      margin: 0;
      padding: 8px;
      background: rgba(255, 183, 77, 0.08);
      border-left: 3px solid var(--secondary, #FFB74D);
      border-radius: 4px;
    }

    .review-section {
      display: grid;
      gap: 8px;
      padding: 12px;
      background: rgba(108, 99, 255, 0.04);
      border-radius: 10px;
      border: 1px solid rgba(108, 99, 255, 0.1);
    }

    .review-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 700;
      width: fit-content;
    }

    .review-badge.correct {
      background: rgba(76, 175, 80, 0.2);
      color: var(--success, #4CAF50);
    }

    .review-badge.incorrect {
      background: rgba(229, 57, 53, 0.2);
      color: var(--error, #E53935);
    }

    .mastery-info {
      font-size: 0.85rem;
      color: #475569;
    }

    .mastery-info .positive {
      color: var(--success, #4CAF50);
      font-weight: 700;
    }
  `]
})
export class QuestionRendererComponent {
  @Input() question!: EnhancedWorksheetQuestionV2;
  @Input() questionIndex = 1;
  @Input() totalQuestions = 1;
  @Input() isReadOnly = false;
  @Output() answerChange = new EventEmitter<string | number | string[]>();

  currentAnswer = signal<string | number | string[]| number[]>('');
  textAnswer = '';
  // question: import("/Users/sjain/git/MindSprint/src/app/services/learning-api.service").PracticeWorksheetQuestion;

  ngOnInit(): void {
    if (this.question.submittedAnswer) {
      this.currentAnswer.set(this.question.submittedAnswer);
    }
  }

  onAnswerChange(answer: string | number | string[]): void {
    this.currentAnswer.set(answer);
    this.answerChange.emit(answer);
  }

  isUnsupported(): boolean {
    const supported: QuestionType[] = [
      'short_text',
      'multiple_choice',
      'multi_select',
      'number_pad',
      'fraction_input'
    ];
    return !supported.includes(this.question.type);
  }
}

