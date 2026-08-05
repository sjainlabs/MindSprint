import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LearningApiService } from '../../services/learning-api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-topic-progress-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './topic-progress-page.component.html',
  styleUrls: ['./topic-progress-page.component.css'],
})
export class TopicProgressPageComponent implements OnInit {
  protected readonly api = inject(LearningApiService);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly overview = signal<any>(null);

  async ngOnInit() {
    await this.loadOverview();
  }

  async loadOverview() {
    this.loading.set(true);
    this.error.set('');

    try {
      const studentId = this.auth.getStoredStudentId();
      if (!studentId) {
        this.error.set('No student ID found.');
        return;
      }

      const data: any = await this.api.getProgressOverview(studentId).toPromise();
      this.overview.set(data);

      // Auto-start recommended topic if nothing exists
      if (
        data.topicsInProgress.length === 0 &&
        data.topicsMastered.length === 0 &&
        data.recommendedNextTopicId
      ) {
        await this.startTopic(data.recommendedNextTopicId);
      }

    } catch {
      this.error.set('Unable to load progression overview.');
    } finally {
      this.loading.set(false);
    }
  }

  async startTopic(topicId: string) {
    try {
      const studentId = this.auth.getStoredStudentId();
      if (!studentId) return;

      await this.api.getTopicProgress(studentId, topicId).toPromise();
      await this.loadOverview(); // refresh after creating topic
    } catch {
      this.error.set('Unable to start topic.');
    }
  }

  goBack() {
    history.back();
  }

  statusColor(status: string) {
    switch (status) {
      case 'ready_for_test': return 'orange';
      case 'needs_remediation': return 'red';
      case 'mastered': return 'green';
      default: return 'gray';
    }
  }
}
