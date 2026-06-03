import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { type SuperSyllabus } from '../../services/syllabus.service';

@Component({
  selector: 'app-topic-library-preview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article class="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">Topic library</p>
          <h2 class="mt-1 text-xl font-bold text-slate-900">K-12 + Kumon preview</h2>
          <p class="mt-2 text-sm text-slate-600">Open the full library to browse all skills.</p>
        </div>
      </div>

      @if (loading) {
        <p class="mt-4 text-sm text-slate-500">Loading library preview...</p>
      } @else if (syllabus) {
        <div class="mt-4 grid gap-3 md:grid-cols-2">
          @for (domain of syllabus.domains; track domain.domainId) {
            <div class="rounded-2xl border border-slate-200 p-4">
              <p class="text-sm font-semibold text-slate-900">{{ domain.name }}</p>
              <p class="mt-1 text-xs text-slate-500">{{ domain.description }}</p>
              <p class="mt-3 text-xs font-semibold text-slate-600">{{ domain.totalSkills }} skills</p>
            </div>
          }
        </div>
      } @else {
        <p class="mt-4 text-sm text-slate-500">Library data is not available right now.</p>
      }

      <div class="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          (click)="openLibrary.emit()"
        >
          Open full Topic Library
        </button>
        <button
          type="button"
          class="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
          (click)="openRitLookup.emit()"
        >
          Open RIT Lookup
        </button>
      </div>
    </article>
  `,
})
export class TopicLibraryPreviewComponent {
  @Input() loading = false;
  @Input() syllabus: SuperSyllabus | null = null;

  @Output() openLibrary = new EventEmitter<void>();
  @Output() openRitLookup = new EventEmitter<void>();
}

