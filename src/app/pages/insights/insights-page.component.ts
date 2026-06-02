import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { LanguageToggleComponent } from '../../components/language-toggle/language-toggle';
import { AuthService } from '../../services/auth.service';
import { InsightsService } from '../../services/insights.service';
import type {
  FullInsightsResponse,
  ParentSummary,
  TopicInsight,
} from '../../services/insights.types';

interface StatCard {
  label: string;
  value: string;
}

interface MasteryEntry {
  label: string;
  value: number;
}

interface StudentSummary {
  name: string;
  studentId: string;
  avatar: string;
  grade: string;
  age: string;
  xp: string;
  streak: string;
  level: string;
}

@Component({
  selector: 'app-insights-page',
  standalone: true,
  imports: [CommonModule, RouterLink, LanguageToggleComponent],
  templateUrl: './insights-page.component.html',
  styleUrl: './insights-page.component.css',
})
export class InsightsPageComponent implements OnInit {
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly studentId = signal('');
  readonly activeTopicId = signal('');
  readonly fullInsights = signal<FullInsightsResponse | null>(null);
  readonly topicInsight = signal<TopicInsight | null>(null);
  readonly recommendation = signal<Record<string, unknown> | null>(null);

  readonly summary = computed<StudentSummary>(() => {
    const full = this.fullInsights();
    const fullRecord = this.recordValue(full);
    const student = this.extractStudentContainer(full);

    return {
      name: this.stringValue(student?.['name']) || this.stringValue(full?.studentName) || 'Student',
      studentId:
        this.stringValue(student?.['studentId']) ||
        this.stringValue(full?.studentId) ||
        this.stringValue(fullRecord?.['studentId']) ||
        this.studentId(),
      avatar: this.stringValue(student?.['avatar']) || this.stringValue(full?.avatar) || '🧠',
      grade: this.stringValue(student?.['grade']) || this.stringValue(full?.grade) || '—',
      age: this.stringValue(student?.['age']) || this.stringValue(full?.age) || '—',
      xp: this.stringValue(student?.['xp']) || this.stringValue(full?.xp) || '0',
      streak: this.stringValue(student?.['streak']) || this.stringValue(full?.streak) || '0',
      level: this.stringValue(student?.['level']) || this.stringValue(full?.level) || '—',
    };
  });

  readonly operationMastery = computed<MasteryEntry[]>(() => {
    const full = this.fullInsights();
    const fullRecord = this.recordValue(full);
    const containers = [
      this.recordValue(fullRecord?.['operationMastery']),
      this.recordValue(fullRecord?.['masteryByOperation']),
      this.recordValue(this.extractStudentContainer(full)?.['operationMastery']),
      this.recordValue(this.extractStudentContainer(full)?.['masteryByOperation']),
    ].filter((value): value is Record<string, unknown> => !!value);

    for (const container of containers) {
      const entries = Object.entries(container)
        .map(([label, value]) => ({ label: this.titlecase(label), value: this.numberValue(value) }))
        .filter((entry) => entry.value !== null)
        .map((entry) => ({ label: entry.label, value: entry.value ?? 0 }));

      if (entries.length > 0) {
        return entries;
      }
    }

    const detail = this.topicInsight();
    if (!detail) {
      return [];
    }

    return [
      { label: 'Mastery', value: detail.mastery },
      { label: 'Accuracy', value: detail.accuracy },
    ];
  });

  readonly topicMastery = computed<MasteryEntry[]>(() =>
    (this.fullInsights()?.topics ?? []).map((topic) => ({
      label: topic.name || this.titlecase(topic.topicId),
      value: topic.mastery,
    })),
  );

  readonly badges = computed<string[]>(() => {
    const full = this.fullInsights();
    const fullRecord = this.recordValue(full);
    const student = this.extractStudentContainer(full);
    const rawBadges =
      this.arrayValue(fullRecord?.['badges']) ??
      this.arrayValue(student?.['badges']) ??
      this.arrayValue(fullRecord?.['achievements']) ??
      this.arrayValue(student?.['achievements']) ??
      [];

    return rawBadges
      .map((value) => this.stringValue(value))
      .filter((value): value is string => !!value);
  });

  readonly analyticsCards = computed<StatCard[]>(() => {
    const full = this.fullInsights();
    const fullRecord = this.recordValue(full);
    const detail = this.topicInsight();
    const analytics =
      this.recordValue(fullRecord?.['analytics']) ??
      this.recordValue(this.extractStudentContainer(full)?.['analytics']);

    const totalWorksheets =
      this.numberValue(analytics?.['totalWorksheets']) ??
      this.numberValue(fullRecord?.['totalWorksheets']) ??
      this.sumAttempts(this.fullInsights()?.topics ?? []);

    const avgTime =
      this.numberValue(analytics?.['averageTimePerWorksheet']) ??
      this.numberValue(analytics?.['avgTimeSeconds']) ??
      this.numberValue(detail?.avgTimeSeconds) ??
      0;

    const recentAccuracy =
      this.numberValue(analytics?.['recentAccuracy']) ?? this.numberValue(detail?.accuracy) ?? 0;

    return [
      { label: 'Worksheets', value: `${totalWorksheets}` },
      { label: 'Avg time', value: `${avgTime}s` },
      { label: 'Recent accuracy', value: `${recentAccuracy}%` },
    ];
  });

