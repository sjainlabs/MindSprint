import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import {
  type LearningLevel,
  normalizeLearningLevelIdentifier,
} from '../../services/diagnostic.service';
import {
  SyllabusService,
  type SuperSyllabus,
} from '../../services/syllabus.service';
import {
  TopicService,
  type BrowseTopic,
  type ExplorationRecommendation,
  type TopicBrowserResponse,
} from '../../services/topic.service';
import { LanguageToggleComponent } from '../../components/language-toggle/language-toggle';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { PracticeLevelsComponent } from '../../practice/components/practice-levels.component';
import { TopicMapComponent } from '../../practice/components/topic-map.component';
import { TopicLibraryPreviewComponent } from '../../practice/components/topic-library-preview.component';

@Component({
  selector: 'app-practice-hub-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    LanguageToggleComponent,
    TranslatePipe,
    PracticeLevelsComponent,
    TopicMapComponent,
    TopicLibraryPreviewComponent,
  ],
  templateUrl: './practice-hub.component.html',
  styleUrl: './practice-hub.component.css',
})
export class PracticeHubPageComponent implements OnInit {
  readonly studentId = signal('');
  readonly studentName = signal('');
  readonly selectedLevel = signal<LearningLevel>('Beginner');
  readonly selectedSkillId = signal('');
  readonly expandedSection = signal<'topic-map' | 'topic-library' | null>(null);

  readonly syllabusPreview = signal<SuperSyllabus | null>(null);
  readonly browser = signal<TopicBrowserResponse | null>(null);
  readonly recommendation = signal<ExplorationRecommendation | null>(null);

  readonly loading = signal(false);
  readonly syllabusLoading = signal(false);
  readonly errorMessage = signal('');

  readonly levels: LearningLevel[] = [
    'Foundation',
    'Beginner',
    'Elementary',
    'Intermediate',
    'PreAlgebra',
    'Algebra',
    'Advanced',
    'ACT',
  ];

  readonly recommendedTopicCards = computed(() => (this.browser()?.browseTopics ?? []).slice(0, 6));

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly syllabusService: SyllabusService,
    private readonly topicService: TopicService,
  ) {}

  ngOnInit(): void {
    const requestedLevel = normalizeLearningLevelIdentifier(
      this.route.snapshot.queryParamMap.get('level'),
    );
    const requestedStudentId = this.route.snapshot.queryParamMap.get('studentId')?.trim() ?? '';
    const activeStudentId = requestedStudentId || this.authService.getStoredStudentId()?.trim() || '';
    if (requestedLevel) {
      this.selectedLevel.set(requestedLevel);
    }
    if (activeStudentId) {
      this.studentId.set(activeStudentId);
      this.authService.setActiveStudentId(activeStudentId);
      void this.resolveStudentName();
    } else {
      this.errorMessage.set('Student not found. Select a child from the parent dashboard first.');
      return;
    }

    this.loadHub();
  }

  loadHub(): void {
    if (!this.studentId().trim()) {
      this.errorMessage.set('Student not found. Select a child from the parent dashboard first.');
      return;
    }

    this.authService.setActiveStudentId(this.studentId());
    void this.resolveStudentName();
    this.errorMessage.set('');
    this.loadRecommendationMap();
    this.loadSyllabusPreview();
  }

  private async resolveStudentName(): Promise<void> {
    const activeStudentId = this.studentId().trim();
    if (!activeStudentId) {
      this.studentName.set('');
      return;
    }

    try {
      const student = await this.authService.getStudentProfile(activeStudentId);
      this.studentName.set(student?.name?.trim() || 'Student');
    } catch {
      this.studentName.set('Student');
    }
  }

  loadRecommendationMap(): void {
    this.loading.set(true);
    this.topicService.getTopicBrowser(this.studentId()).subscribe({
      next: (response) => {
        this.browser.set(response);
        const firstTopic = response.browseTopics[0];
        const firstSkillId = firstTopic?.skillId ?? firstTopic?.id ?? '';
        if (!this.selectedSkillId() && firstSkillId) {
          this.selectedSkillId.set(firstSkillId);
        }
        this.loading.set(false);
        this.loadRecommendation(firstTopic?.id ?? this.selectedSkillId());
      },
      error: () => {
        this.errorMessage.set('Unable to load practice hub right now.');
        this.loading.set(false);
      },
    });
  }

  loadRecommendation(topicId: string): void {
    if (!topicId) {
      this.recommendation.set(null);
      return;
    }

    this.topicService.getExplorationRecommendation(this.studentId(), topicId).subscribe({
      next: (response) => {
        this.recommendation.set(response);
      },
      error: () => {
        this.recommendation.set(null);
      },
    });
  }

  loadSyllabusPreview(): void {
    this.syllabusLoading.set(true);
    this.syllabusService.getSyllabus().subscribe({
      next: (response) => {
        this.syllabusPreview.set(response);
        this.syllabusLoading.set(false);
      },
      error: () => {
        this.syllabusPreview.set(null);
        this.syllabusLoading.set(false);
        this.errorMessage.set('Unable to load the topic library.');
      },
    });
  }

  startPractice(skillId?: string, level?: LearningLevel): void {
    const nextLevel = level ?? this.selectedLevel();
    const nextSkillId = skillId ?? this.selectedSkillId();
    void this.router.navigate(['/worksheet', nextLevel], {
      queryParams: {
        studentId: this.studentId(),
        ...(nextSkillId ? { topicId: nextSkillId } : {}),
      },
    });
  }

  openTopicDetail(skillId: string, browseTopic?: BrowseTopic): void {
    if (!skillId.trim()) {
      return;
    }
    this.selectedSkillId.set(skillId.trim());
    void this.router.navigate(['/topic/detail'], {
      queryParams: {
        studentId: this.studentId(),
        skillId: skillId.trim(),
        level: this.selectedLevel(),
      },
      state: { browseTopic: browseTopic ?? null },
    });
  }

  openTopicLibrary(): void {
    void this.router.navigate(['/topic/library'], {
      queryParams: {
        studentId: this.studentId(),
      },
    });
  }

  openAiWorksheet(): void {
    void this.router.navigate(['/ai/worksheet'], {
      queryParams: {
        studentId: this.studentId(),
        ...(this.selectedSkillId() ? { skillId: this.selectedSkillId() } : {}),
      },
    });
  }

  openRitLookup(): void {
    void this.router.navigate(['/topic/rit-lookup'], {
      queryParams: {
        studentId: this.studentId(),
      },
    });
  }

  useRecommendedTopic(): void {
    const recommendedTopic = this.recommendation()?.recommendedTopicId;
    if (!recommendedTopic) {
      return;
    }

    const matchingTopic = (this.browser()?.browseTopics ?? []).find(
      (topic) => topic.id === recommendedTopic,
    );
    const skillId = matchingTopic?.skillId ?? matchingTopic?.id ?? recommendedTopic;
    this.openTopicDetail(skillId, matchingTopic);
  }

  resolveRecommendedSkillId(recommendedTopicId: string): string {
    const matchingTopic = (this.browser()?.browseTopics ?? []).find(
      (topic) => topic.id === recommendedTopicId,
    );
    return matchingTopic?.skillId ?? matchingTopic?.id ?? recommendedTopicId;
  }

  toggleSection(section: 'topic-map' | 'topic-library'): void {
    this.expandedSection.set(this.expandedSection() === section ? null : section);
  }
}

