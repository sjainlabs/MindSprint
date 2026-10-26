import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';
import {
  DailyChallengeError,
  DailyChallengeService,
  DailyProgress,
  DailyTopicStatus,
  ProgressGrade,
  ProgressTopic,
  gradeName,
  percent,
} from '../services/daily-challenge.service';

const STATUS_INFO: Record<DailyTopicStatus, { label: string; icon: string }> = {
  new: { label: 'Not started', icon: '○' },
  learning: { label: 'Learning', icon: '✏️' },
  'needs-work': { label: 'Needs work', icon: '⚠️' },
  mastered: { label: 'Mastered', icon: '🏅' },
  excelled: { label: 'Excelled', icon: '🌟' },
};

/** Grade-by-grade map of the Daily Challenge, for the child and their parents. */
@Component({
  selector: 'app-daily-progress-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './daily-progress-page.component.html',
  styleUrls: ['../tests/test-pages.css', './daily-progress-page.component.css'],
})
export class DailyProgressPageComponent implements OnInit {
  private readonly api = inject(DailyChallengeService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly gradeName = gradeName;
  readonly statusOrder: DailyTopicStatus[] = ['new', 'learning', 'needs-work', 'mastered', 'excelled'];
  readonly statusInfo = STATUS_INFO;

  readonly loading = signal(true);
  readonly error = signal('');
  readonly progress = signal<DailyProgress | null>(null);
  readonly open = signal<Record<number, boolean>>({});

  readonly grades = computed(() => [...(this.progress()?.grades ?? [])].sort((a, b) => a.grade - b.grade));

  readonly ruleText = computed(() => {
    const p = this.progress();
    if (!p) return '';
    if (p.lowestGradeWithGaps === null) {
      return `There are no weak topics right now, so you can go all the way to ${gradeName(p.highestReachableGrade)}.`;
    }
    return `Your lowest grade with a topic to work on is ${gradeName(p.lowestGradeWithGaps)}, so right now you can reach up to ${gradeName(p.highestReachableGrade)}.`;
  });

  private studentId = '';

  async ngOnInit(): Promise<void> {
    const fromQuery = this.route.snapshot.queryParamMap.get('studentId');
    this.studentId = fromQuery ?? this.auth.getStoredStudentId() ?? '';
    await this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const p = await this.api.progress(this.studentId);
      this.progress.set(p);
      // Open the grades being worked on; mastered ones start folded.
      this.open.set(Object.fromEntries(p.grades.map((g) => [g.grade, g.state === 'in-progress'])));
    } catch (err) {
      this.error.set((err as DailyChallengeError).message);
    } finally {
      this.loading.set(false);
    }
  }

  toggle(grade: number): void {
    this.open.update((o) => ({ ...o, [grade]: !o[grade] }));
  }

  doneCount(g: ProgressGrade): number {
    return g.mastered + g.excelled;
  }

  donePercent(g: ProgressGrade): number {
    return g.totalTopics ? Math.round((this.doneCount(g) / g.totalTopics) * 100) : 0;
  }

  stateIcon(g: ProgressGrade): string {
    return g.state === 'mastered' ? '🏆' : g.state === 'locked' ? '🔒' : '▶';
  }

  stateLabel(g: ProgressGrade): string {
    return g.state === 'mastered' ? 'Mastered' : g.state === 'locked' ? 'Locked' : 'In progress';
  }

  isCurrent(t: ProgressTopic): boolean {
    return t.topicId === this.progress()?.currentTopicId;
  }

  /** "Needs work: speed" / "Needs work: accuracy", so parents know what to help with. */
  tileStatus(t: ProgressTopic): string {
    const info = STATUS_INFO[t.status];
    const reason = t.status === 'needs-work' && t.needsWorkReason ? `: ${t.needsWorkReason}` : '';
    return `${info.icon} ${info.label}${reason}`;
  }

  topicDetail(t: ProgressTopic): string {
    const bits: string[] = [];
    const acc = percent(t.recentAccuracy);
    if (t.attempts > 0 && acc !== null) bits.push(`${acc}% recently`);
    if (t.averageSeconds) bits.push(`${Math.round(t.averageSeconds)}s each`);
    return bits.join(' · ');
  }
}
