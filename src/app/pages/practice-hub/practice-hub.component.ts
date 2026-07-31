import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LearningApiService } from '../../services/learning-api.service';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import {firstValueFrom} from 'rxjs';

@Component({
  selector: 'app-practice-hub',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './practice-hub.component.html',
  styleUrls: ['./practice-hub.component.css'],
})
export class PracticeHubComponent implements OnInit {
  private readonly api = inject(LearningApiService);
  private readonly auth = inject(AuthService);
  protected readonly router = inject(Router);

  grades = ['1', '2', '3', '4', '5', '6', '7', '8'];
  levels = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

  topics = signal<{ id: string; name: string }[]>([]);
  selectedGrade = signal('');
  selectedTopics = signal<string[]>([]);
  selectedLevel = signal('Beginner');
  questionCount = signal(20);

  recommendedTopic = signal<string>('Recommended Topic - Grade 1');
  loadingTopics = signal(false);

  async ngOnInit() {
    const studentId = this.auth.getStoredStudentId();
    if (!studentId) {
      await this.router.navigate(['/access-code']);
      return;
    }
  }

  async loadTopicsV2() {
    const grade = this.selectedGrade();

    if (!grade) {
      this.topics.set([]);
      this.selectedTopics.set([]);
      return;
    }

    this.loadingTopics.set(true);

    try {
      const topics = await this.api.getCurriculumTopicsV2(grade);

      // Atomic topics (fractions, decimals, multiplication, etc.)
      this.topics.set(topics);

      // Reset selected topics when grade changes
      this.selectedTopics.set([]);

    } finally {
      this.loadingTopics.set(false);
    }
  }

  async startRecommendedWorksheet() {
    const payload = {
      studentId: this.auth.getStoredStudentId() ?? undefined,
      grade: this.selectedGrade(),
      topic: this.selectedTopics(),   // MULTIPLE TOPICS
      level: this.selectedLevel(),
      questionCount: this.questionCount(),
      source: 'practice' as const,
    };

    const worksheet = await firstValueFrom(this.api.createPracticeWorksheetV1(payload));
    const safeWorksheet = JSON.parse(JSON.stringify(worksheet));

    await this.router.navigate(['/practice/worksheet'], {
      state: {
        selectedGrade: this.selectedGrade(),
        selectedTopics: this.selectedTopics(),
        selectedLevel: this.selectedLevel(),
        questionCount: this.questionCount(),
        worksheet: safeWorksheet,
      },
    });
  }

  async generatePractice() {
    const payload1 = {
      studentId: this.auth.getStoredStudentId() ?? undefined,
      grade: this.selectedGrade(),
      topic: this.selectedTopics(),   // MULTIPLE TOPICS
      level: this.selectedLevel(),
      questionCount: this.questionCount(),
      source: "practice" as const,
    };

    const worksheet = await firstValueFrom(this.api.createPracticeWorksheetV1(payload1));
    const safeWorksheet = JSON.parse(JSON.stringify(worksheet));

    await this.router.navigate(['/practice/worksheet'], {
      state: {
        selectedGrade: this.selectedGrade(),
        selectedTopics: this.selectedTopics(),
        selectedLevel: this.selectedLevel(),
        questionCount: this.questionCount(),
        worksheet: safeWorksheet,
      },
    });
  }
}
