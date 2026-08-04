import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LearningApiService } from '../../services/learning-api.service';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import {
  PracticeConfigService,
  type EnhancedTopic,
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

    this.practiceConfig.getTopics().subscribe({
      next: (topics ) => {
        this.topics.set(topics);
        this.syllabusLoading.set(false);
        // Auto-select first grade
        const grades = this.allowedGrades();
        if (grades.length) {
          this.selectedGrade.set(grades[0]);
        }
      },
      error: () => {
        this.syllabusError.set('Unable to load practice topics. Please try again.');
        this.syllabusLoading.set(false);
      },
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
