import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  TopicService,
  type ExplorationRecommendation,
  type TopicBrowserResponse,
} from '../../services/topic.service';
import {
  SyllabusService,
  type SyllabusDomain,
  type SyllabusDomainDetail,
} from '../../services/syllabus.service';
import { LanguageToggleComponent } from '../../components/language-toggle/language-toggle';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslationService } from '../../services/translation.service';

export type ExploreFilter = 'domain' | 'rit-band' | 'reasoning-level' | 'competition-difficulty';

const SUPER_SYLLABUS_CATEGORIES: Array<{
  id: SyllabusDomain;
  label: string;
  icon: string;
  description: string;
  color: string;
}> = [
  {
    id: 'fluency',
    label: 'Fluency & Speed',
    icon: '⚡',
    description: 'Build automatic recall and computational speed across all operations.',
    color: 'bg-amber-50 border-amber-200 text-amber-800',
  },
  {
    id: 'conceptual-mastery',
    label: 'Conceptual Mastery',
    icon: '🧩',
    description: 'Deep understanding of number sense, fractions, algebra, and geometry.',
    color: 'bg-blue-50 border-blue-200 text-blue-800',
  },
  {
    id: 'reasoning-logic',
    label: 'Reasoning & Logic',
    icon: '🔍',
    description: 'Critical thinking, pattern recognition, and multi-step problem solving.',
    color: 'bg-purple-50 border-purple-200 text-purple-800',
  },
  {
    id: 'map-skills',
    label: 'MAP Skills (RIT Bands)',
    icon: '📊',
    description: 'NWEA MAP-aligned skills organized by RIT band for targeted growth.',
    color: 'bg-green-50 border-green-200 text-green-800',
  },
  {
    id: 'competition-math',
    label: 'Competition Math',
    icon: '🏆',
    description: 'AMC, MATHCOUNTS, and AIME level problems for advanced students.',
    color: 'bg-red-50 border-red-200 text-red-800',
  },
];

const RIT_BAND_OPTIONS = [180, 190, 200, 210, 220, 230, 240, 250, 260, 270];
const REASONING_LEVELS = ['basic', 'intermediate', 'advanced'] as const;
const COMPETITION_LEVELS = ['AMC-8', 'AMC-10', 'MATHCOUNTS', 'AIME'] as const;

@Component({
  selector: 'app-topic-browser',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LanguageToggleComponent, TranslatePipe],
  templateUrl: './topic-browser.html',
  styleUrl: './topic-browser.css',
})
export class TopicBrowserComponent implements OnInit {
  readonly t = inject(TranslationService);
  studentId = signal('student-demo');
  selectedTopicId = signal('foundation');
  browser = signal<TopicBrowserResponse | null>(null);
  exploration = signal<ExplorationRecommendation | null>(null);
  loading = signal(false);
  explorationLoading = signal(false);
  errorMessage = signal('');

  // Super-Syllabus additions
  superCategories = SUPER_SYLLABUS_CATEGORIES;
  selectedCategory = signal<SyllabusDomain | null>(null);
  categoryDetail = signal<SyllabusDomainDetail | null>(null);
  categoryLoading = signal(false);

  // Exploration filters
  exploreFilter = signal<ExploreFilter>('domain');
  selectedRITBand = signal(220);
  selectedReasoningLevel = signal<'basic' | 'intermediate' | 'advanced'>('intermediate');
  selectedCompetitionLevel = signal<'AMC-8' | 'AMC-10' | 'MATHCOUNTS' | 'AIME'>('AMC-8');
  ritBandOptions = RIT_BAND_OPTIONS;
  reasoningLevels = REASONING_LEVELS;
  competitionLevels = COMPETITION_LEVELS;

  filteredTopics = computed(() => {
    const all = this.browser()?.browseTopics ?? [];
    const filter = this.exploreFilter();
    if (filter === 'domain') return all;
    if (filter === 'rit-band') {
      // RIT bands 180-280 map linearly to difficulty 0-100: difficulty = (rit - 180)
      const band = this.selectedRITBand();
      const diffCenter = Math.min(100, Math.max(0, band - 180));
      return all.filter((t) =>
        t.difficultyTiers.some(
          (tier) => tier.min <= diffCenter + 15 && tier.max >= diffCenter - 15,
        ),
      );
    }
    if (filter === 'reasoning-level') {
      const level = this.selectedReasoningLevel();
      const diffMap = { basic: [0, 33], intermediate: [34, 66], advanced: [67, 100] };
      const [min, max] = diffMap[level];
      return all.filter((t) =>
        t.difficultyTiers.some((tier) => tier.min >= min && tier.max <= max + 10),
      );
    }
    if (filter === 'competition-difficulty') {
      const level = this.selectedCompetitionLevel();
      const diffMap: Record<string, number> = { 'AMC-8': 50, 'AMC-10': 65, 'MATHCOUNTS': 78, 'AIME': 90 };
      const minDiff = diffMap[level] ?? 50;
      return all.filter((t) => t.difficultyTiers.some((tier) => tier.max >= minDiff));
    }
    return all;
  });

  constructor(
    private readonly topicService: TopicService,
    private readonly syllabusService: SyllabusService,
  ) {}

  ngOnInit(): void {
    this.loadBrowser();
  }

  loadBrowser(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.topicService.getTopicBrowser(this.studentId()).subscribe({
      next: (response) => {
        this.browser.set(response);
        if (response.browseTopics.length > 0) {
          this.selectedTopicId.set(response.browseTopics[0].id);
        }
        this.loading.set(false);
        this.loadExplorationRecommendation();
      },
      error: () => {
        this.errorMessage.set('Unable to load topic browser.');
        this.loading.set(false);
      },
    });
  }

  loadExplorationRecommendation(): void {
    this.explorationLoading.set(true);
    this.topicService
      .getExplorationRecommendation(this.studentId(), this.selectedTopicId())
      .subscribe({
        next: (response) => {
          this.exploration.set(response);
          this.explorationLoading.set(false);
        },
        error: () => {
          this.explorationLoading.set(false);
        },
      });
  }

  selectCategory(categoryId: SyllabusDomain): void {
    if (this.selectedCategory() === categoryId) {
      this.selectedCategory.set(null);
      this.categoryDetail.set(null);
      return;
    }
    this.selectedCategory.set(categoryId);
    this.categoryLoading.set(true);
    this.syllabusService.getDomain(categoryId).subscribe({
      next: (detail) => {
        this.categoryDetail.set(detail);
        this.categoryLoading.set(false);
      },
      error: () => {
        this.categoryDetail.set(null);
        this.categoryLoading.set(false);
      },
    });
  }
}
