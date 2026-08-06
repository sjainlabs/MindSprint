import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reward-stars',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stars">
      <ng-container *ngFor="let _ of stars; let i = index">
        <span class="star" [class.filled]="i < filled">⭐</span>
      </ng-container>
    </div>
  `,
  styles: [
    `.stars{ display:flex; gap:4px; } .star{ opacity:0.25; transform:scale(1); transition: transform .2s, opacity .2s } .star.filled{ opacity:1; transform:scale(1.08) }`,
  ],
})
export class AppRewardStarsComponent {
  @Input() accuracy = 0;
  get filled() { return Math.round((this.accuracy / 100) * 5); }
  stars = new Array(5);
}


