import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EnhancedWorksheetQuestionV2 } from '../../services/learning-api.service';

/**
 * Decimal/Percent Input Component
 * Handles decimal number entry and percent conversions
 * Supports validation for valid decimal ranges
 */
@Component({
  selector: 'app-decimal-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="decimal-input-container">
      <h3>{{ question.prompt }}</h3>

      <div class="input-wrapper">
        <input
          type="number"
          [(ngModel)]="inputValue"
          [disabled]="isReadOnly"
          [attr.step]="decimalStep"
          [attr.min]="minValue"
          [attr.max]="maxValue"
          placeholder="Enter decimal number"
          (change)="validateInput()"
          aria-label="Decimal number input"
          class="decimal-input"
          [class.has-error]="hasError()"
        />
        <span class="unit-label" *ngIf="question.metadata?.['includePercent']">%</span>
      </div>

      <div class="hint-text" *ngIf="question.metadata?.['decimalPlaces']">
        {{ question.metadata?.['decimalPlaces'] ?? '' }}

      </div>

      <button class="submit-btn" (click)="submit()" [disabled]="isReadOnly || !inputValue">
        ✓ Confirm
      </button>

      <p class="error-message" *ngIf="hasError()">
        {{ errorMessage() }}
      </p>
    </div>
  `,
  styles: [`
    .decimal-input-container {
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

    .input-wrapper {
      display: flex;
      align-items: center;
      gap: 8px;
      position: relative;
    }

    .decimal-input {
      flex: 1;
      padding: 12px;
      font-size: 1.1rem;
      font-weight: 600;
      border: 2px solid rgba(108, 99, 255, 0.15);
      border-radius: 10px;
      background: white;
      font-family: 'Courier New', monospace;
      transition: all 0.15s;
    }

    .decimal-input:focus {
      outline: none;
      border-color: var(--primary, #6C63FF);
      box-shadow: 0 0 0 3px rgba(108, 99, 255, 0.1);
    }

    .decimal-input.has-error {
      border-color: var(--error, #E53935);
      background: rgba(229, 57, 53, 0.05);
    }

    .decimal-input:disabled {
      background: #f0f0f0;
      opacity: 0.6;
    }

    .unit-label {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--secondary, #FFB74D);
    }

    .hint-text {
      font-size: 0.8rem;
      color: #64748b;
      margin: 0;
    }

    .submit-btn {
      padding: 10px 16px;
      background: var(--primary, #6C63FF);
      color: white;
      border: none;
      border-radius: 10px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s;
    }

    .submit-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(108, 99, 255, 0.25);
    }

    .submit-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
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
export class DecimalInputComponent {
  @Input() question!: EnhancedWorksheetQuestionV2;
  @Input() isReadOnly = false;
  @Output() answerChange = new EventEmitter<number>();

  inputValue = '';
  hasError = signal(false);
  errorMessage = signal('');

  get decimalStep(): string {
    const places = this.question.metadata?.['decimalPlaces'] || 2;
    return `0.${'0'.repeat(places === 0 ? 1 : places)}`;
  }

  get minValue(): string {
    return this.question.metadata?.['minValue']?.toString() || '-999999';
  }

  get maxValue(): string {
    return this.question.metadata?.['maxValue']?.toString() || '999999';
  }

  validateInput(): void {
    if (!this.inputValue) {
      this.errorMessage.set('Please enter a number');
      this.hasError.set(true);
      return;
    }

    const value = parseFloat(this.inputValue);
    if (isNaN(value)) {
      this.errorMessage.set('Invalid decimal format');
      this.hasError.set(true);
      return;
    }

    const places = this.question.metadata?.['decimalPlaces'] || 2;
    const decimals = (this.inputValue.split('.')[1] || '').length;
    if (places !== -1 && decimals > places) {
      this.errorMessage.set(`Maximum ${places} decimal place(s) allowed`);
      this.hasError.set(true);
      return;
    }

    this.hasError.set(false);
  }

  submit(): void {
    this.validateInput();
    if (!this.hasError()) {
      const value = parseFloat(this.inputValue);
      this.answerChange.emit(value);
    }
  }
}

