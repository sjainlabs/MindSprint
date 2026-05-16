import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { PracticeService, WorksheetResult, type Worksheet } from '../../services/practice.service';
import { AiWorksheetService, type AiWorksheet } from '../../services/ai-worksheet.service';
import { TopicService } from '../../services/topic.service';
import {
  DEFAULT_STUDENT_ID,
  StudentIntelligenceService,
  type MathOperation,
  type StudentAnalytics,
  type StudentProfile,
  type WorksheetRecommendation,
} from '../../services/student-intelligence.service';
import {
  type LearningLevel,
  normalizeLearningLevelIdentifier,
} from '../../services/diagnostic.service';
import {
  type PracticeTopicDefinition,
  type PracticeTopicGroup,
  findPracticeTopicById,
} from '../../services/practice-topic-catalog';
import { LanguageToggleComponent } from '../../components/language-toggle/language-toggle';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslationService } from '../../services/translation.service';
import {
  MasteryEngineService,
  type MasteryLevel,
  type MasteryRecommendation,
  type MasterySkillState,
} from '../../core/mastery/mastery-engine.service';
import { MasteryBadgeComponent } from '../../components/mastery-badge/mastery-badge.component';
import { MasteryProgressComponent } from '../../components/mastery-progress/mastery-progress.component';
import { RecommendedSkillCardComponent } from '../../components/recommended-skill-card/recommended-skill-card.component';

const VALID_IDENTIFIER_PATTERN = /^[a-z0-9][a-z0-9-_]*$/i;

@Component({
  selector: 'app-worksheet-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    LanguageToggleComponent,
    TranslatePipe,
    MasteryBadgeComponent,
    MasteryProgressComponent,
    RecommendedSkillCardComponent,
  ],
  templateUrl: './worksheet-page.html',
  styleUrl: './worksheet-page.css',
})
export class WorksheetPageComponent implements OnInit {
  readonly t = inject(TranslationService);
  worksheet = signal<Worksheet | null>(null);
  loading = signal(true);
  ready = signal(false);
  errorMessage = signal('');

  currentLevel = signal<LearningLevel>('Beginner');
  studentId = signal(DEFAULT_STUDENT_ID);
  worksheetStartedAt = signal(new Date().toISOString());

  answers = signal<Record<string, number | null>>({});
  checkedAnswers = signal<Record<string, boolean>>({});
  hasCheckedAnswers = signal(false);
  accuracyPercentage = signal<number | null>(null);

  submitting = signal(false);
  submitError = signal('');
  result = signal<WorksheetResult | null>(null);

  intelligenceLoading = signal(false);
  studentProfile = signal<StudentProfile | null>(null);
  studentAnalytics = signal<StudentAnalytics | null>(null);
  recommendation = signal<WorksheetRecommendation | null>(null);
  intelligenceError = signal('');
  adaptiveNavigationLoading = signal(false);

  topics = signal<PracticeTopicDefinition[]>([]);
  topicsLoading = signal(false);
  personalizedPath = signal<PracticeTopicDefinition[]>([]);
  selectedTopicId = signal('');
  aiDifficulty = signal(75);
  aiWorksheet = signal<AiWorksheet | null>(null);
  aiLoading = signal(false);
  aiError = signal('');
  masteryReady = signal(false);
  weakSkills = signal<MasterySkillState[]>([]);
  recommendedSkill = signal<MasteryRecommendation | null>(null);
  private readonly trackedQuestionSubmissions = new Set<string>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly practiceService: PracticeService,
    private readonly studentIntelligenceService: StudentIntelligenceService,
    private readonly topicService: TopicService,
    private readonly aiWorksheetService: AiWorksheetService,
    private readonly masteryEngine: MasteryEngineService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    const levelParam = this.route.snapshot.paramMap.get('level');
    const level = normalizeLearningLevelIdentifier(levelParam);

    if (!level) {
      this.errorMessage.set('Invalid worksheet level.');
      this.loading.set(false);
      return;
    }

