import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AiWorksheetService, type AiWorksheet } from '../../services/ai-worksheet.service';
import {
  type LearningLevel,
  normalizeLearningLevelIdentifier,
} from '../../services/diagnostic.service';
import {
  SyllabusService,
  type RITBandSkills,
  type SuperSyllabus,
  type SyllabusSkill,
} from '../../services/syllabus.service';
import {
  TopicService,
  type ExplorationRecommendation,
  type TopicBrowserResponse,
} from '../../services/topic.service';
import { LanguageToggleComponent } from '../../components/language-toggle/language-toggle';

@Component({
  selector: 'app-practice-hub-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LanguageToggleComponent],
  templateUrl: './practice-hub.component.html',
  styleUrl: './practice-hub.component.css',
})
export class PracticeHubPageComponent implements OnInit {
  readonly studentId = signal('');
  readonly studentName = signal('');
  readonly selectedLevel = signal<LearningLevel>('Beginner');
  readonly selectedSkillId = signal('');
  readonly selectedRitBand = signal(220);
  readonly aiDifficulty = signal(70);

  readonly syllabus = signal<SuperSyllabus | null>(null);
  readonly ritSkills = signal<RITBandSkills | null>(null);
  readonly selectedSkill = signal<SyllabusSkill | null>(null);
  readonly browser = signal<TopicBrowserResponse | null>(null);
  readonly recommendation = signal<ExplorationRecommendation | null>(null);
  readonly aiWorksheet = signal<AiWorksheet | null>(null);

  readonly loading = signal(false);
  readonly syllabusLoading = signal(false);
  readonly skillLoading = signal(false);
  readonly ritLoading = signal(false);
  readonly aiLoading = signal(false);
  readonly errorMessage = signal('');
  readonly aiError = signal('');

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

  readonly ritBandOptions = [180, 190, 200, 210, 220, 230, 240, 250, 260, 270];

  readonly allSkills = computed(() =>
    (this.syllabus()?.domains ?? []).flatMap((domain) => domain.skills ?? []),
  );

  readonly recommendedTopicCards = computed(() => (this.browser()?.browseTopics ?? []).slice(0, 6));

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly syllabusService: SyllabusService,
    private readonly topicService: TopicService,
    private readonly aiWorksheetService: AiWorksheetService,
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
    this.loadSyllabus();
    this.loadRitBand();
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

  loadSyllabus(): void {
    this.syllabusLoading.set(true);
    this.syllabusService.getSyllabus().subscribe({
      next: (response) => {
        this.syllabus.set(response);
        const firstSkillId = response.domains.flatMap((domain) => domain.skills)[0]?.skillId ?? '';
        const targetSkillId = this.selectedSkillId() || firstSkillId;
        if (targetSkillId) {
          this.selectSkill(targetSkillId);
        }
        this.syllabusLoading.set(false);
      },
      error: () => {
        this.syllabusLoading.set(false);
        this.errorMessage.set('Unable to load the topic library.');
      },
    });
  }

  loadRitBand(): void {
    this.ritLoading.set(true);
    this.syllabusService.getSkillsByRIT(this.selectedRitBand()).subscribe({
      next: (response) => {
        this.ritSkills.set(response);
        this.ritLoading.set(false);
      },
      error: () => {
        this.ritSkills.set(null);
        this.ritLoading.set(false);
      },
    });
  }

  selectSkill(skillId: string): void {
    const normalizedSkillId = skillId.trim();
    if (!normalizedSkillId) {
      return;
    }

    this.selectedSkillId.set(normalizedSkillId);
    this.skillLoading.set(true);
    this.syllabusService.getSkill(normalizedSkillId).subscribe({
      next: (skill) => {
        this.selectedSkill.set(skill);
        this.skillLoading.set(false);
        this.loadRecommendation(skill.skillId);
      },
      error: () => {
        this.selectedSkill.set(null);
        this.skillLoading.set(false);
      },
    });
  }

  updateRitBand(value: number | string): void {
    const nextBand = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(nextBand)) {
      return;
    }
    this.selectedRitBand.set(nextBand);
    this.loadRitBand();
  }

  updateAiDifficulty(value: number | string): void {
    const parsed = typeof value === 'number' ? value : Number(value);
    this.aiDifficulty.set(Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 70);
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

  generateAiWorksheet(): void {
    const skill = this.selectedSkill();
    if (!skill || this.aiLoading()) {
      return;
    }

    this.aiLoading.set(true);
    this.aiError.set('');
    this.aiWorksheet.set(null);

    this.aiWorksheetService
      .generateWorksheet({
        topic: skill.skillId,
        difficulty: this.aiDifficulty(),
        questionCount: 6,
        studentId: this.studentId(),
      })
      .subscribe({
        next: (worksheet) => {
          this.aiWorksheet.set(worksheet);
          this.aiLoading.set(false);
        },
        error: () => {
          this.aiError.set('Unable to generate an AI worksheet right now.');
          this.aiLoading.set(false);
        },
      });
  }

  useRecommendedTopic(): void {
    const recommendedTopicId = this.recommendation()?.recommendedTopicId;
    if (!recommendedTopicId) {
      return;
    }

    this.selectSkill(recommendedTopicId);
  }

  trackBySkillId(_: number, skill: SyllabusSkill): string {
    return skill.skillId;
  }
}

