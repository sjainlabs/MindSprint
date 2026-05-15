import { CommonModule } from '@angular/common';
import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AiPuzzleEngine } from './ai-puzzle.engine';

@Component({
  selector: 'app-ai-puzzle-mode',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-puzzle.html',
  styleUrl: './ai-puzzle.css',
})
export class AiPuzzleComponent {
  readonly engine = input.required<AiPuzzleEngine>();
  readonly loading = input(false);
  readonly submitAnswer = output<string>();
  readonly nextPuzzle = output<void>();

  readonly selectedOption = signal<string | null>(null);
  readonly textAnswer = signal('');

  onSelectOption(option: string): void {
    if (this.engine().isCompleted()) return;
    this.selectedOption.set(option);
  }

  onSubmit(): void {
    if (this.engine().isCompleted()) return;
    const answer = this.engine().hasOptions()
      ? (this.selectedOption() ?? '')
      : this.textAnswer().trim();
    if (answer.length === 0) return;
    this.submitAnswer.emit(answer);
  }

  onNextPuzzle(): void {
    this.selectedOption.set(null);
    this.textAnswer.set('');
    this.nextPuzzle.emit();
  }
}
