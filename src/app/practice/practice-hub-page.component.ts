import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OnboardingFlowService } from '../services/onboarding-flow.service';
import { PracticeLevelsComponent } from './practice-levels.component';
import { TopicMapComponent } from './topic-map.component';
import { TopicLibraryPreviewComponent } from './topic-library-preview.component';

@Component({
  selector: 'app-practice-hub-page',
  standalone: true,
  imports: [CommonModule, RouterLink, PracticeLevelsComponent, TopicMapComponent, TopicLibraryPreviewComponent],
  template: `
    <main class="page">
      <section class="card">
        <h1>Practice Hub</h1>
        <p class="muted">Recommended for you: {{ recommendedWorksheet() }}</p>
        <a routerLink="/practice/worksheet" class="primary">Start Recommended Worksheet</a>
      </section>

      <section class="card compact">
        <app-practice-levels />
      </section>

      <section class="card compact">
        <app-topic-map [expanded]="activePanel() === 'map'" (toggled)="togglePanel('map')" />
      </section>

      <section class="card compact">
        <app-topic-library-preview [expanded]="activePanel() === 'library'" (toggled)="togglePanel('library')" />
      </section>
    </main>
  `,
  styles: [
    `
      .page { max-width: 760px; margin: 0 auto; padding: 16px; display: grid; gap: 12px; }
      .card { background: #fff; border-radius: 16px; padding: 16px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08); display: grid; gap: 10px; }
      .compact { padding: 10px; }
      h1, p { margin: 0; }
      .muted { color: #334155; }
      .primary { text-decoration: none; border-radius: 12px; padding: 12px; text-align: center; background: #2563eb; color: #fff; font-weight: 700; }
    `,
  ],
})
export class PracticeHubPageComponent {
  private readonly onboarding = inject(OnboardingFlowService);

  readonly activePanel = signal<'map' | 'library' | null>(null);
  readonly recommendedWorksheet = computed(() => {
    const state = this.onboarding.getState();
    const topic = state.topics[0] ?? 'Recommended Topic';
    const grade = state.grade || 'Current Grade';
    return `${topic} - Grade ${grade}`;
  });

  togglePanel(panel: 'map' | 'library'): void {
    this.activePanel.set(this.activePanel() === panel ? null : panel);
  }
}
