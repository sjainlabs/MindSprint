import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { CompetitionBossEngine } from './competition-boss.engine';

@Component({
  selector: 'app-competition-boss-mode',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './competition-boss.html',
  styleUrl: './competition-boss.css',
})
export class CompetitionBossModeComponent {
  readonly engine = input.required<CompetitionBossEngine>();
  readonly loading = input(false);
  readonly nextChallenge = output<void>();

  onAttack(): void {
    this.engine().playerAttack();
  }

  onNextChallenge(): void {
    this.nextChallenge.emit();
  }

  runnerOffset(progress: number): number {
    return clamp(progress, 4, 96);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
