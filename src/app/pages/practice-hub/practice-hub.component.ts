import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LearningApiService } from '../../services/learning-api.service';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';

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
  selectedTopic = signal('');
  selectedLevel = signal('Beginner');
  questionCount = signal(20);

  recommendedTopic = signal<string>('Recommended Topic - Grade 1');
  loadingTopics = signal(false);

  async ngOnInit() {
    const studentId = this.auth.getStoredStudentId();
    if (!studentId) {
      this.router.navigate(['/access-code']);
      return;
    }
  }

  async loadTopics() {
    if (!this.selectedGrade()) return;
    this.loadingTopics.set(true);

    const list = await this.api.getCurriculumTopicsByGrade(this.selectedGrade());
    this.topics.set(list);

    this.loadingTopics.set(false);
  }

  async startRecommendedWorksheet() {
    const studentId = this.auth.getStoredStudentId() ?? undefined;

    const payload = {
      studentId,
      grade: '1',
      topic: 'recommended',
      level: 'Beginner',
      questionCount: 10,
      source: 'recommended' as const,
    };

    // ⭐ FIX: await the API call
    const worksheet = this.api.createPracticeWorksheetV1(payload);

    // ⭐ FIX: deep clone to plain JSON
    const safeWorksheet = JSON.parse(JSON.stringify(worksheet));

    await this.router.navigate(['/practice/worksheet'], {
      state: { worksheet: safeWorksheet },
    });
  }

  async generatePractice() {
    const rawStudentId = this.auth.getStoredStudentId();

    const payload = {
      studentId: this.auth.getStoredStudentId() ?? undefined,
      grade: this.selectedGrade(),
      topic: this.selectedTopic(),
      level: this.selectedLevel(),
      questionCount: this.questionCount
      (),
      source: 'practice' as const,
    };


    // ⭐ FIX: await the API call
    const worksheet = this.api.createPracticeWorksheetV1(payload);

    // ⭐ FIX: deep clone to plain JSON
    const safeWorksheet = JSON.parse(JSON.stringify(worksheet));

    // ⭐ FIX: navigate to worksheet page, not back to hub
    await this.router.navigate(['/practice/worksheet'], {
      state: { worksheet: safeWorksheet },
    });
  }
}
