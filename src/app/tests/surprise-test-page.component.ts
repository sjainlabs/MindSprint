import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LearningApiService } from '../services/learning-api.service';
import { AuthService } from '../services/auth.service';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-surprise-test-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './surprise-test-page.component.html',
  styleUrls: ['./surprise-test-page.component.css'],
})
export class SurpriseTestPageComponent implements OnInit {
  private readonly api = inject(LearningApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly questions = signal<any[]>([]);
  readonly answers = signal<Record<string, number | null>>({});
  readonly surpriseId = signal<string | null>(null);
  readonly results = signal<{
    accuracy: number;
    mastery: number;
    level: string;
    speed: number;
    recommendations: string[];
  } | null>(null);

  async ngOnInit(): Promise<void> {
    // ⭐ OPTION A — Require student login
    const studentId = this.auth.getStoredStudentId();
    if (!studentId) {
      console.warn('[SurpriseTest] No student logged in. Redirecting...');
      await this.router.navigate(['/student-login']);
      return;
    }

    try {
      const test = await this.api.getSurpriseTest();
      this.surpriseId.set(test.surpriseId);
      this.questions.set(test.questions);

      const initial: Record<string, number | null> = {};
      for (const q of test.questions) {
        initial[q.id] = null;
      }
      this.answers.set(initial);
    } catch {
      this.errorMessage.set('Unable to load surprise test.');
    } finally {
      this.loading.set(false);
    }
  }

  setAnswer(questionId: string, value: string): void {
    const numeric = value === '' ? null : Number(value);
    this.answers.set({
      ...this.answers(),
      [questionId]: numeric,
    });
  }

  async submitSurpriseTest(): Promise<void> {
    const studentId = this.auth.getStoredStudentId();
    if (!studentId) {
      this.errorMessage.set('Student not logged in.');
      return;
    }

    try {
      const formattedAnswers = Object.entries(this.answers()).map(([questionId, answer]) => ({
        questionId,
        answer: Number(answer),
      }));

      this.api.submitSurpriseTest({
        testId: this.surpriseId()!,
        answers: formattedAnswers,
        studentId,
      });

      // this.router.navigate(['/home']);
      await this.loadInsights(studentId);
    } catch {
      this.errorMessage.set('Unable to submit test.');
    }
  }

  async loadInsights(studentId: string): Promise<void> {
    try {
      const insights = await this.api.getFullInsights(studentId);

      this.results.set({
        accuracy: insights.accuracy,
        mastery: insights.mastery,
        level: insights.level,
        speed: insights.speed,
        recommendations: insights.recommendations,
      });
    } catch {
      this.errorMessage.set('Unable to load insights.');
    }
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }
}
