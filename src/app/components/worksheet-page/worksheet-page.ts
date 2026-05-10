import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { PracticeService, WorksheetResult, type Worksheet } from '../../services/practice.service';
import { AiWorksheetService, type AiWorksheet } from '../../services/ai-worksheet.service';
import { TopicService, type TopicModel } from '../../services/topic.service';
import {
  DEFAULT_STUDENT_ID,
  StudentIntelligenceService,
  type MathOperation,
  type StudentAnalytics,
  type StudentProfile,
  type WorksheetRecommendation,
} from '../../services/student-intelligence.service';

type LearningLevel = 'Beginner' | 'Intermediate' | 'Advanced';

@Component({
  selector: 'app-worksheet-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './worksheet-page.html',
  styleUrl: './worksheet-page.css',
})
export class WorksheetPageComponent implements OnInit {
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

  topics = signal<TopicModel[]>([]);
  topicsLoading = signal(false);
  personalizedPath = signal<TopicModel[]>([]);
  selectedTopicId = signal('algebra-i');
  aiDifficulty = signal(75);
  aiWorksheet = signal<AiWorksheet | null>(null);
  aiLoading = signal(false);
  aiError = signal('');

  constructor(
    private readonly route: ActivatedRoute,
    private readonly practiceService: PracticeService,
    private readonly studentIntelligenceService: StudentIntelligenceService,
    private readonly topicService: TopicService,
    private readonly aiWorksheetService: AiWorksheetService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    const level = this.route.snapshot.paramMap.get('level') as LearningLevel | null;

    if (!level) {
      this.errorMessage.set('Invalid worksheet level.');
      this.loading.set(false);
      return;
    }

    this.currentLevel.set(level);
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
    this.worksheetStartedAt.set(new Date().toISOString());

    this.practiceService.getPractice(level).subscribe({
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

  attemptedCount = computed(() => Object.values(this.answers()).filter((value) => value !== null).length);

  masteryEntries = computed(() => {
    const profile = this.studentProfile();
    if (!profile) {
      return [] as Array<{ operation: MathOperation; mastery: number }>;
    }

    return (Object.entries(profile.masteryLevels) as Array<[MathOperation, number]>)
      .sort(([, leftMastery], [, rightMastery]) => rightMastery - leftMastery)
      .map(([operation, mastery]) => ({ operation, mastery }));
  });

  accuracyTrend = computed(() => this.studentAnalytics()?.accuracyOverTime.slice(-3).reverse() ?? []);
  recommendedLevel = computed(() => this.recommendation()?.recommendedLevel ?? null);
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
    const topic = this.selectedTopicId();
    if (!topic || this.aiLoading()) {
      return;
    }

    this.aiLoading.set(true);
    this.aiError.set('');
    this.aiWorksheet.set(null);

    this.aiWorksheetService
      .generateWorksheet({
        topic,
        difficulty: this.aiDifficulty(),
        questionTypes: [
          'numeric',
          'symbolic',
          'multi-step',
          'graph-interpretation',
          'word-problem',
          'proof-style',
          'function-analysis',
          'trig-identity',
        ],
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
              averageSecondsPerQuestion: result.totalQuestions > 0
                ? this.roundToTwoDecimals(result.totalDurationSeconds / result.totalQuestions)
                : undefined,
              diagnosticAccuracy: profile.learningPathLevel * 2,
              latestGameScore: analytics.gameAnalytics?.averageScore ?? 0,
            })
          .subscribe({
            next: (recommendation) => {
              this.recommendation.set(recommendation);
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

      const current = accumulator[questionResult.operation] ?? { correct: 0, attempted: 0 };
      current.attempted += 1;
      if (questionResult.isCorrect) {
        current.correct += 1;
      }
      accumulator[questionResult.operation] = current;
      return accumulator;
    }, {});

    return Object.entries(stats).reduce<Partial<Record<MathOperation, number>>>((accumulator, [operation, current]) => {
      if (!current || current.attempted === 0) {
        return accumulator;
      }

      accumulator[operation as MathOperation] = Math.round((current.correct / current.attempted) * 100);
      return accumulator;
    }, {});
  }

  private loadTopicTaxonomy(): void {
    this.topicsLoading.set(true);
    this.topicService.getTaxonomy().subscribe({
      next: (taxonomy) => {
        this.topics.set(taxonomy.topics);
        this.topicsLoading.set(false);
      },
      error: () => {
        this.topicsLoading.set(false);
      },
    });

    this.topicService.getPersonalizedPath(this.studentId()).subscribe({
      next: (response) => {
        this.personalizedPath.set(response.personalizedPath);
      },
      error: () => {
        this.personalizedPath.set([]);
      },
    });
  }
}
