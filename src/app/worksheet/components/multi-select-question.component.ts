import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EnhancedWorksheetQuestionV2 } from '../../services/learning-api.service';

/**
 * Multi-Select Question Component
 * Allows students to select multiple correct answers from a list of choices
 * Used for questions that have more than one correct answer
 */
@Component({
  selector: 'app-multi-select-question',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="multi-select-container">
      <h3>{{ question.prompt }}</h3>
      <p class="hint" *ngIf="question.metadata?.['minSelect']">
        Select {{ question.metadata?.['minSelect'] }} to {{ question.metadata?.['maxSelect'] }} options
      </p>

      <div class="options-grid">
        <label class="option-item" *ngFor="let choice of question.choices; let i = index">
          <input
            type="checkbox"
            (change)="toggleOption(i)"
            [checked]="selectedIndices().includes(i)"
            [disabled]="isReadOnly"
            aria-label="Option {{ i + 1 }}"
          />
          <span class="option-text">{{ choice }}</span>
          <span class="check-icon" *ngIf="selectedIndices().includes(i)">✓</span>
        </label>
      </div>

      <p class="error-message" *ngIf="hasError">
        {{ errorMessage }}
      </p>
    </div>
  `,
  styles: [`
    .multi-select-container {
      padding: 16px;
      background: #f8f9ff;
      border-radius: 12px;
      display: grid;
      gap: 12px;
    }

    h3 {
      margin: 0;
      font-size: 1.05rem;
      color: #1f2937;
    }

    .hint {
      font-size: 0.85rem;
      color: #64748b;
      margin: 0;
    }

    .options-grid {
      display: grid;
      gap: 10px;
    }

    .option-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: white;
      border: 2px solid rgba(108, 99, 255, 0.15);
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .option-item:hover {
      background: rgba(108, 99, 255, 0.05);
      border-color: var(--primary, #6C63FF);
    }

    input[type="checkbox"] {
      width: 20px;
      height: 20px;
      cursor: pointer;
      accent-color: var(--primary, #6C63FF);
    }

    input[type="checkbox"]:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    .option-text {
      flex: 1;
      color: #334155;
      font-weight: 500;
    }

    .check-icon {
      color: var(--success, #4CAF50);
      font-weight: 700;
    }

    .error-message {
      color: var(--error, #E53935);
      font-size: 0.85rem;
      margin: 0;
      padding: 8px;
      background: rgba(229, 57, 53, 0.08);
      border-radius: 6px;
    }
  `]
})
export class MultiSelectQuestionComponent {
  @Input() question!: EnhancedWorksheetQuestionV2;
  @Input() isReadOnly = false;
  @Output() answerChange = new EventEmitter<string[]>();

  selectedIndices = signal<any>([]);
  hasError = signal(false);
  errorMessage = '';

  toggleOption(index: number): void {
    if (this.isReadOnly) return;

    const current = [...this.selectedIndices()];
    if (current.includes(index)) {
      this.selectedIndices.set(current.filter(i => i !== index));
    } else {
      current.push(index);
      if (this.question.metadata?.["maxSelect"] && current.length > this.question.metadata["maxSelect"]) {
        this.setError(`Maximum ${this.question.metadata["maxSelect"]} selections allowed`);
        return;
      }
      this.selectedIndices.set(current);
    }

    // Clear error if within bounds
    if (!this.question.metadata?.["minSelect"] || this.selectedIndices().length >= this.question.metadata?.["minSelect"]) {
      this.hasError.set(false);
    }

    const answers = this.selectedIndices().map((i: number) => this.question.choices![i]);

    this.answerChange.emit(answers);
  }

  setError(message: string): void {
    this.errorMessage = message;
    this.hasError.set(true);
  }
}

