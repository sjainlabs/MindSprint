import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LearningApiService, TopicOption } from '../services/learning-api.service';
import { OnboardingFlowService } from '../services/onboarding-flow.service';

@Component({
  selector: 'app-topic-selection-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="page">
      <section class="card">
        <h1>Select Topics for Grade {{ grade() || '...' }}</h1>
        <p>Choose one or more topics to start the diagnostic.</p>

        <div class="topic-grid">
          <button
            *ngFor="let topic of availableTopics()"
            (click)="toggleTopic(topic.name)"
            [class.selected]="selectedTopics().includes(topic.name)"
          >
            {{ topic.name }}
          </button>
        </div>

        <p class="hint" *ngIf="selectedTopics().length === 0">Select at least one topic to continue.</p>

        <button class="primary" (click)="startDiagnostic()" [disabled]="selectedTopics().length === 0">
          Start Diagnostic
        </button>
      </section>
    </main>
  `,
  styles: [
    `
      .page { max-width: 760px; margin: 0 auto; padding: 16px; }
      .card { background: #fff; border-radius: 16px; padding: 16px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08); display: grid; gap: 12px; }
      .topic-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
      button { border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px; font-weight: 700; background: #fff; }
      button.selected { border-color: #16a34a; background: #dcfce7; color: #14532d; }
      .hint { color: #64748b; }
      .primary { border: 0; background: #2563eb; color: #fff; }
      .primary:disabled { opacity: 0.6; }
      h1, p { margin: 0; }
    `,
  ],
})
export class TopicSelectionPageComponent implements OnInit {
  private readonly api = inject(LearningApiService);
  private readonly onboarding = inject(OnboardingFlowService);
  private readonly router = inject(Router);

  readonly grade = computed(() => this.onboarding.getState().grade);
  readonly selectedTopics = signal<string[]>(this.onboarding.getState().topics);
  readonly availableTopics = signal<TopicOption[]>([]);

  async ngOnInit(): Promise<void> {
    if (!this.grade()) {
      await this.router.navigate(['/onboarding/grade-selection']);
      return;
    }

    this.availableTopics.set(await this.api.getCurriculumTopicsByGrade(this.grade()));
  }

  toggleTopic(topic: string): void {
    const selected = this.selectedTopics();
    if (selected.includes(topic)) {
      this.selectedTopics.set(selected.filter((entry) => entry !== topic));
      return;
    }
    this.selectedTopics.set([...selected, topic]);
  }

  async startDiagnostic(): Promise<void> {
    this.onboarding.setState({ topics: this.selectedTopics() });
    await this.router.navigate(['/diagnostic/start']);
  }
}