  readonly recommendedNextSteps = computed<string[]>(() => {
    const full = this.fullInsights();
    const detail = this.topicInsight();
    const parentSummary = this.parentSummary();
    const detailRecord = this.recordValue(detail);

    const fromSummary = parentSummary?.recommendedActions ?? [];
    if (fromSummary.length > 0) {
      return fromSummary;
    }

    const detailSteps = this.arrayValue(detailRecord?.['recommendedNextSteps'])
      ?.map((value) => this.stringValue(value))
      .filter((value): value is string => !!value);
    if (detailSteps && detailSteps.length > 0) {
      return detailSteps;
    }

    return (full?.recommendations ?? [])
      .flatMap((item) => [item.title, item.description, ...(item.reason ?? [])])
      .map((value) => this.stringValue(value))
      .filter((value): value is string => !!value)
      .slice(0, 6);
  });

  readonly adaptiveRecommendation = computed(() => {
    const raw = this.recommendation();
    const wrapped = this.recordValue(raw?.['recommendation']);
    return wrapped ?? raw;
  });

  readonly subtopicBreakdown = computed(() => {
    const detail = this.topicInsight();
    const raw = detail?.subtopicBreakdown ?? detail?.subtopics ?? [];
    return raw.map((item) => ({
      label: this.stringValue(item.name) || this.stringValue(item.subtopicId) || 'Subtopic',
      mastery: this.numberValue(item.mastery) ?? 0,
      accuracy: this.numberValue(item.accuracy) ?? 0,
    }));
  });

  readonly commonErrors = computed(() => this.topicInsight()?.commonErrors ?? []);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly insightsService: InsightsService,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const studentIdFromParams = params.get('studentId')?.trim() ?? '';
      const studentIdFromQuery = this.route.snapshot.queryParamMap.get('studentId')?.trim() ?? '';
      const activeStudentId =
        studentIdFromParams || studentIdFromQuery || this.authService.getStoredStudentId()?.trim() || '';
      if (!activeStudentId) {
        this.errorMessage.set('Student not found. Select a child from the parent dashboard first.');
        this.loading.set(false);
        return;
      }

      const topicId = params.get('topicId')?.trim() || '';
      this.studentId.set(activeStudentId);
      this.authService.setActiveStudentId(activeStudentId);
      this.activeTopicId.set(topicId);
      this.loadInsights();
    });
  }

  loadInsights(topicId = this.activeTopicId()): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.insightsService.getFullInsights(this.studentId(), topicId || undefined).subscribe({
      next: (full) => {
        this.fullInsights.set(full);
        const resolvedTopicId = topicId || full.topicId || full.topics[0]?.topicId || 'addition';
        this.activeTopicId.set(resolvedTopicId);
        this.loadDetailAndRecommendation(resolvedTopicId);
      },
      error: () => {
        this.errorMessage.set('Unable to load insights.');
        this.loading.set(false);
      },
    });
  }

  selectTopic(topicId: string): void {
    if (!topicId || topicId === this.activeTopicId()) {
      return;
    }

    this.activeTopicId.set(topicId);
    void this.router.navigate(['/insights', this.studentId(), topicId]);
  }

  startRecommendedPractice(): void {
    const recommendation = this.adaptiveRecommendation();
    const level = this.stringValue(recommendation?.['recommendedLevel']) || 'Beginner';
    const topicId =
      this.stringValue(recommendation?.['recommendedTopic']) ||
      this.stringValue(recommendation?.['recommendedTopicId']) ||
      this.activeTopicId();

    void this.router.navigate(['/worksheet', level], {
      queryParams: {
        studentId: this.studentId(),
        ...(topicId ? { topicId } : {}),
      },
    });
  }

  progressWidth(value: number): number {
    return Math.max(0, Math.min(100, value));
  }

  isArray(value: unknown): value is unknown[] {
    return Array.isArray(value);
  }

  trackByLabel(_: number, item: { label: string }): string {
    return item.label;
  }

  private loadDetailAndRecommendation(topicId: string): void {
    forkJoin({
      detail: this.insightsService.getTopicInsight(this.studentId(), topicId).pipe(catchError(() => of(null))),
      recommendation: this.insightsService
        .getRecommendation(this.studentId(), topicId)
        .pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ detail, recommendation }) => {
        this.topicInsight.set(detail);
        this.recommendation.set(this.recordValue(recommendation));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  private extractStudentContainer(full: FullInsightsResponse | null): Record<string, unknown> | null {
    const fullRecord = this.recordValue(full);
    return this.recordValue(fullRecord?.['student']) ?? this.recordValue(fullRecord?.['profile']);
  }

  private parentSummary(): ParentSummary | null {
    const full = this.fullInsights();
    return full?.parentSummary ?? this.topicInsight()?.parentSummary ?? null;
  }

  private sumAttempts(topics: TopicInsight[]): number {
    return topics.reduce((sum, topic) => sum + (topic.attempts ?? 0), 0);
  }

  private titlecase(value: string): string {
    return value
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (match) => match.toUpperCase());
  }

  private numberValue(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private stringValue(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return `${value}`;
    }
    return '';
  }

  private recordValue(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  }

  private arrayValue(value: unknown): unknown[] | null {
    return Array.isArray(value) ? value : null;
  }
}

