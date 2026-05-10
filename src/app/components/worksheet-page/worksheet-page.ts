import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { PracticeService, WorksheetResult, type Worksheet } from '../../services/practice.service';
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

  constructor(
    private readonly route: ActivatedRoute,
    private readonly practiceService: PracticeService,
    private readonly studentIntelligenceService: StudentIntelligenceService,
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

  goToAdaptive(): void {
    const nextLevel = this.recommendedLevel();
    if (!nextLevel) return;

    this.currentLevel.set(nextLevel);

    // Force reload even if navigating to the same route
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate(['/worksheet', nextLevel]);
    });
  }


  applyRecommendation(): void {
    this.goToAdaptive();
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
      // const operation = (questionResult as any).operation as MathOperation;
      // const current = accumulator[operation] ?? { correct: 0, attempted: 0 };

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
}
