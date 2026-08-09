import {Component, inject, OnInit, signal, computed, Input} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { LearningApiService } from '../../services/learning-api.service';
import { PracticeTopicCatalogService } from '../../services/practice-topic-catalog.service';

import { AppMascotComponent } from '../../shared/components/app-mascot/app-mascot.component';
import { AppPracticeCardComponent } from '../../shared/components/app-practice-card/app-practice-card.component';
import { AppDailyGoalComponent } from '../../shared/components/app-daily-goal/app-daily-goal.component';
import { AppRewardStarsComponent } from '../../shared/components/app-reward-stars/app-reward-stars.component';
import {EnhancedTopic} from '../../services/practice-config.service';

@Component({
  selector: 'app-practice-hub',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AppMascotComponent,
    AppPracticeCardComponent,
    AppDailyGoalComponent,

  ],
  templateUrl: './practice-hub.component.html',
  styleUrls: ['./practice-hub.component.css'],
})
export class PracticeHubComponent implements OnInit {
  private readonly api = inject(LearningApiService);
  protected readonly auth = inject(AuthService);
  private readonly catalog = inject(PracticeTopicCatalogService);
  protected readonly router = inject(Router);

  // ── Loading state ────────────────────────────────────────────────────────────
  syllabusLoading = signal(true);
  syllabusError = signal('');

  // ── Dynamic modular topics & skills ──────────────────────────────────────────
  topics = signal<any[]>([]);
  selectedTopics = signal<any[]>([]);
  selectedGrade = signal<number | null>(null);

  questionCount = signal(20);
  generatingWorksheet = signal(false);
  worksheetError = signal('');

  // Mascot + daily goals
  currentMascot = signal('penguin');
  mascotNames: Record<string, string> = {
    penguin: 'Pip the Penguin',
    lion: 'Leo the Lion',
    monkey: 'Momo the Monkey',
    turtle: 'Tilly the Turtle',
    zebra: 'Zee the Zebra'
  };

  @Input() topic!: EnhancedTopic;

  dailyGoals = signal([
    { title: 'Solve 10 questions today', emoji: '🎯' },
    { title: 'Earn 1 badge', emoji: '⭐' },
    { title: 'Complete 1 worksheet', emoji: '🐧' },
  ]);

  // ── Derived values ───────────────────────────────────────────────────────────
  allowedGrades = computed(() => {
    const all = this.topics();
    if (!all.length) return [];
    const gradeSet = new Set(all.map(t => t.cbseGrade));
    return Array.from(gradeSet).sort((a, b) => a - b);
  });

  filteredTopics = computed(() => {
    const grade = this.selectedGrade();
    const all = this.topics();
    if (grade == null) return [];
    return all.filter(t => t.cbseGrade === grade);
  });

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  async ngOnInit(): Promise<void> {
    const studentId = this.auth.getStoredStudentId();
    if (!studentId) {
      await this.router.navigate(['/access-code']);
      return;
    }
    // ⭐ Load dynamic catalog first
    await this.catalog.loadMergedCatalogAsync();

    await this.loadDynamicTopics(studentId);
  }

  // ── Load dynamic modular topics + skills ─────────────────────────────────────
  async loadDynamicTopics(studentId: string): Promise<void> {
    this.syllabusLoading.set(true);
    this.syllabusError.set('');


    try {
      // 1. Load static modular topics from FE catalog
      const staticTopics = this.catalog.getCatalog();

      // 2. Load dynamic mastery insights
      const insights = await this.api.getFullInsights(studentId);

      // 3. Merge mastery into topics
      const enriched = staticTopics.map(t => ({
        ...t,
        progress: insights.mastery?.[t.id] ?? 0
      }));

      this.topics.set(enriched);
      this.syllabusLoading.set(false);

      // Auto-select first grade
      const grades = this.allowedGrades();
      if (grades.length) {
        this.selectedGrade.set(grades[0]);
      }

    } catch (err) {
      console.error(err);
      this.syllabusError.set('Unable to load topics.');
      this.syllabusLoading.set(false);
    }
  }

  // ── Grade selection ──────────────────────────────────────────────────────────
  onGradeChange(grade: number): void {
    this.selectedGrade.set(grade);
    this.selectedTopics.set([]);
  }

  // ── Topic selection ──────────────────────────────────────────────────────────
  selectTopic(topic: any): void {
    const current = this.selectedTopics();
    const exists = current.some(t => t.id === topic.id);

    if (exists) {
      this.selectedTopics.set(current.filter(t => t.id !== topic.id));
    } else {
      this.selectedTopics.set([...current, topic]);
    }
  }

  isTopicSelected(topicId: string): boolean {
    return this.selectedTopics().some(t => t.id === topicId);
  }

  canGenerate = computed(() =>
    this.selectedGrade() !== null &&
    this.selectedTopics().length > 0 &&
    !this.generatingWorksheet()
  );

  // ── Generate worksheet ───────────────────────────────────────────────────────
  async generatePractice(): Promise<void> {
    if (!this.canGenerate()) return;

    const grade = this.selectedGrade();
    const selected = this.selectedTopics();
    const studentId = this.auth.getStoredStudentId();

    if (!studentId || grade === null || selected.length === 0) return;

    this.generatingWorksheet.set(true);
    this.worksheetError.set('');

    const topicIds = selected.map(t => t.id);
    const firstTopic = selected[0];

    const payload = {
      studentId,
      grade: String(grade),
      topic: topicIds,
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
          selectedTopics: selected,
          questionCount: this.questionCount(),
        },
      });

    } catch {
      this.worksheetError.set('Failed to generate worksheet.');
    } finally {
      this.generatingWorksheet.set(false);
    }
  }
  async startPractice(topic: any): Promise<void> {
    this.selectedTopics.set([topic]);
    await this.generatePractice();
  }
}

export default PracticeHubComponent;
