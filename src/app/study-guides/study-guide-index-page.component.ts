import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PracticeTopicCatalogService } from '../services/practice-topic-catalog.service';
import { EnhancedTopic } from '../services/practice-config.service';
import { StudyGuideService } from '../services/study-guide.service';
import { isHiddenTopic } from '../constants/hidden-topics';

const STAGES = [
  'Early years',
  'Addition & subtraction',
  'Multiplication & division',
  'Fractions',
  'Decimals & everyday maths',
  'Algebra',
  'Advanced',
] as const;
type Stage = (typeof STAGES)[number];

/**
 * The API has no stage field, so guides are grouped by keywords in their id/title, falling back to
 * the lowest grade of their topics. Order matters: "adding-fractions" is Fractions, not Addition.
 */
const STAGE_RULES: Array<[Stage, RegExp]> = [
  ['Fractions', /fraction/],
  ['Decimals & everyday maths', /decimal|money|percent|\btime\b|clock|measure|length|mass|weight|capacity|unit|data|graph|chart|calendar|rupee|ratio/],
  ['Advanced', /trig|calculus|statistic|probability|exponent|power|root|sqrt|surd|polynomial|function|matri|logarithm|geometry|angle|area|volume|circle|pythag|coordinate/],
  ['Algebra', /algebra|equation|expression|variable|linear|quadratic|inequal|pattern|sequence/],
  ['Multiplication & division', /multipl|divis|divid|times|factor|multiple|remainder|prime/],
  ['Addition & subtraction', /addition|subtract|\badd|sum|plus|minus|carry|borrow|regroup/],
  ['Early years', /count|number-sense|shape|compar|place-value|before-after|more-less|bond/],
];

interface GuideRow {
  id: string;
  title: string;
  topics: Array<{ id: string; name: string; grade: number | null; level: string | null }>;
  stage: Stage;
}

@Component({
  selector: 'app-study-guide-index-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './study-guide-index-page.component.html',
  styleUrls: ['./study-guide-index-page.component.css'],
})
export class StudyGuideIndexPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly guides = inject(StudyGuideService);
  private readonly catalog = inject(PracticeTopicCatalogService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly rows = signal<GuideRow[]>([]);
  readonly search = signal('');
  /** Guide whose topic picker is open (for guides that cover several topics). */
  readonly pickerFor = signal<string | null>(null);

  readonly groups = computed(() => {
    const q = this.search().trim().toLowerCase();
    const matches = this.rows().filter(
      (r) =>
        !q ||
        r.title.toLowerCase().includes(q) ||
        r.topics.some((t) => t.name.toLowerCase().includes(q)),
    );
    return STAGES.map((stage) => ({
      stage,
      guides: matches.filter((r) => r.stage === stage).sort((a, b) => a.title.localeCompare(b.title)),
    })).filter((g) => g.guides.length > 0);
  });

  readonly resultCount = computed(() => this.groups().reduce((n, g) => n + g.guides.length, 0));

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    await this.catalog.loadMergedCatalogAsync();
    const byId = new Map<string, EnhancedTopic>(this.catalog.getCatalog().map((t) => [t.id, t]));

    this.guides.index().subscribe({
      next: (res) => {
        this.rows.set(
          (res.guides ?? []).map((g) => {
            const topics = g.topicIds.filter((id) => !isHiddenTopic(id)).map((id) => {
              const t = byId.get(id);
              return {
                id,
                name: t?.name ?? this.prettify(id),
                grade: t?.cbseGrade ?? null,
                level: t?.practiceLevel ?? null,
              };
            });
            return { id: g.id, title: g.title, topics, stage: this.stageFor(g.id, g.title, topics) };
          })
          // A guide whose topics are all drawing-only has nothing to open.
          .filter((row) => row.topics.length > 0),
        );
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(err instanceof Error ? err.message : 'Unable to load study guides.');
        this.loading.set(false);
      },
    });
  }

  open(row: GuideRow): void {
    if (row.topics.length === 1) {
      this.openTopic(row.topics[0].id);
    } else {
      this.pickerFor.update((cur) => (cur === row.id ? null : row.id));
    }
  }

  openTopic(topicId: string): void {
    this.router.navigate(['/study-guides/topic', topicId]);
  }

  gradeLabel(grade: number | null): string {
    if (grade === null) return '';
    return grade === 0 ? 'K' : `G${grade}`;
  }

  gradeRange(row: GuideRow): string {
    const grades = row.topics.map((t) => t.grade).filter((g): g is number => g !== null);
    if (!grades.length) return '';
    const min = Math.min(...grades);
    const max = Math.max(...grades);
    const label = (g: number) => (g === 0 ? 'K' : String(g));
    return min === max ? `Grade ${label(min)}` : `Grades ${label(min)}–${label(max)}`;
  }

  /** e.g. "Grades 3–4 · 2 topics"; parts are skipped when unknown. */
  metaLine(row: GuideRow): string {
    const topics = row.topics.length > 1 ? `${row.topics.length} topics` : '';
    return [this.gradeRange(row), topics].filter(Boolean).join(' · ');
  }

  private stageFor(id: string, title: string, topics: GuideRow['topics']): Stage {
    const text = `${id} ${title}`.toLowerCase();
    for (const [stage, pattern] of STAGE_RULES) {
      if (pattern.test(text)) return stage;
    }
    const grades = topics.map((t) => t.grade).filter((g): g is number => g !== null);
    const minGrade = grades.length ? Math.min(...grades) : null;
    if (minGrade !== null && minGrade <= 1) return 'Early years';
    if (minGrade !== null && minGrade >= 7) return 'Advanced';
    return 'Decimals & everyday maths';
  }

  private prettify(id: string): string {
    return id.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
