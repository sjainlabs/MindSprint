import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EnhancedWorksheetQuestionV2 } from '../../services/learning-api.service';

/**
 * Number Pad Input Component
 * Touch-friendly number input for arithmetic questions
 * Supports integers and decimals with validation
 */
@Component({
  selector: 'app-number-pad-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="number-pad-container">
      <h3>{{ question.prompt }}</h3>

      <div class="input-display">
        <input
          type="text"
          [value]="displayValue()"
          readonly
          class="input-field"
          [class.has-error]="hasError()"
          placeholder="Enter answer"
          aria-label="Answer display"
        />
        <button class="clear-btn" (click)="clear()" *ngIf="displayValue()">
          ⌫ Clear
        </button>
      </div>

      <div class="number-pad">
        <div class="pad-row" *ngFor="let row of numberRows">
          <button
            class="pad-button"
            (click)="addDigit(btn)"
            [disabled]="isReadOnly"
            *ngFor="let btn of row"
          >
            {{ btn }}
          </button>
        </div>

        <div class="pad-row">
          <button class="pad-button decimal-btn" (click)="addDecimal()" [disabled]="isReadOnly">
            .
          </button>
          <button class="pad-button negative-btn" (click)="toggleNegative()" [disabled]="isReadOnly">
            −
          </button>
          <button class="pad-button enter-btn" (click)="submit()">
            ✓ Enter
          </button>
        </div>
      </div>

      <p class="error-message" *ngIf="hasError()">
        {{ errorMessage() }}
      </p>
    </div>
  `,
  styles: [`
    .number-pad-container {
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

    .input-display {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .input-field {
      flex: 1;
      padding: 12px;
      font-size: 1.2rem;
      font-weight: 700;
      border: 2px solid rgba(108, 99, 255, 0.15);
      border-radius: 10px;
      background: white;
      text-align: right;
      font-family: 'Courier New', monospace;
      min-height: 44px;
      transition: border-color 0.2s;
    }

    .input-field.has-error {
      border-color: var(--error, #E53935);
      background: rgba(229, 57, 53, 0.05);
    }

    .clear-btn {
      padding: 8px 12px;
      background: var(--error, #E53935);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }

    .clear-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(229, 57, 53, 0.25);
    }

    .number-pad {
      display: grid;
      gap: 8px;
    }

    .pad-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }

    .pad-button {
      min-height: 50px;
      min-width: 50px;
      padding: 12px;
      background: white;
      border: 2px solid rgba(108, 99, 255, 0.15);
      border-radius: 10px;
      font-size: 1.2rem;
      font-weight: 700;
      cursor: pointer;
      color: #1f2937;
      transition: all 0.15s;
    }

    .pad-button:hover:not(:disabled) {
      background: rgba(108, 99, 255, 0.1);
      border-color: var(--primary, #6C63FF);
      transform: translateY(-2px);
    }

    .pad-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .decimal-btn {
      background: rgba(255, 183, 77, 0.1);
      border-color: var(--secondary, #FFB74D);
      color: var(--secondary, #FFB74D);
    }

    .negative-btn {
      background: rgba(229, 57, 53, 0.1);
      border-color: var(--error, #E53935);
      color: var(--error, #E53935);
    }

    .enter-btn {
      grid-column: span 1;
      background: linear-gradient(135deg, var(--primary, #6C63FF), #8f84ff);
      color: white;
      border-color: var(--primary, #6C63FF);
      font-weight: 700;
    }

    .enter-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(108, 99, 255, 0.25);
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
export class NumberPadInputComponent {
  @Input() question!: EnhancedWorksheetQuestionV2;
  @Input() isReadOnly = false;
  @Output() answerChange = new EventEmitter<number>();

  displayValue = signal('');
  hasError = signal(false);
  errorMessage = signal('');
  isNegative = signal(false);

  numberRows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['0']
  ];

  addDigit(digit: string): void {
    if (this.isReadOnly) return;
    const current = this.displayValue();
    if (current.length < 10) {
      this.displayValue.set(current + digit);
      this.hasError.set(false);
    }
  }

  addDecimal(): void {
    if (this.isReadOnly) return;
    const current = this.displayValue();
    if (!current.includes('.') && current !== '') {
      this.displayValue.set(current + '.');
    }
  }

  toggleNegative(): void {
    if (this.isReadOnly) return;
    const current = this.displayValue();
    if (current === '') return;

    if (current.startsWith('−')) {
      this.displayValue.set(current.substring(1));
    } else {
      this.displayValue.set('−' + current);
    }
  }

  clear(): void {
    this.displayValue.set('');
    this.hasError.set(false);
    this.errorMessage.set('');
  }

  submit(): void {
    const value = this.displayValue();
    if (!value || value === '−') {
      this.hasError.set(true);
      this.errorMessage.set('Please enter a number');
      return;
    }

    const numValue = parseFloat(value.replace('−', '-'));
    if (isNaN(numValue)) {
      this.hasError.set(true);
      this.errorMessage.set('Invalid number format');
      return;
    }

    this.answerChange.emit(numValue);
  }
}

