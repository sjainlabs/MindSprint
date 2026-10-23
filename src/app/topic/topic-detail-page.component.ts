import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LearningApiService, TopicDetailResponse } from '../services/learning-api.service';
import { OnboardingFlowService } from '../services/onboarding-flow.service';
import { AuthService } from '../services/auth.service';
import { TopicTestService } from '../services/topic-test.service';
import { TopicTestCardComponent } from '../components/topic-test-card/topic-test-card.component';

@Component({
  selector: 'app-topic-detail-page',
  standalone: true,
  imports: [CommonModule, RouterLink, TopicTestCardComponent],
  template: `
    <main class="page">
      <section class="card" *ngIf="loading()">Loading topic...</section>

      <section class="card" *ngIf="errorMessage()">{{ errorMessage() }}</section>

      <section class="card" *ngIf="topic() as topic">
        <h1>{{ topic.name }}</h1>
        <p>{{ topic.description }}</p>
        <p>Mastery: {{ topic.mastery }}%</p>

        <app-topic-test-card [topicStatus]="testStatus()"></app-topic-test-card>

        <h2>Difficulty Tiers</h2>
        <ul>
          <li *ngFor="let entry of difficultyEntries()">
            <strong>{{ entry.label }}:</strong> {{ entry.description }}
          </li>
        </ul>

        <h2>Subtopics</h2>
        <ul>
          <li *ngFor="let subtopic of topic.subtopics">{{ subtopic }}</li>
        </ul>

        <div class="actions">
          <a routerLink="/practice/worksheet" class="button primary">Start Practice</a>
          <button class="button" (click)="generateWorksheet()">Generate AI Worksheet</button>
        </div>
      </section>
    </main>
  `,
  styles: [
    `
      .page { max-width: 760px; margin: 0 auto; padding: 16px; }
      .card { background: #fff; border-radius: 16px; padding: 16px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08); display: grid; gap: 10px; }
      h1, h2, p { margin: 0; }
      ul { margin: 0; padding-left: 18px; color: #334155; }
      .actions { display: grid; gap: 8px; }
      .button { text-decoration: none; border: 0; border-radius: 12px; padding: 12px; text-align: center; font-weight: 700; background: #e2e8f0; color: #0f172a; }
      .primary { background: #2563eb; color: #fff; }
    `,
  ],
})
export class TopicDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(LearningApiService);
  private readonly onboarding = inject(OnboardingFlowService);
  private readonly auth = inject(AuthService);
  private readonly topicTests = inject(TopicTestService);

  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly topic = signal<TopicDetailResponse | null>(null);
  readonly topicId = computed(() => this.route.snapshot.paramMap.get('topicId') ?? '');
  readonly testStatus = computed(() => this.topicTests.statusFor(this.topicId()));

  readonly difficultyEntries = computed(() => {
    const tiers = this.topic()?.difficultyTiers ?? {};
    return Object.entries(tiers).map(([label, description]) => ({ label, description }));
  });

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');
    this.loadTestStatus();

    try {
      this.topic.set(await this.api.getTopicDetail(this.topicId()));
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Unable to load topic.');
    } finally {
      this.loading.set(false);
    }
  }

  /** Topic test status is optional on this screen; if it fails the card just stays hidden. */
  private loadTestStatus(): void {
    const studentId = this.auth.getStoredStudentId();
    if (!studentId || !this.topicId()) return;
    this.topicTests.getStatus(studentId, this.topicId()).catch(() => undefined);
  }

  generateWorksheet(): void {
    const topic = this.topic();
    if (!topic) {
      return;
    }

    const grade = this.onboarding.getState().grade || '4';
    this.api.generateAiWorksheet({ topicId: topic.id, grade, level: 'Intermediate' }).subscribe();
  }
}
