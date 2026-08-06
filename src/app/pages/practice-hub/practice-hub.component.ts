import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {FullInsightsResponse, LearningApiService} from '../../services/learning-api.service';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';


import {
  PracticeConfigService,
  type EnhancedTopic,
} from '../../services/practice-config.service';
import { AppMascotComponent } from '../../shared/components/app-mascot/app-mascot.component';
import { AppPracticeCardComponent } from '../../shared/components/app-practice-card/app-practice-card.component';
import { AppDailyGoalComponent } from '../../shared/components/app-daily-goal/app-daily-goal.component';
import { AppRewardStarsComponent } from '../../shared/components/app-reward-stars/app-reward-stars.component';

@Component({
  selector: 'app-practice-hub',
  standalone: true,
  imports: [CommonModule, FormsModule, AppMascotComponent, AppPracticeCardComponent, AppDailyGoalComponent, AppRewardStarsComponent],
  templateUrl: './practice-hub.component.html',
  styleUrls: ['./practice-hub.component.css'],
})
export class PracticeHubComponent implements OnInit {
  private readonly api = inject(LearningApiService);
  private readonly auth = inject(AuthService);
  private readonly practiceConfig = inject(PracticeConfigService);
  protected readonly router = inject(Router);

  // ── Loading state ────────────────────────────────────────────────────────────
  syllabusLoading = signal(true);
  syllabusError = signal('');

  // ── Selection state (new EnhancedSyllabus-based) ─────────────────────────────
  selectedGrade = signal<number | null>(null);
  topics = signal<EnhancedTopic[]>([]);
  selectedTopics = signal<EnhancedTopic[]>([]);  // Multi-select topics
  questionCount = signal(20);

  generatingWorksheet = signal(false);
  worksheetError = signal('');

  // Mascot and daily goals (UI-only)
  currentMascot = signal('penguin');
  mascotNames = { penguin: 'Pip the Penguin', lion: 'Leo the Lion', monkey: 'Momo the Monkey', turtle: 'Tilly the Turtle', zebra: 'Zee the Zebra' } as Record<string,string>;

  dailyGoals = signal([
    { title: 'Solve 10 questions today', emoji: '🎯' },
    { title: 'Earn 1 badge', emoji: '⭐' },
    { title: 'Complete 1 worksheet', emoji: '🐧' },
  ] as any[]);

  // ── Derived values from EnhancedSyllabus ──────────────────────────────────────
  allowedGrades = computed<number[]>(() => {
    const allTopics = this.topics();
    if (!allTopics.length) return [];
    // Get unique grades from all topics and sort
    const gradeSet = new Set(allTopics.map((t) => t.cbseGrade));
    return Array.from(gradeSet).sort((a, b) => a - b);
  });

  filteredTopics = computed<EnhancedTopic[]>(() => {
    const grade = this.selectedGrade();
    const allTopics = this.topics();
    if (grade == null || !allTopics.length) return [];
    // STRICT filtering: Only show topics where cbseGrade === selectedGrade
    return allTopics.filter((t) => t.cbseGrade === grade).sort((a, b) => a.cbseGrade - b.cbseGrade);
  });

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  async ngOnInit(): Promise<void> {
    const studentId = this.auth.getStoredStudentId();
    if (!studentId) {
      await this.router.navigate(['/access-code']);
      return;
    }
    this.loadSyllabus();
  }




loadSyllabus(): void {
  this.syllabusLoading.set(true);
  this.syllabusError.set('');

  const studentId = this.auth.getStoredStudentId();
  if (!studentId) {
  this.syllabusError.set('Missing student ID.');
  this.syllabusLoading.set(false);
  return;
}

this.practiceConfig.getTopics()
  .subscribe({
    next: async (topics) => {
      try {
        const insights = await this.api.getFullInsights(studentId); // Promise

        const enrichedTopics = topics.map(t => ({
          ...t,
          progress: insights.mastery?.[t.id] ?? 0
        }));

        this.topics.set(enrichedTopics);
        this.syllabusLoading.set(false);

        const grades = this.allowedGrades();
        if (grades.length) {
          this.selectedGrade.set(grades[0]);
        }

      } catch (err) {
        console.error(err);
        this.syllabusError.set('Unable to load topic progress.');
        this.syllabusLoading.set(false);
      }
    },

    error: () => {
      this.syllabusError.set('Unable to load practice topics.');
      this.syllabusLoading.set(false);
    }
  });
}




  onGradeChange(grade: number): void {
    this.selectedGrade.set(grade);
    this.selectedTopics.set([]);  // Clear topic selection when grade changes
  }

  selectTopic(topic: EnhancedTopic): void {
    // Toggle topic: add if not selected, remove if selected
    const current = this.selectedTopics();
    const exists = current.find((t) => t.id === topic.id);

    if (exists) {
      this.selectedTopics.set(current.filter((t) => t.id !== topic.id));
    } else {
      this.selectedTopics.set([...current, topic]);
    }
  }

  isTopicSelected(topicId: string): boolean {
    return this.selectedTopics().some((t) => t.id === topicId);
  }

  canGenerate = computed(
    () =>
      this.selectedGrade() !== null &&
      this.selectedTopics().length > 0 &&
      !this.generatingWorksheet(),
  );

  startPractice(topic: EnhancedTopic): void {
    this.selectedTopics.set([topic]);
    this.generatePractice();
  }

  async generatePractice(): Promise<void> {
    if (!this.canGenerate()) return;

    const grade = this.selectedGrade();
    if (grade === null) return;

    const selectedTopics = this.selectedTopics();
    if (selectedTopics.length === 0) return;

    this.generatingWorksheet.set(true);
    this.worksheetError.set('');

    // Use practice level from first selected topic
    const firstTopic = selectedTopics[0];

    // Extract only topic IDs for backend
    const topicIds = selectedTopics.map((t) => t.id);

    const payload = {
      studentId: this.auth.getStoredStudentId() ?? undefined,
      grade: String(grade),
      topic: topicIds,  // Only topic IDs: ["addition-single-digit", "subtraction-single-digit"]
      level: firstTopic.practiceLevel,
      questionCount: this.questionCount(),
      source: 'practice' as const,
    };

    try {
      const worksheet = await firstValueFrom(this.api.createPracticeWorksheetV1(payload));
      await this.router.navigate(['/practice/worksheet'], {
        state: {
          worksheet,
          selectedGrade: grade,
          selectedTopics: selectedTopics,  // Pass array of topics
          questionCount: this.questionCount(),
        },
      });
    } catch {
      this.worksheetError.set('Failed to generate worksheet. Please try again.');
    } finally {
      this.generatingWorksheet.set(false);
    }
  }
}

export default PracticeHubComponent
