import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EnhancedWorksheetQuestionV2 } from '../../services/learning-api.service';

/**
 * Fraction Input Component
 * Allows students to enter fractions (numerator/denominator)
 * Supports mixed numbers and improper fractions
 */
@Component({
  selector: 'app-fraction-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fraction-input-container">
      <h3>{{ question.prompt }}</h3>

      <div class="format-hint">
        <label>
          <input
            type="radio"
            name="format"
            value="improper"
            [(ngModel)]="format"
            [disabled]="isReadOnly"
          />
          Improper Fraction (e.g., 5/3)
        </label>
        <label>
          <input
            type="radio"
            name="format"
            value="mixed"
            [(ngModel)]="format"
            [disabled]="isReadOnly"
          />
          Mixed Number (e.g., 1 2/3)
        </label>
      </div>

      <div class="input-group" [ngSwitch]="format">
        <!-- Improper Fraction Input -->
        <div *ngSwitchCase="'improper'" class="improper-input">
          <div class="fraction-display">
            <input
              type="number"
              [(ngModel)]="numerator"
              placeholder="Numerator"
              [disabled]="isReadOnly"
              aria-label="Numerator"
              class="input-field numerator-field"
            />
            <div class="fraction-bar"></div>
            <input
              type="number"
              [(ngModel)]="denominator"
              placeholder="Denominator"
              [disabled]="isReadOnly"
              aria-label="Denominator"
              class="input-field denominator-field"
            />
          </div>
        </div>

        <!-- Mixed Number Input -->
        <div *ngSwitchCase="'mixed'" class="mixed-input">
          <input
            type="number"
            [(ngModel)]="wholeNumber"
            placeholder="Whole"
            [disabled]="isReadOnly"
            aria-label="Whole number"
            class="input-field whole-field"
          />
          <span class="mixed-label">+</span>
          <div class="fraction-display">
            <input
              type="number"
              [(ngModel)]="numerator"
              placeholder="Num"
              [disabled]="isReadOnly"
              aria-label="Numerator"
              class="input-field numerator-field"
            />
            <div class="fraction-bar"></div>
            <input
              type="number"
              [(ngModel)]="denominator"
              placeholder="Denom"
              [disabled]="isReadOnly"
              aria-label="Denominator"
              class="input-field denominator-field"
            />
          </div>
        </div>
      </div>

      <button class="submit-btn" (click)="submit()" [disabled]="isReadOnly">
        ✓ Confirm Answer
      </button>

      <p class="error-message" *ngIf="hasError()">
        {{ errorMessage() }}
      </p>
    </div>
  `,
  styles: [`
    .fraction-input-container {
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

    .format-hint {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .format-hint label {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      font-size: 0.9rem;
      color: #475569;
    }

    .format-hint input[type="radio"] {
      cursor: pointer;
    }

    .input-group {
      display: grid;
      gap: 12px;
    }

    .improper-input, .mixed-input {
      display: flex;
      gap: 12px;
      align-items: center;
      justify-content: center;
    }

    .fraction-display {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }

    .input-field {
      width: 80px;
      padding: 8px;
      border: 2px solid rgba(108, 99, 255, 0.15);
      border-radius: 8px;
      font-size: 1rem;
      text-align: center;
      font-weight: 600;
    }

    .input-field:focus {
      outline: none;
      border-color: var(--primary, #6C63FF);
      background: rgba(108, 99, 255, 0.05);
    }

    .input-field:disabled {
      opacity: 0.5;
      background: #f0f0f0;
    }

    .fraction-bar {
      width: 80px;
      height: 2px;
      background: var(--primary, #6C63FF);
      margin: 4px 0;
    }

    .whole-field {
      width: 60px;
    }

    .mixed-label {
      font-size: 1.2rem;
      color: #64748b;
      font-weight: 700;
    }

    .submit-btn {
      padding: 12px 20px;
      background: linear-gradient(135deg, var(--primary, #6C63FF), #8f84ff);
      color: white;
      border: none;
      border-radius: 10px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s;
    }

    .submit-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(108, 99, 255, 0.25);
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
export class FractionInputComponent {
  @Input() question!: EnhancedWorksheetQuestionV2;
  @Input() isReadOnly = false;
  @Output() answerChange = new EventEmitter<string>();

  format = 'improper';
  numerator = '';
  denominator = '';
  wholeNumber = '';
  hasError = signal(false);
  errorMessage = signal('');

  submit(): void {
    if (this.format === 'improper') {
      if (!this.numerator || !this.denominator) {
        this.setError('Please enter both numerator and denominator');
        return;
      }
      const answer = `${this.numerator}/${this.denominator}`;
      this.answerChange.emit(answer);
    } else {
      if (!this.numerator || !this.denominator) {
        this.setError('Please enter numerator and denominator');
        return;
      }
      const whole = this.wholeNumber || '0';
      const answer = `${whole} ${this.numerator}/${this.denominator}`;
      this.answerChange.emit(answer);
    }
  }

  setError(message: string): void {
    this.errorMessage.set(message);
    this.hasError.set(true);
  }
}

