import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-worksheet-result-card',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    @if (checked()) {
      @if (isCorrect()) {
        <p class="mt-1 text-sm text-green-700 font-medium">✓ {{ 'worksheet.correct' | translate }}</p>
      } @else {
        <p class="mt-1 text-sm text-red-600 font-medium">✗ {{ 'worksheet.incorrect' | translate }}</p>
      }
      @if (showAnswer()) {
        <p class="mt-1 text-sm text-slate-600">{{ 'worksheet.answer' | translate }}: {{ correctAnswer() }}</p>
      }
    }
  `,
})
export class WorksheetResultCardComponent {
  readonly checked = input(false);
  readonly isCorrect = input(false);
  readonly correctAnswer = input<number | string>('');
  readonly showAnswer = input(false);
}
