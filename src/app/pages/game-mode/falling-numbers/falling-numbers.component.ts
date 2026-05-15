import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { FallingNumbersEngine } from './falling-numbers.engine';
import { type FallingPowerUpType } from './falling-numbers.types';

@Component({
  selector: 'app-falling-numbers-mode',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './falling-numbers.html',
  styleUrl: './falling-numbers.css',
})
export class FallingNumbersComponent {
  readonly engine = input.required<FallingNumbersEngine>();
  readonly loading = input(false);

  powerIcon(powerUp: FallingPowerUpType): string {
    if (powerUp === 'magnet') return '🧲';
    if (powerUp === 'slow-mo') return '🐢';
    return '💣';
  }
}