    this.currentLevel.set(level);
    this.loadMasteryState();
    this.refreshStudentInsights();
    this.loadWorksheet(level);
    this.loadTopicTaxonomy();
  }

  loadWorksheet(level: LearningLevel): void {
    this.loading.set(true);
    this.ready.set(false);
    this.errorMessage.set('');
    this.worksheet.set(null);
    this.result.set(null);
    this.recommendation.set(null);
    this.hasCheckedAnswers.set(false);
    this.checkedAnswers.set({});
    this.accuracyPercentage.set(null);
    this.submitError.set('');
    this.answers.set({});
    this.trackedQuestionSubmissions.clear();
    this.worksheetStartedAt.set(new Date().toISOString());

    const recommendedSkillId = this.recommendedSkill()?.skillId;
    this.practiceService.getPractice(level, recommendedSkillId).subscribe({
      next: (data) => {
        if (!data?.questions) {
          this.errorMessage.set('Invalid worksheet data received.');
          this.loading.set(false);
          return;
        }

        this.worksheet.set(data);

        const answerMap: Record<string, number | null> = {};
        for (const question of data.questions) {
          answerMap[question.id] = null;
        }
        this.answers.set(answerMap);

        this.loading.set(false);
        this.ready.set(true);
      },
      error: () => {
        this.errorMessage.set('Failed to load worksheet.');
        this.loading.set(false);
      },
    });
  }

  attemptedCount = computed(
    () => Object.values(this.answers()).filter((value) => value !== null).length,
  );

  masteryEntries = computed(() => {
    const profile = this.studentProfile();
    if (!profile) {
      return [] as Array<{ operation: MathOperation; mastery: number }>;
    }

    return (Object.entries(profile.masteryLevels) as Array<[MathOperation, number]>)
      .sort(([, leftMastery], [, rightMastery]) => rightMastery - leftMastery)
      .map(([operation, mastery]) => ({ operation, mastery }));
  });

  accuracyTrend = computed(
    () => this.studentAnalytics()?.accuracyOverTime.slice(-3).reverse() ?? [],
  );
  k12TopicGroups = computed(() => this.groupTopics('k12'));
  kumonTopicGroups = computed(() => this.groupTopics('kumon'));
  selectedTopic = computed(
    () => findPracticeTopicById(this.selectedTopicId()) ?? this.topics()[0] ?? null,
  );
  selectedTopicName = computed(() => this.selectedTopic()?.name ?? '');
  selectedTopicQuestionTypes = computed(() => this.selectedTopic()?.questionTypes.join(', ') ?? '');
  selectedTopicMastery = computed(() => this.getSkillMastery(this.selectedTopicId()));
  selectedTopicMasteryLevel = computed<MasteryLevel>(
    () => this.selectedTopicMastery()?.level ?? 'not-started',
  );
  selectedTopicMasteryProgress = computed(
    () => this.selectedTopicMastery()?.progressToNextLevel ?? 0,
  );
  shouldCelebrateMastery = computed(() => {
    const accuracy = this.accuracyPercentage();
    return accuracy !== null && accuracy > 80;
  });
  shouldReviewPrerequisite = computed(() => {
    const accuracy = this.accuracyPercentage();
    return accuracy !== null && accuracy < 50;
  });
  recommendedLevel = computed(() => this.getNormalizedRecommendedLevel(this.recommendation()));
  recommendedLevelDisplay = computed(() => {
    const recommendation = this.recommendation();
    const rawLevel = this.recommendedLevel();
    if (!recommendation || !rawLevel) {
      return null;
    }
    if (recommendation.recommendedLevelDisplay?.trim()) {
      return recommendation.recommendedLevelDisplay.trim();
    }
    return this.levelDisplayLabel(rawLevel);
  });
  canOpenRecommendedWorksheet = computed(() => {
    const nextLevel = this.recommendedLevel();
    return !!nextLevel && nextLevel !== this.currentLevel();
  });

  submitWorksheet(): void {
    const worksheet = this.worksheet();
    if (!worksheet || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.submitError.set('');

    const payload = {
      worksheetId: worksheet.worksheetId,
      studentId: this.studentId(),
      level: this.currentLevel(),
      startedAt: this.worksheetStartedAt(),
      submittedAt: new Date().toISOString(),
      answers: Object.entries(this.answers())
        .filter(([, answer]) => answer !== null)
        .map(([questionId, answer]) => ({
          questionId,
          answer,
        })),
    };

    this.practiceService.submitWorksheet(payload).subscribe({
      next: (result) => {
        this.result.set(result);
        this.accuracyPercentage.set(result.accuracy);
        this.hasCheckedAnswers.set(true);
        this.checkedAnswers.set(
          result.questionResults.reduce<Record<string, boolean>>((accumulator, questionResult) => {
            accumulator[questionResult.questionId] = questionResult.isCorrect;
            return accumulator;
          }, {}),
        );

        this.refreshStudentInsights(result);
        this.submitting.set(false);
      },
      error: () => {
        this.submitError.set('Failed to submit worksheet.');
        this.submitting.set(false);
      },
    });
  }

  regenerate(level: LearningLevel): void {
    void this.router.navigate(['/worksheet', level]);
  }

  updateAnswer(questionId: string, value: number | null): void {
    this.answers.update((answers) => ({ ...answers, [questionId]: value }));
    this.trackQuestionMastery(questionId, value);
  }

  async goToAdaptive(): Promise<void> {
    const nextLevel = this.recommendedLevel();
    if (!nextLevel || nextLevel === this.currentLevel() || this.adaptiveNavigationLoading()) {
      return;
    }

    this.adaptiveNavigationLoading.set(true);

    try {
      await this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
        return this.router.navigate(['/worksheet', nextLevel]);
      });
    } catch {
      // non-blocking UI fallback
    } finally {
      this.adaptiveNavigationLoading.set(false);
    }
  }

  applyRecommendation(): void {
    void this.goToAdaptive();
  }

  generateAdvancedWorksheet(): void {
    const recommended = this.masteryEngine.getRecommendedNextSkill(this.studentId());
    if (recommended?.skillId && !this.selectedTopicId()) {
      this.selectTopic(recommended.skillId);
    }

    const topic = this.selectedTopic();
    if (!topic || this.aiLoading()) {
      return;
    }

    this.aiLoading.set(true);
    this.aiError.set('');
    this.aiWorksheet.set(null);

    this.aiWorksheetService
      .generateWorksheet({
        topic: topic.id,
        difficulty: this.aiDifficulty(),
        questionTypes: topic.questionTypes,
        questionCount: 8,
        studentId: this.studentId(),
      })
      .subscribe({
        next: (worksheet) => {
          this.aiWorksheet.set(worksheet);
          this.aiLoading.set(false);
        },
        error: () => {
          this.aiError.set('Unable to generate advanced AI worksheet right now.');
          this.aiLoading.set(false);
        },
      });
  }

  updateAiDifficulty(value: number | string): void {
    const parsed = typeof value === 'number' ? value : Number(value);
    this.aiDifficulty.set(Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 75);
  }

  selectTopic(topicId: string): void {
    this.selectedTopicId.set(topicId);
    const topic = this.selectedTopic();
    const suggestedDifficulty = topic?.subtopics[0]
      ? Math.round((topic.subtopics[0].difficulty.min + topic.subtopics[0].difficulty.max) / 2)
      : 75;
    this.aiDifficulty.set(suggestedDifficulty);
  }

  startRecommendedPractice(): void {
    const recommended = this.recommendedSkill();
    if (recommended?.skillId) {
      this.selectTopic(recommended.skillId);
    }
    this.loadWorksheet(this.currentLevel());
  }

  getSkillMastery(skillId: string): MasterySkillState | null {
    if (!skillId) return null;
    return this.masteryEngine.getMastery(skillId, this.studentId());
  }

  topicMasteryTooltip(skillId: string): string {
    const mastery = this.getSkillMastery(skillId);
    if (!mastery) {
      return 'Accuracy: 0% • Attempts: 0 • Last practiced: Never';
    }
    return `Accuracy: ${mastery.accuracy}% • Attempts: ${mastery.attempts} • Last practiced: ${mastery.lastPracticed ?? 'Never'}`;
  }

  masteryLabel(level: MasteryLevel): string {
    if (level === 'mastered') return 'Mastered';
    if (level === 'proficient') return 'Proficient';
    if (level === 'developing') return 'Developing';
    return 'Not started';
  }

  recommendedReasonText(): string {
    const reason = this.recommendedSkill()?.reason;
    if (reason === 'weak-skill') return 'Reason: weak skill';
    if (reason === 'next-progression') return 'Reason: next progression';
    if (reason === 'review-needed') return 'Reason: review needed';
    return this.masteryEngine.getRecommendedNextAction(this.studentId());
  }

  printAiWorksheet(): void {
    const worksheet = this.aiWorksheet();
    if (!worksheet || typeof document === 'undefined') {
      return;
    }

    const topic = this.selectedTopic();
    const frame = document.createElement('iframe');
    frame.style.position = 'fixed';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    frame.style.opacity = '0';
    document.body.appendChild(frame);

    const frameWindow = frame.contentWindow;
    const frameDocument = frame.contentDocument;
    if (!frameWindow || !frameDocument) {
      frame.remove();
      return;
    }

    frameDocument.open();
    frameDocument.write('<!DOCTYPE html><html><head><title></title></head><body></body></html>');
    frameDocument.close();

    frameDocument.title = topic?.name ?? worksheet.topic;
    frameDocument.body.style.fontFamily = 'Arial, sans-serif';
    frameDocument.body.style.padding = '24px';

    const heading = frameDocument.createElement('h1');
    heading.textContent = topic?.name ?? worksheet.topic;
    frameDocument.body.appendChild(heading);

    const subheading = frameDocument.createElement('p');
    subheading.textContent = topic?.groupLabel ?? '';
    frameDocument.body.appendChild(subheading);

    const difficulty = frameDocument.createElement('p');
    difficulty.textContent = `Difficulty: ${worksheet.difficulty}`;
    frameDocument.body.appendChild(difficulty);

    const list = frameDocument.createElement('ol');
    for (const [index, question] of worksheet.questions.entries()) {
      const item = frameDocument.createElement('li');
      item.style.marginBottom = '12px';

      const prompt = frameDocument.createElement('div');
      prompt.textContent = `${index + 1}. ${question.prompt}`;
      item.appendChild(prompt);

      const answer = frameDocument.createElement('div');
      answer.style.marginTop = '4px';
      answer.style.color = '#4b5563';
      answer.style.fontSize = '12px';
      answer.textContent = `Answer: ${question.answer}`;
      item.appendChild(answer);

      list.appendChild(item);
    }

    frameDocument.body.appendChild(list);
    frameWindow.focus();
    frameWindow.print();
    window.setTimeout(() => frame.remove(), 1000);
  }

  exportAiWorksheet(): void {
    const worksheet = this.aiWorksheet();
    if (!worksheet || typeof document === 'undefined' || typeof URL === 'undefined') {
      return;
    }

    const topic = this.selectedTopic();
    const exportText = [
      `${this.sanitizeTextLine(topic?.name ?? worksheet.topic)} (${this.sanitizeTextLine(topic?.groupLabel ?? '')})`,
      `Difficulty: ${worksheet.difficulty}`,
      `Generated: ${this.sanitizeTextLine(worksheet.generatedAt)}`,
      '',
      ...worksheet.questions.flatMap((question, index) => [
        `${index + 1}. ${this.sanitizeTextLine(question.prompt)}`,
        `Answer: ${this.sanitizeTextLine(question.answer)}`,
        '',
      ]),
    ].join('\n');

    const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = `${this.sanitizeFilename(topic?.id ?? worksheet.topic)}.txt`;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  }

  private refreshStudentInsights(result?: WorksheetResult): void {
    this.intelligenceLoading.set(true);
    this.intelligenceError.set('');

    forkJoin({
      profile: this.studentIntelligenceService.getStudentProfile(this.studentId()),
      analytics: this.studentIntelligenceService.getStudentAnalytics(this.studentId()),
    }).subscribe({
      next: ({ profile, analytics }) => {
        this.studentProfile.set(profile);
        this.studentAnalytics.set(analytics);

        if (!result) {
          this.recommendation.set(null);
          this.intelligenceLoading.set(false);
          return;
        }

        this.studentIntelligenceService
          .getAdaptiveRecommendation({
            studentId: this.studentId(),
            currentLevel: this.currentLevel(),
            recentAccuracy: result.accuracy,
            operationAccuracy: this.mapOperationAccuracy(result),
            confidence: this.normalizeConfidence(profile.confidenceLevel),
            averageSecondsPerQuestion:
              result.totalQuestions > 0
                ? this.roundToTwoDecimals(result.totalDurationSeconds / result.totalQuestions)
                : undefined,
            diagnosticAccuracy: profile.learningPathLevel * 2,
            latestGameScore: analytics.gameAnalytics?.averageScore ?? 0,
          })
          .subscribe({
            next: (recommendation) => {
              this.recommendation.set(this.normalizeRecommendationForLogic(recommendation));
              this.intelligenceLoading.set(false);
            },
            error: () => {
              this.intelligenceError.set('Adaptive recommendation is temporarily unavailable.');
              this.intelligenceLoading.set(false);
            },
          });
      },
      error: () => {
        this.intelligenceError.set('Unable to load student profile and analytics.');
        this.intelligenceLoading.set(false);
      },
    });
  }

  private loadMasteryState(): void {
    this.masteryEngine.fetchMasteryState(this.studentId()).subscribe({
      next: (state) => {
        this.weakSkills.set(state.weakSkills);
        this.recommendedSkill.set(state.recommendedNextSkill);
        if (!this.selectedTopicId() && state.recommendedNextSkill?.skillId) {
          this.selectedTopicId.set(state.recommendedNextSkill.skillId);
        }
        this.masteryReady.set(true);
      },
      error: () => {
        this.weakSkills.set([]);
        this.recommendedSkill.set(null);
        this.masteryReady.set(true);
      },
    });
  }

  private trackQuestionMastery(questionId: string, submittedValue: number | null): void {
    if (submittedValue === null) return;
    if (this.trackedQuestionSubmissions.has(questionId)) return;
    this.trackedQuestionSubmissions.add(questionId);
    const worksheet = this.worksheet();
    if (!worksheet) return;
    const question = worksheet.questions.find((entry) => entry.id === questionId);
    if (!question) return;
    const skillId = this.selectedTopicId() || question.operation;
    this.masteryEngine
      .updateMastery({
        studentId: this.studentId(),
        skillId,
        skillName: this.selectedTopic()?.name,
        isCorrect: submittedValue === question.answer,
      })
      .subscribe({
        next: (state) => {
          this.weakSkills.set(state.weakSkills);
          this.recommendedSkill.set(state.recommendedNextSkill);
        },
      });
  }

  private normalizeConfidence(confidence?: 'low' | 'medium' | 'high'): number {
    if (confidence === 'high') {
      return 85;
    }
    if (confidence === 'low') {
      return 35;
    }
    return 60;
  }

  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private mapOperationAccuracy(result: WorksheetResult): Partial<Record<MathOperation, number>> {
    const stats = result.questionResults.reduce<
      Partial<Record<MathOperation, { correct: number; attempted: number }>>
    >((accumulator, questionResult) => {
      if (questionResult.submittedAnswer === null) {
        return accumulator;
      }

      const operation = (questionResult as any).operation as MathOperation;
      const current = accumulator[operation] ?? { correct: 0, attempted: 0 };

      current.attempted += 1;
      if (questionResult.isCorrect) {
        current.correct += 1;
      }
      accumulator[operation] = current;

      return accumulator;
    }, {});

    return Object.entries(stats).reduce<Partial<Record<MathOperation, number>>>(
      (accumulator, [operation, current]) => {
        if (!current || current.attempted === 0) {
          return accumulator;
        }

        accumulator[operation as MathOperation] = Math.round(
          (current.correct / current.attempted) * 100,
        );
        return accumulator;
      },
      {},
    );
  }

  private loadTopicTaxonomy(): void {
    this.topicsLoading.set(true);
    this.topicService.getTaxonomy().subscribe({
      next: (taxonomy) => {
        const supportedTopics = taxonomy.topics
          .filter((topic): topic is PracticeTopicDefinition => topic.supportsAiWorksheet)
          .sort((left, right) => left.displayOrder - right.displayOrder);
        this.topics.set(supportedTopics);
        if (!supportedTopics.some((topic) => topic.id === this.selectedTopicId())) {
          this.selectTopic(supportedTopics[0]?.id ?? '');
        }
        this.topicsLoading.set(false);
      },
      error: () => {
        this.topicsLoading.set(false);
      },
    });

    this.topicService.getPersonalizedPath(this.studentId()).subscribe({
      next: (response) => {
        this.personalizedPath.set(
          response.personalizedPath
            .map((topic) => findPracticeTopicById(topic.id))
            .filter((topic): topic is PracticeTopicDefinition => !!topic),
        );
      },
      error: () => {
        this.personalizedPath.set([]);
      },
    });
  }

  private getNormalizedRecommendedLevel(
    recommendation: WorksheetRecommendation | null,
  ): LearningLevel | null {
    if (!recommendation) {
      return null;
    }
    return (
      normalizeLearningLevelIdentifier(recommendation.recommendedLevelRaw) ??
      normalizeLearningLevelIdentifier(recommendation.recommendedLevel)
    );
  }

  private normalizeRecommendationForLogic(
    recommendation: WorksheetRecommendation,
  ): WorksheetRecommendation {
    const normalizedLevel =
      normalizeLearningLevelIdentifier(recommendation.recommendedLevelRaw) ??
      normalizeLearningLevelIdentifier(recommendation.recommendedLevel);

    const domainIdRaw = this.normalizeRawIdentifier(
      recommendation.domainIdRaw,
      recommendation.domainId,
    );
    const skillIdRaw = this.normalizeRawIdentifier(
      recommendation.skillIdRaw,
      recommendation.skillId,
    );
    const worksheetIdRaw = this.normalizeRawIdentifier(
      recommendation.worksheetIdRaw,
      recommendation.worksheetId,
    );

    return {
      ...recommendation,
      recommendedLevelRaw: normalizedLevel ?? recommendation.recommendedLevelRaw,
      recommendedLevelDisplay:
        recommendation.recommendedLevelDisplay?.trim() ??
        (normalizedLevel
          ? this.levelDisplayLabel(normalizedLevel)
          : recommendation.recommendedLevel),
      domainIdRaw,
      domainId: domainIdRaw ?? recommendation.domainId,
      domainDisplayLabel:
        recommendation.domainDisplayLabel?.trim() ?? recommendation.domainDisplayLabel,
      skillIdRaw,
      skillId: skillIdRaw ?? recommendation.skillId,
      skillDisplayLabel:
        recommendation.skillDisplayLabel?.trim() ?? recommendation.skillDisplayLabel,
      worksheetIdRaw,
      worksheetId: worksheetIdRaw ?? recommendation.worksheetId,
      worksheetDisplayLabel:
        recommendation.worksheetDisplayLabel?.trim() ?? recommendation.worksheetDisplayLabel,
    };
  }

  private normalizeRawIdentifier(raw?: string, fallback?: string): string | undefined {
    const normalizedRaw = this.sanitizeIdentifier(raw);
    if (normalizedRaw) {
      return normalizedRaw;
    }
    return this.sanitizeIdentifier(fallback);
  }

  private sanitizeIdentifier(value?: string): string | undefined {
    if (!value) {
      return undefined;
    }
    const normalized = value.trim().normalize('NFC');
    if (!normalized) {
      return undefined;
    }
    // Logic identifiers must stay raw and language-agnostic: alphanumeric + hyphen/underscore only.
    return VALID_IDENTIFIER_PATTERN.test(normalized) ? normalized : undefined;
  }

  private levelDisplayLabel(level: LearningLevel): string {
    const keyByLevel: Record<LearningLevel, string> = {
      Beginner: 'worksheet.beginner',
      Intermediate: 'worksheet.intermediate',
      Advanced: 'worksheet.advanced',
    };
    const key = keyByLevel[level];
    return this.t.translate(key);
  }

  private groupTopics(track: PracticeTopicGroup['track']): PracticeTopicGroup[] {
    const grouped = new Map<string, PracticeTopicGroup>();
    for (const topic of this.topics()) {
      if (topic.track !== track) {
        continue;
      }
      if (!grouped.has(topic.groupKey)) {
        grouped.set(topic.groupKey, {
          id: `${track}-${topic.groupKey}`,
          label: topic.groupLabel,
          track,
          topics: [],
        });
      }
      grouped.get(topic.groupKey)?.topics.push(topic);
    }
    return Array.from(grouped.values());
  }

  private sanitizeTextLine(value: string): string {
    return value
      .replace(/[\u0000-\u001f\u007f]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private sanitizeFilename(value: string): string {
    const sanitized = value
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '');
    return sanitized || 'worksheet';
  }
}
