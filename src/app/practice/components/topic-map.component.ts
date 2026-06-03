import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { type TopicBrowserResponse } from '../../services/topic.service';

type TopicCard = TopicBrowserResponse['browseTopics'][number];

@Component({
  selector: 'app-topic-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article class="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Topic map</p>
          <h2 class="mt-1 text-xl font-bold text-slate-900">See your practice landscape</h2>
        </div>
      </div>

      @if (loading) {
        <p class="mt-4 text-sm text-slate-500">Loading topic map...</p>
      } @else {
        <div class="mt-4 grid gap-3 md:grid-cols-2">
          @for (topic of topics; track topic.id) {
            <div class="rounded-2xl border border-slate-200 p-4">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-semibold text-slate-900">{{ topic.title }}</p>
                  <p class="mt-1 text-xs text-slate-500">
                    {{ topic.prerequisites.length ? topic.prerequisites.join(', ') : 'No prerequisites listed' }}
                  </p>
                </div>
                <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  {{ topic.masteryPercentage }}%
                </span>
              </div>

              <div class="mt-3 flex flex-wrap gap-2">
                @for (tier of topic.difficultyTiers; track tier.name) {
                  <span class="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
                    {{ tier.name }} {{ tier.min }}-{{ tier.max }}
                  </span>
                }
              </div>

              <div class="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  class="rounded-full border border-primary px-3 py-1.5 text-xs font-semibold text-primary"
                  (click)="openDetail.emit(topic.skillId ?? topic.id)"
                >
                  View detail
                </button>
                <button
                  type="button"
                  class="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white"
                  (click)="startPractice.emit(topic.skillId ?? topic.id)"
                >
                  Practice this topic
                </button>
              </div>
            </div>
          }
        </div>
      }
    </article>
  `,
})
export class TopicMapComponent {
  @Input() loading = false;
  @Input() topics: TopicCard[] = [];

  @Output() openDetail = new EventEmitter<string>();
  @Output() startPractice = new EventEmitter<string>();
}

