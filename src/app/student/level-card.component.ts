import { Component, OnChanges, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GradeSummary, LevelEstimate, gradeLabel } from '../services/learning-plan.service';

const GAP_CHIPS = 3;
const SECURE_TARGET = 80;
const LEVEL_KEY = 'mindsprint.plan.workingGrade';

const SEGMENTS: Array<{ key: keyof GradeSummary & string; label: string; cls: string }> = [
  { key: 'mastered', label: 'mastered', cls: 'mastered' },
  { key: 'strong', label: 'strong', cls: 'strong' },
  { key: 'learning', label: 'learning', cls: 'learning' },
  { key: 'needsWork', label: 'needs work', cls: 'needs-work' },
  { key: 'notStarted', label: 'not started', cls: 'not-started' },
];

/** Where the kid is: working grade, a ladder of nearby grades, and gaps from earlier grades. */
@Component({
  selector: 'app-level-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './level-card.component.html',
  styleUrls: ['../tests/test-pages.css', './plan-shared.css', './level-card.component.css'],
})
export class LevelCardComponent implements OnChanges {
  readonly level = input.required<LevelEstimate>();
  readonly studentId = input.required<string>();
  readonly parentMode = input(false);
  /** False when a parent views another child: links carry ?studentId= and there is no daily-challenge button. */
  readonly canAct = input(true);

  readonly gradeLabel = gradeLabel;
  readonly segments = SEGMENTS;
  readonly target = SECURE_TARGET;

  readonly showAllGaps = signal(false);
  /** "You've moved up to Grade X!" after a refresh that raised the working grade. */
  readonly levelUp = signal<number | null>(null);

  /** Highest grade first, so the ladder climbs upwards. */
  readonly ladder = computed(() => [...this.level().grades].sort((a, b) => b.grade - a.grade));
  readonly ahead = computed(() => this.level().workingGrade > this.level().profileGrade);
  readonly empty = computed(() => this.level().grades.every((g) => g.notStarted === g.totalTopics));
  readonly gaps = computed(() => (this.showAllGaps() ? this.level().gaps : this.level().gaps.slice(0, GAP_CHIPS)));
  readonly hiddenGaps = computed(() => Math.max(0, this.level().gaps.length - GAP_CHIPS));

  ngOnChanges(): void {
    this.checkLevelUp();
  }

  segmentWidth(g: GradeSummary, key: string): number {
    return g.totalTopics ? ((g[key as keyof GradeSummary] as number) / g.totalTopics) * 100 : 0;
  }

  barLabel(g: GradeSummary): string {
    const parts = SEGMENTS.map((s) => `${g[s.key as keyof GradeSummary]} ${s.label}`);
    return `Grade ${gradeLabel(g.grade)}: ${parts.join(', ')}. ${g.securePercent}% strong.`;
  }

  topicsQuery(grade?: number): Record<string, string | number> {
    return { ...(grade !== undefined ? { grade } : {}), ...(this.canAct() ? {} : { studentId: this.studentId() }) };
  }

  trendIcon(trend: string): string {
    return trend === 'slipping' ? '↓' : trend === 'improving' ? '↑' : '';
  }

  /** Compares with the working grade seen last time on this device; the first visit only records it. */
  private checkLevelUp(): void {
    const key = `${LEVEL_KEY}.${this.studentId()}`;
    const now = this.level().workingGrade;
    try {
      const before = window.localStorage.getItem(key);
      if (before !== null && now > Number(before)) {
        this.levelUp.set(now);
        setTimeout(() => this.levelUp.set(null), 4500);
      }
      window.localStorage.setItem(key, String(now));
    } catch {
      // No storage: no celebration, nothing else changes.
    }
  }
}
