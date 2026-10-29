import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RewardsService } from '../services/rewards.service';

/** "+N stars earned" and chest progress for a results screen; appears once the rewards refresh after the submit lands. */
@Component({
  selector: 'app-results-rewards',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (rewards.pageGain(); as g) {
      <a class="earned" routerLink="/rewards/me" role="status">
        <span class="stars">+{{ g.stars }} ⭐ <span class="word">stars earned</span></span>
        <span class="chest">
          @if (g.chests.unclaimed.length) {
            🎁 A treasure chest is ready to open!
          } @else {
            🎁 {{ g.chests.questionsToNext }} {{ g.chests.questionsToNext === 1 ? 'question' : 'questions' }} to your next chest
          }
        </span>
      </a>
    }
  `,
  styles: [
    `
      .earned { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 4px 14px; padding: 10px 14px; border-radius: 14px; background: linear-gradient(90deg, #fef3c7, #ede9fe); color: #1e1b4b; text-decoration: none; font-weight: 800; animation: rise 0.4s ease both; }
      .stars { font-size: 1.15rem; color: #92400e; }
      .word { font-size: 0.9rem; }
      .chest { font-size: 0.9rem; color: #5b21b6; }
      @keyframes rise { from { opacity: 0; transform: translateY(6px); } }
      @media (prefers-reduced-motion: reduce) { .earned { animation: none; } }
    `,
  ],
})
export class ResultsRewardsComponent {
  protected readonly rewards = inject(RewardsService);
}
