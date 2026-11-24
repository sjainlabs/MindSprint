import {Component, inject, OnInit, signal, computed, Input} from '@angular/core';
import { MIXED_PRACTICE_LEVEL, worksheetLevel } from '../../shared/utils/practice-level';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { LearningApiService } from '../../services/learning-api.service';
import { PracticeTopicCatalogService } from '../../services/practice-topic-catalog.service';
import { TopicTestService } from '../../services/topic-test.service';
import { TopicTestCardComponent } from '../../components/topic-test-card/topic-test-card.component';

import { AppMascotComponent } from '../../shared/components/app-mascot/app-mascot.component';
import { AppPracticeCardComponent } from '../../shared/components/app-practice-card/app-practice-card.component';
import { AppDailyGoalComponent } from '../../shared/components/app-daily-goal/app-daily-goal.component';
import { AppRewardStarsComponent } from '../../shared/components/app-reward-stars/app-reward-stars.component';
import {EnhancedTopic} from '../../services/practice-config.service';
import { sortBands } from '../../shared/utils/bands';

@Component({
  selector: 'app-practice-hub',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AppMascotComponent,
    AppPracticeCardComponent,
    AppDailyGoalComponent,
    TopicTestCardComponent,
  ],
  templateUrl: './practice-hub.component.html',
  styleUrls: ['./practice-hub.component.css'],
})
export class PracticeHubComponent implements OnInit {
  private readonly api = inject(LearningApiService);
  protected readonly auth = inject(AuthService);
  private readonly catalog = inject(PracticeTopicCatalogService);
  protected readonly topicTests = inject(TopicTestService);
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
  topicSearch = signal('');

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

  /** Browse topics by school grade or by band */
  browseBy = signal<'grade' | 'band'>('grade');
  selectedBand = signal<string | null>(null);

  // ── Derived values ───────────────────────────────────────────────────────────
  allowedBands = computed(() => sortBands(this.topics().map(t => t.band)));

  allowedGrades = computed(() => {
    const all = this.topics();
    if (!all.length) return [];
    const gradeSet = new Set(all.map(t => t.cbseGrade));
    return Array.from(gradeSet).sort((a, b) => a - b);
  });

  // filteredTopics = computed(() => {
  //   const grade = this.selectedGrade();
  //   const all = this.topics();
  //   if (grade == null) return [];
  //   return all.filter(t => t.cbseGrade === grade);
  // });

  filteredTopics = computed(() => {
    const grade = this.selectedGrade();
    const search = this.topicSearch().trim().toLowerCase();
    const all = this.topics();

    let result = all;

    // 🔍 Search across ALL grades
    if (search.length > 0) {
      result = result.filter(t =>
        t.name.toLowerCase().includes(search) ||
        t.id.toLowerCase().includes(search)
      );
      return result; // search overrides grade filter
    }

    // 🏫 Grade filter (default), or band
    if (this.browseBy() === 'band') {
      const band = this.selectedBand();
      result = result.filter(t => t.band === band).sort((a, b) => a.cbseGrade - b.cbseGrade);
    } else if (grade != null) {
      result = result.filter(t => t.cbseGrade === grade);
    }

    // Optional challenge topics after the grade's core topics
    return [...result.filter(t => !t.challenge), ...result.filter(t => t.challenge)];
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
      this.topicTests.ingest(insights.topicTests);

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

  // ── Band selection ───────────────────────────────────────────────────────────
  setBrowseBy(mode: 'grade' | 'band'): void {
    this.topicSearch.set('');
    this.browseBy.set(mode);
    if (mode === 'band' && !this.selectedBand()) {
      // Start at the band of the selected grade's first topic, so the view stays in familiar territory
      const first = this.topics().find(t => t.cbseGrade === this.selectedGrade() && t.band);
      this.selectedBand.set(first?.band ?? this.allowedBands()[0] ?? null);
    }
  }

  onBandChange(band: string): void {
    this.topicSearch.set('');
    this.selectedBand.set(band);
  }

  /** "Grade 3 topics" or "Band D topics" */
  listTitle(): string {
    if (this.isSearching()) return 'Search results';
    return this.browseBy() === 'band' ? `Band ${this.selectedBand() ?? ''} topics` : `Grade ${this.gradeLabel(this.selectedGrade())} topics`;
  }

  // ── Grade selection ──────────────────────────────────────────────────────────
  onGradeChange(grade: number): void {
    // Picking a grade means "browse this grade", so drop any all-grades search.
    // Picked topics stay picked, so one sheet can mix topics from several grades.
    this.topicSearch.set('');
    this.selectedGrade.set(grade);
  }

  // ── Topic selection ──────────────────────────────────────────────────────────
  selectTopic(topic: any): void {
    // Any topics can go together, whatever their grade or band
    const current = this.selectedTopics();
    this.worksheetError.set('');

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

    const grade = this.autoGrade();

    const selected = this.selectedTopics();
    const studentId = this.auth.getStoredStudentId();

    if (!studentId || grade === null || selected.length === 0) return;

    this.generatingWorksheet.set(true);
    this.worksheetError.set('');

    const topicIds = selected.map(t => t.id);

    const payload = {
      studentId,
      grade: String(grade),
      topic: topicIds,
      // Mixed when the topics span grades or levels; the grade then only labels the sheet
      level: worksheetLevel(selected),
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

  onTopicSearchChange(value: string): void {
    this.topicSearch.set(value);
  }

  clearSearch(): void {
    this.topicSearch.set('');
  }

  readonly isSearching = computed(() => this.topicSearch().trim().length > 0);

  gradeLabel(grade: number | null): string {
    return grade === 0 ? 'K' : String(grade ?? '');
  }

  readonly autoGrade = computed(() => {
    const selected = this.selectedTopics();

    if (selected.length > 0) {
      // If multiple topics across grades → pick the lowest grade
      return Math.min(...selected.map(t => t.cbseGrade));
    }

    return this.selectedGrade(); // fallback
  });

  /** Picked topics come from more than one grade or level, so the sheet is mixed. */
  readonly isMixed = computed(() => worksheetLevel(this.selectedTopics()) === MIXED_PRACTICE_LEVEL);

  removeSelected(topicId: string): void {
    this.selectedTopics.update((list) => list.filter((t) => t.id !== topicId));
  }

  clearSelected(): void {
    this.selectedTopics.set([]);
  }



}

export default PracticeHubComponent;
