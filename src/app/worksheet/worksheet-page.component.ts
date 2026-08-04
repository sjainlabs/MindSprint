import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Location } from '@angular/common';
import {
  LearningApiService,
  PracticeWorksheetQuestion,
  PracticeWorksheetResponse,
} from '../services/learning-api.service';
import { AuthService } from '../services/auth.service';
import { OnboardingFlowService } from '../services/onboarding-flow.service';
import { type EnhancedTopic } from '../services/practice-config.service';

interface WorksheetNavState {
  worksheet?: any;
  questionCount?: number;
  // New EnhancedSyllabus format (multi-topic with EnhancedTopic objects)
  selectedGrade?: string;
  selectedTopics?: EnhancedTopic[] | string[];  // Union type: EnhancedTopic[] OR string[]
  selectedLevel?: string;
}

@Component({
  selector: 'app-clean-worksheet-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './worksheet-page.component.html',
  styleUrls: ['./worksheet-page.component.css'],
})
export class WorksheetPageComponent implements OnInit {
  private readonly api = inject(LearningApiService);
  private readonly authService = inject(AuthService);
  private readonly onboarding = inject(OnboardingFlowService);

  // readonly selectedGrade = computed(() => this.onboarding.getState().grade || '4');
  // readonly selectedTopic = computed(() => this.onboarding.getState().topics[0] ?? 'General Practice');

  readonly worksheet = signal<PracticeWorksheetResponse | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly answers = signal<Record<string, string>>({});
  private readonly location = inject(Location);
  readonly results = signal<{
    accuracy: number;
    mastery: number;
    level: string;
    speed: number;
    recommendations: string[];
  } | null>(null);

  readonly worksheetTitle = computed(() => this.worksheet()?.title ?? 'Worksheet');
  readonly worksheetDescription = computed(() => this.worksheet()?.instructions ?? 'Loading worksheet instructions...');
  readonly questions = computed<PracticeWorksheetQuestion[]>(() => this.worksheet()?.questions ?? []);

  readonly incomingState = computed(() => {
    return this.location.getState() as WorksheetNavState;
  });

  // New: EnhancedTopic-based properties
  readonly selectedTopicsArray = computed(() => {
    const state = this.incomingState();
    // Check if selectedTopics is an array of EnhancedTopic objects (new format)
    if (Array.isArray(state.selectedTopics) && state.selectedTopics.length > 0) {
      const first = state.selectedTopics[0];
      // If first item has cbseGrade property, it's EnhancedTopic[] (new format)
      if (first && typeof first === 'object' && 'cbseGrade' in first) {
        return (state.selectedTopics as unknown as EnhancedTopic[]);
      }
    }
    return [];
  });

  readonly selectedGrade = computed(() => {
    const topicsArray = this.selectedTopicsArray();
    // If using new format with EnhancedTopic objects
    if (topicsArray.length > 0) {
      return String(topicsArray[0].cbseGrade);
    }

    // Fallback to old format
    const state = this.incomingState();
    return state.selectedGrade ?? this.onboarding.getState().grade ?? '4';
  });

  readonly selectedTopics = computed(() => {
    const topicsArray = this.selectedTopicsArray();
    // If using new format, extract topic IDs
    if (topicsArray.length > 0) {
      return topicsArray.map((t) => t.id);
    }

    // Fallback to old format (string array)
    const state = this.incomingState();
    const selectedTopicsValue = state.selectedTopics;
    if (
      Array.isArray(selectedTopicsValue) &&
      selectedTopicsValue.length > 0 &&
      typeof selectedTopicsValue[0] === 'string'
    ) {
      return selectedTopicsValue as string[];
    }

    return ['General Practice'];
  });

  readonly selectedLevel = computed(() => {
    const topicsArray = this.selectedTopicsArray();
    // If using new format, get level from first topic
    if (topicsArray.length > 0) {
      return topicsArray[0].practiceLevel;
    }

    // Fallback to old format
    const state = this.incomingState();
    return state.selectedLevel ?? 'Beginner';
  });

  readonly selectedQuestionCount = computed(() =>
    this.incomingState().questionCount ?? 10
  );



  async ngOnInit(): Promise<void> {
    await this.loadWorksheet();
  }

  async loadWorksheet(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');
    this.results.set(null);

    try {
      const payload = {
        studentId: this.authService.getStoredStudentId() ?? undefined,
        grade: this.selectedGrade(),
        topic: this.selectedTopics(),
        level: this.selectedLevel(),
        questionCount: this.selectedQuestionCount(),
        source: 'practice' as const,
      };

      const worksheet = await firstValueFrom(this.api.createPracticeWorksheetV1(payload));

      if (!worksheet) {
        this.errorMessage.set('Worksheet was not returned by backend.');
        this.worksheet.set(null);
        this.answers.set({});
        return;
      }

      this.worksheet.set(worksheet);

      const initialAnswers: Record<string, string> = {};
      for (const question of worksheet.questions) {
        initialAnswers[question.id] = '';
      }
      this.answers.set(initialAnswers);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Unable to load worksheet.');
      this.worksheet.set(null);
      this.answers.set({});
    } finally {
      this.loading.set(false);
    }
  }

  setAnswer(questionId: string, value: string): void {
    this.answers.set({ ...this.answers(), [questionId]: value });
  }

  answeredCount(): number {
    return Object.values(this.answers()).filter((answer) => answer.trim().length > 0).length;
  }

  async submitWorksheet(): Promise<void> {
    this.loading.set(true);

    try {
      const worksheetId = this.worksheet()?.worksheetId;
      const studentId = this.authService.getStoredStudentId();

      if (!worksheetId || !studentId) {
        this.errorMessage.set('Missing worksheet or student ID.');
        return;
      }

      await firstValueFrom(
        await this.api.submitPracticeWorksheetV1({
          worksheetId,
          studentId,
          answers: this.answers(),
        }),
      );

      await this.loadInsights(studentId);
    } catch (error) {
      this.errorMessage.set('Unable to submit worksheet.');
    } finally {
      this.loading.set(false);
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

  selectedTopicsLabel = computed(() => {
    const arr = this.selectedTopicsArray() ?? [];
    return arr.map(t => t.name).join(', ');
  });

}
