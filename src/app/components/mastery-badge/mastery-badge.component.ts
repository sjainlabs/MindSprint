import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { type MasteryLevel } from '../../core/mastery/mastery-engine.service';

const MASTERY_BADGE_CLASS_MAP: Record<MasteryLevel, string> = {
  'not-started': 'bg-gray-100 text-gray-600',
  developing: 'bg-yellow-100 text-yellow-700',
  proficient: 'bg-green-100 text-green-700',
  mastered: 'bg-blue-100 text-blue-700',
};

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

  readonly badgeClass = computed(() => MASTERY_BADGE_CLASS_MAP[this.level()]);
}
