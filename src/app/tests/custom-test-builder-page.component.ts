import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { OnboardingFlowService } from '../services/onboarding-flow.service';
import { PracticeTopicCatalogService } from '../services/practice-topic-catalog.service';
import { EnhancedTopic } from '../services/practice-config.service';
import {
  ADHOC_DEFAULT_QUESTIONS,
  ADHOC_MAX_TOPICS,
  AdhocTestService,
  AdhocSelection,
} from '../services/adhoc-test.service';

const QUESTION_PRESETS = [10, 20, 30, 50];
// Known syllabus levels, easiest first; anything else is sorted after these alphabetically.
const LEVEL_ORDER = ['PreBeginner', 'Beginner', 'Elementary', 'Intermediate', 'Advanced'];

@Component({
  selector: 'app-custom-test-builder-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './custom-test-builder-page.component.html',
  styleUrls: ['./test-pages.css', './custom-test-builder-page.component.css'],
})
export class CustomTestBuilderPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly onboarding = inject(OnboardingFlowService);
  private readonly catalog = inject(PracticeTopicCatalogService);
  private readonly adhoc = inject(AdhocTestService);

  readonly maxTopics = ADHOC_MAX_TOPICS;
  readonly presets = QUESTION_PRESETS;

  private studentId = '';

  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly topics = signal<EnhancedTopic[]>([]);

  readonly search = signal('');
  readonly gradeFilter = signal<number | null>(null);
  readonly levelFilter = signal<string | null>(null);

  readonly selectedIds = signal<string[]>([]);
  readonly requestedCount = signal(ADHOC_DEFAULT_QUESTIONS);

  readonly generating = signal(false);
  readonly generateError = signal('');
  readonly hasUnfinishedTest = signal(false);

  /** The student's grade, used only to label harder topics. Never used to block a choice. */
  readonly studentGrade = computed(() => {
    const g = parseInt(this.onboarding.getState().grade, 10);
    return Number.isFinite(g) ? g : null;
  });

  private readonly topicsById = computed(() => new Map(this.topics().map((t) => [t.id, t])));

  readonly grades = computed(() =>
    [...new Set(this.topics().map((t) => t.cbseGrade))].sort((a, b) => a - b),
  );

  readonly levels = computed(() => {
    const rank = (l: string) => {
      const i = LEVEL_ORDER.indexOf(l);
      return i === -1 ? LEVEL_ORDER.length : i;
    };
    return [...new Set(this.topics().map((t) => t.practiceLevel).filter(Boolean))].sort(
      (a, b) => rank(a) - rank(b) || a.localeCompare(b),
    );
  });

  readonly filteredTopics = computed(() => {
    const q = this.search().trim().toLowerCase();
    const grade = this.gradeFilter();
    const level = this.levelFilter();
    return this.topics()
      .filter((t) => grade === null || t.cbseGrade === grade)
      .filter((t) => level === null || t.practiceLevel === level)
      .filter((t) => !q || t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q))
      .sort((a, b) => a.cbseGrade - b.cbseGrade || a.name.localeCompare(b.name));
  });

  readonly selectedTopics = computed(() =>
    this.selectedIds()
      .map((id) => this.topicsById().get(id))
      .filter((t): t is EnhancedTopic => !!t),
  );

  readonly atTopicLimit = computed(() => this.selectedIds().length >= ADHOC_MAX_TOPICS);

  readonly range = computed(() => this.adhoc.questionRange(this.selectedIds().length));

  /** Requested count clamped to what the server accepts for the current selection. */
  readonly questionCount = computed(() => {
    const { min, max } = this.range();
    return Math.min(max, Math.max(min, this.requestedCount()));
  });

  readonly canGenerate = computed(() => this.selectedIds().length > 0 && !this.generating());

  async ngOnInit(): Promise<void> {
    const studentId = this.auth.getStoredStudentId();
    if (!studentId) {
      await this.router.navigate(['/auth/access-code']);
      return;
    }
    this.studentId = studentId;
    this.hasUnfinishedTest.set(!!this.adhoc.loadActive(studentId));
    await this.loadTopics();
  }

  async loadTopics(): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    await this.catalog.loadMergedCatalogAsync();
    const topics = this.catalog.getCatalog();
    this.topics.set(topics);
    this.loading.set(false);

    if (!topics.length) {
      this.loadError.set("We couldn't load the topic list. Please refresh the page to try again.");
      return;
    }

    // Pre-fill from the last test so a quick rebuild is one tap.
    const last = this.adhoc.loadLastSelection(this.studentId);
    if (last) {
      const known = last.topicIds.filter((id) => this.topicsById().has(id)).slice(0, ADHOC_MAX_TOPICS);
      this.selectedIds.set(known);
      this.requestedCount.set(last.questionCount || ADHOC_DEFAULT_QUESTIONS);
    }
  }

  /* ---------------- Picking ---------------- */

  isSelected(id: string): boolean {
    return this.selectedIds().includes(id);
  }

  toggle(topic: EnhancedTopic): void {
    if (this.isSelected(topic.id)) {
      this.remove(topic.id);
    } else if (!this.atTopicLimit()) {
      this.selectedIds.update((ids) => [...ids, topic.id]);
    }
  }

  remove(id: string): void {
    this.selectedIds.update((ids) => ids.filter((x) => x !== id));
  }

  clearSelection(): void {
    this.selectedIds.set([]);
  }

  isAboveGrade(topic: EnhancedTopic): boolean {
    const g = this.studentGrade();
    return g !== null && topic.cbseGrade > g;
  }

  gradeLabel(grade: number): string {
    return grade === 0 ? 'K' : String(grade);
  }

  /* ---------------- Question count ---------------- */

  setCount(n: number): void {
    const { min, max } = this.range();
    this.requestedCount.set(Math.min(max, Math.max(min, Math.round(n))));
  }

  step(delta: number): void {
    this.setCount(this.questionCount() + delta);
  }

  presetDisabled(n: number): boolean {
    const { min, max } = this.range();
    return n < min || n > max;
  }

  /* ---------------- Generate ---------------- */

  resumeTest(): void {
    this.router.navigate(['/tests/custom/take']);
  }

  async generate(): Promise<void> {
    if (!this.canGenerate()) return;
    this.generating.set(true);
    this.generateError.set('');

    const selection: AdhocSelection = {
      topicIds: [...this.selectedIds()],
      questionCount: this.questionCount(),
    };
    this.adhoc.saveLastSelection(this.studentId, selection);

    try {
      const test = await this.adhoc.generate(this.studentId, selection);
      this.adhoc.saveActive({
        studentId: this.studentId,
        test,
        selection,
        answers: {},
        startedAt: new Date().toISOString(),
        currentIndex: 0,
      });
      await this.router.navigate(['/tests/custom/take']);
    } catch (err) {
      this.generateError.set(err instanceof Error ? err.message : 'Unable to create the test.');
    } finally {
      this.generating.set(false);
    }
  }
}
