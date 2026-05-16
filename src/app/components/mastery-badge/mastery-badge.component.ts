import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { type MasteryLevel } from '../../core/mastery/mastery-engine.service';

@Component({
  selector: 'app-mastery-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold" [ngClass]="badgeClass()">
      {{ label() }}
    </span>
  `,
})
export class MasteryBadgeComponent {
  readonly level = input<MasteryLevel>('not-started');
  readonly label = input('Not started');

  readonly badgeClass = computed(() => {
    const level = this.level();
    if (level === 'mastered') return 'bg-blue-100 text-blue-700';
    if (level === 'proficient') return 'bg-green-100 text-green-700';
    if (level === 'developing') return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-600';
  });
}
