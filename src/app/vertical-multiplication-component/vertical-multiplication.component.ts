
import {Component, Input, Output, EventEmitter, numberAttribute} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-vertical-multiplication-component',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vertical-multiplication.component.html',
  styleUrl: './vertical-multiplication.component.css',
})
export class VerticalMultiplicationComponent {
  @Input({transform: numberAttribute}) top!: number;
  @Input({transform: numberAttribute}) bottom!: number;
  @Input({transform: (value: string | number | string[]): string | number | null => {
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? null : parsed;
    }
    if (typeof value === 'number') {
      return value;
    }
    return null;
  }}) answer: string | number | null = null;

  @Output() answerChange = new EventEmitter<string>();

  onInput(e: any) {
    this.answerChange.emit(e.target.value);
  }
}
