import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LearningApiService } from '../../services/learning-api.service';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import {
  PracticeConfigService,
  type PracticeConfig,
  type PracticeTopicConfig,
} from '../../services/practice-config.service';

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
  private readonly practiceConfig = inject(PracticeConfigService);
  protected readonly router = inject(Router);

  // ── Config state ────────────────────────────────────────────────────────────
  config = signal<PracticeConfig | null>(null);
  configLoading = signal(true);
  configError = signal('');

  // ── Selection state ──────────────────────────────────────────────────────────
  selectedGrade = signal<number>(0);
  selectedLevel = signal<string>('');
  selectedTopics = signal<string[]>([]);
  questionCount = signal(20);

  generatingWorksheet = signal(false);
  worksheetError = signal('');

  // ── Derived values from config ───────────────────────────────────────────────
  allowedGrades = computed<number[]>(() => {
    const cfg = this.config();
    if (!cfg) return [];
    return Object.keys(cfg.gradeToLevels)
      .map(Number)
      .sort((a, b) => a - b);
  });

  allowedLevels = computed<string[]>(() => {
    const cfg = this.config();
    const grade = this.selectedGrade();
    if (!cfg || !grade) return [];
    return cfg.gradeToLevels[grade] ?? [];
  });

  filteredTopics = computed<PracticeTopicConfig[]>(() => {
    const cfg = this.config();
    const level = this.selectedLevel();
    if (!cfg || !level) return [];
    const levelCfg = cfg.levels[level];
    if (!levelCfg) return [];
    return Object.values(cfg.topics).filter((t) =>
      levelCfg.allowedOperations.includes(t.operation),
    );
  });

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  async ngOnInit(): Promise<void> {
    const studentId = this.auth.getStoredStudentId();
    if (!studentId) {
      await this.router.navigate(['/access-code']);
      return;
    }
    this.loadConfig();
  }

  loadConfig(): void {
    this.configLoading.set(true);
    this.configError.set('');

    this.practiceConfig.getConfig().subscribe({
      next: (cfg) => {
        this.config.set(cfg);
        this.configLoading.set(false);
        // Auto-select first grade and first level
        const grades = Object.keys(cfg.gradeToLevels).map(Number).sort((a, b) => a - b);
        if (grades.length) {
          this.selectedGrade.set(grades[0]);
          const levels = cfg.gradeToLevels[grades[0]] ?? [];
          if (levels.length) this.selectedLevel.set(levels[0]);
        }
      },
      error: () => {
        this.configError.set('Unable to load practice configuration. Please try again.');
        this.configLoading.set(false);
      },
    });
  }

  onGradeChange(grade: number): void {
    this.selectedGrade.set(grade);
    this.selectedTopics.set([]);
    // Auto-select first level for the new grade
    const cfg = this.config();
    if (cfg) {
      const levels = cfg.gradeToLevels[grade] ?? [];
      this.selectedLevel.set(levels[0] ?? '');
    }
  }

  onLevelChange(level: string): void {
    this.selectedLevel.set(level);
    // Clear topics that are no longer valid for this level
    this.selectedTopics.set([]);
  }

  toggleTopic(topicId: string): void {
    const current = this.selectedTopics();
    if (current.includes(topicId)) {
      this.selectedTopics.set(current.filter((id) => id !== topicId));
    } else {
      this.selectedTopics.set([...current, topicId]);
    }
  }

  isTopicSelected(topicId: string): boolean {
    return this.selectedTopics().includes(topicId);
  }

  canGenerate = computed(
    () =>
      !!this.selectedGrade() &&
      !!this.selectedLevel() &&
      this.selectedTopics().length > 0 &&
      !this.generatingWorksheet(),
  );

  async generatePractice(): Promise<void> {
    if (!this.canGenerate()) return;

    this.generatingWorksheet.set(true);
    this.worksheetError.set('');

    const payload = {
      studentId: this.auth.getStoredStudentId() ?? undefined,
      grade: String(this.selectedGrade()),
      topic: this.selectedTopics(),
      level: this.selectedLevel(),
      questionCount: this.questionCount(),
      source: 'practice' as const,
    };

    try {
      const worksheet = await firstValueFrom(this.api.createPracticeWorksheetV1(payload));
      await this.router.navigate(['/practice/worksheet'], {
        state: {
          worksheet,
          selectedGrade: this.selectedGrade(),
          selectedTopics: this.selectedTopics(),
          selectedLevel: this.selectedLevel(),
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
