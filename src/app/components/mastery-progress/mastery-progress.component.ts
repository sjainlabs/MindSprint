import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-mastery-progress',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-1">
      <div class="flex items-center justify-between text-xs text-gray-600">
        <span>{{ label() }}</span>
        <span class="font-semibold">{{ progressPercent() }}%</span>
      </div>
      <div class="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div class="h-full rounded-full transition-all duration-300" [ngClass]="barClass()" [style.width.%]="progressPercent()"></div>
      </div>
    </div>
  `,
})
export class MasteryProgressComponent {
  readonly progressPercent = input(0);
  readonly label = input('Progress to next mastery level');

  readonly barClass = computed(() => {
    const progress = this.progressPercent();
    if (progress >= 80) return 'bg-blue-500';
    if (progress >= 55) return 'bg-green-500';
    if (progress >= 30) return 'bg-yellow-500';
    return 'bg-gray-400';
  });
}
