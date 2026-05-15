import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { BossBattleEngine } from './boss-battle.engine';

@Component({
  selector: 'app-boss-battle-mode',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './boss-battle.html',
  styleUrl: './boss-battle.css',
})
export class BossBattleComponent {
  readonly engine = input.required<BossBattleEngine>();
  readonly loading = input(false);

  /** Called when the player taps the Attack button. */
  onAttack(): void {
    this.engine().hit();
  }

  /** Called when the player taps Retry after a defeat. */
  onRetry(): void {
    this.engine().reset();
    this.engine().start();
  }
}
