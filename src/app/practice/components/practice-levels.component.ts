import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { type LearningLevel } from '../../services/diagnostic.service';

@Component({
  selector: 'app-practice-levels',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article class="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Practice levels</p>
      <h2 class="mt-1 text-xl font-bold text-slate-900">Foundation -> ACT</h2>
      <p class="mt-2 text-sm text-slate-600">Choose a level and jump into a worksheet.</p>

      <div class="mt-4 grid grid-cols-2 gap-2">
        @for (level of levels; track level) {
          <button
            type="button"
            class="rounded-2xl px-4 py-3 text-sm font-semibold transition"
            [class.bg-primary]="selectedLevel === level"
            [class.text-white]="selectedLevel === level"
            [class.border]="selectedLevel !== level"
            [class.border-slate-200]="selectedLevel !== level"
            [class.bg-slate-50]="selectedLevel !== level"
            [class.text-slate-700]="selectedLevel !== level"
            (click)="selectedLevelChange.emit(level)"
          >
            {{ level }}
          </button>
        }
      </div>

      <button
        type="button"
        class="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
        (click)="start.emit()"
      >
        Start {{ selectedLevel }} worksheet
      </button>
    </article>
  `,
})
export class PracticeLevelsComponent {
  @Input() levels: LearningLevel[] = [];
  @Input() selectedLevel: LearningLevel = 'Beginner';

  @Output() selectedLevelChange = new EventEmitter<LearningLevel>();
  @Output() start = new EventEmitter<void>();
}

