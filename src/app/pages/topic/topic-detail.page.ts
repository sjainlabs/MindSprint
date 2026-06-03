import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { type LearningLevel, normalizeLearningLevelIdentifier } from '../../services/diagnostic.service';
import { SyllabusService, type SyllabusSkill } from '../../services/syllabus.service';
import { TopicService, type BrowseTopic } from '../../services/topic.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageToggleComponent } from '../../components/language-toggle/language-toggle';

@Component({
  selector: 'app-topic-detail-page',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, LanguageToggleComponent],
  templateUrl: './topic-detail.page.html',
  styleUrl: './topic-detail.page.css',
})
export class TopicDetailPageComponent implements OnInit {
  readonly studentId = signal('');
  readonly skillId = signal('');
  readonly level = signal<LearningLevel>('Beginner');
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly skill = signal<SyllabusSkill | null>(null);
  readonly masteryPercent = signal<number | null>(null);
  readonly prerequisites = signal<string[]>([]);
  /** Browse topic passed via router navigation state — used as fallback when syllabus API fails */
  private readonly browseTopic = signal<BrowseTopic | null>(null);

  readonly subskills = computed(() => {
    const activeSkill = this.skill();
    if (!activeSkill) {
      return [];
    }
    return [...activeSkill.tags, ...activeSkill.recommendedNextSteps].slice(0, 8);
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly syllabusService: SyllabusService,
    private readonly topicService: TopicService,
  ) {}

  ngOnInit(): void {
    // Capture browse topic passed via router navigation state (may be null)
    const navState = history.state as { browseTopic?: BrowseTopic | null };
    if (navState?.browseTopic) {
      this.browseTopic.set(navState.browseTopic);
    }

    this.route.queryParamMap.subscribe((params) => {
      const studentId = params.get('studentId')?.trim() || this.authService.getStoredStudentId()?.trim() || '';
      const skillId = params.get('skillId')?.trim() || '';
      const level = normalizeLearningLevelIdentifier(params.get('level')) ?? 'Beginner';

      this.level.set(level);
      this.studentId.set(studentId);
      this.skillId.set(skillId);

      if (studentId) {
        this.authService.setActiveStudentId(studentId);
      }

      if (!skillId) {
        // If a browse topic was passed via navigation state, use its skillId or id
        const bt = this.browseTopic();
        if (bt) {
          const resolvedId = bt.skillId ?? bt.id;
          this.skillId.set(resolvedId);
          this.loadTopicDetail();
        } else {
          this.errorMessage.set('Select a topic from Practice Hub first.');
        }
        return;
      }

      this.loadTopicDetail();
    });
  }

  loadTopicDetail(): void {
    const skillId = this.skillId();
    if (!skillId) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.skill.set(null);
    this.masteryPercent.set(null);
    this.prerequisites.set([]);

    this.syllabusService.getSkill(skillId).subscribe({
      next: (skill) => {
        this.skill.set(skill);
        this.loading.set(false);
        this.loadMasterySnapshot(skill.skillId);
      },
      error: () => {
        // Fallback: synthesise a SyllabusSkill from browse topic data passed via navigation state
        const browseTopic = this.browseTopic();
        if (browseTopic) {
          const syntheticSkill: SyllabusSkill = {
            skillId: this.skillId(),
            name: browseTopic.title,
            description: browseTopic.sourceTopicId || browseTopic.title,
            difficulty: browseTopic.difficultyTiers?.[0]?.min ?? 0,
            gradeRange: { min: 0, max: 12 },
            recommendedNextSteps: browseTopic.recommendedNextSteps ?? [],
            domain: 'conceptual',
            tags: browseTopic.subtopics ?? [],
          };
          this.skill.set(syntheticSkill);
          this.masteryPercent.set(browseTopic.masteryPercentage ?? null);
          this.prerequisites.set(browseTopic.prerequisites ?? []);
        } else {
          this.errorMessage.set('Unable to load topic details right now.');
        }
        this.loading.set(false);
      },
    });
  }

  private loadMasterySnapshot(skillId: string): void {
    const studentId = this.studentId();
    if (!studentId) {
      return;
    }

    this.topicService.getTopicBrowser(studentId).subscribe({
      next: (response) => {
        const mappedTopic = response.browseTopics.find(
          (topic) => topic.skillId === skillId || topic.id === skillId,
        );
        this.masteryPercent.set(mappedTopic?.masteryPercentage ?? null);
        this.prerequisites.set(mappedTopic?.prerequisites ?? []);
      },
      error: () => {
        this.masteryPercent.set(null);
        this.prerequisites.set([]);
      },
    });
  }

  startPractice(): void {
    const skillId = this.skill()?.skillId || this.skillId();
    void this.router.navigate(['/worksheet', this.level()], {
      queryParams: {
        studentId: this.studentId(),
        ...(skillId ? { topicId: skillId } : {}),
      },
    });
  }

  openAiGenerator(): void {
    const skillId = this.skill()?.skillId || this.skillId();
    void this.router.navigate(['/ai/worksheet'], {
      queryParams: {
        studentId: this.studentId(),
        ...(skillId ? { skillId } : {}),
      },
    });
  }
}

