import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnDestroy, Output, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FluencyEngine } from './fluency.engine';

const KEYPAD_ROWS = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['-', '0', '⌫'],
];

const MAX_INPUT_LENGTH = 6;

@Component({
  selector: 'app-fluency-mode',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fluency.html',
  styleUrl: './fluency.css',
})
export class FluencyModeComponent implements OnDestroy {
  readonly engine = input.required<FluencyEngine>();
  readonly loading = input(false);

  @Output() nextChallenge = new EventEmitter<void>();

  readonly inputValue = signal('');
  readonly keypadRows = KEYPAD_ROWS;

  onKeypadPress(digit: string): void {
    if (!this.engine().isRunning()) return;

    if (digit === '⌫') {
      this.inputValue.update((v) => v.slice(0, -1));
      return;
    }

    if (digit === '-') {
      if (this.inputValue().length === 0) {
        this.inputValue.set('-');
      }
      return;
    }

    this.inputValue.update((v) => (v.length < MAX_INPUT_LENGTH ? v + digit : v));
  }

  onSubmit(): void {
    const val = this.inputValue();
    if (!val.trim() || val === '-') return;

    const submitted = this.engine().submitAnswer(val);
    if (submitted) {
      this.inputValue.set('');
    }
  }

  onInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.onSubmit();
    }
  }

  onNextChallenge(): void {
    this.inputValue.set('');
    this.nextChallenge.emit();
  }

  timerBarClass(): string {
    const pct = this.engine().timerPercent();
    if (pct > 50) return 'fl-timer-bar--high';
    if (pct > 20) return 'fl-timer-bar--medium';
    return 'fl-timer-bar--low';
  }

  ngOnDestroy(): void {
    this.engine().stop();
  }
}
