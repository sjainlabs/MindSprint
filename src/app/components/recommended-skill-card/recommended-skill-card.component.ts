import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-recommended-skill-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
      <p class="text-xs font-semibold uppercase tracking-wide text-indigo-700">{{ title() }}</p>
      <p class="mt-1 text-base font-bold text-indigo-900">{{ skillName() || 'No recommendation yet' }}</p>
      <p class="mt-1 text-xs text-indigo-700">{{ reason() }}</p>
      <button
        type="button"
        class="mt-3 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        [disabled]="!skillName()"
        (click)="startPractice.emit()"
      >
        {{ actionLabel() }}
      </button>
    </div>
  `,
})
export class RecommendedSkillCardComponent {
  readonly title = input('Recommended for You');
  readonly skillName = input('');
  readonly reason = input('');
  readonly actionLabel = input('Start Practice');
  readonly startPractice = output<void>();
}
