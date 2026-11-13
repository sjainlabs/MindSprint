import { Component, ViewChild, computed, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { KIND_LABELS, LearningPlan, Recommendation, gradeBand } from '../services/learning-plan.service';
import { LevelCardComponent } from './level-card.component';
import { ReviewTestCardComponent } from './review-test-card.component';

/**
 * The learning plan's cards (level, up next, review test, progress), with no loading of its own.
 * The student dashboard shows it for the kid and for parents; the guest analyst page shows it with
 * readOnly, which removes every action and every link out of the page.
 */
@Component({
  selector: 'app-plan-view',
  standalone: true,
  imports: [RouterLink, NgTemplateOutlet, LevelCardComponent, ReviewTestCardComponent],
  templateUrl: './plan-view.component.html',
  styleUrls: ['../tests/test-pages.css', './plan-shared.css', './plan-view.component.css'],
})
export class PlanViewComponent {
  readonly plan = input.required<LearningPlan>();
  readonly studentId = input.required<string>();
  readonly parentMode = input(false);
  /** The child signed in on this device: sheets and tests can be started. */
  readonly canAct = input(true);
  readonly readOnly = input(false);
  /** 'next' or a recommendation's topicId while it opens. */
  readonly opening = input<string | null>(null);

  readonly startNext = output<void>();
  readonly startRecommendation = output<Recommendation>();
  /** Starting the review test needs a grade first. */
  readonly gradeRequired = output<void>();
  /** The review weekday changed; reload the plan. */
  readonly changed = output<void>();
  /** Read-only: a level-card rung was picked. */
  readonly gradeSelected = output<number>();

  @ViewChild(ReviewTestCardComponent) reviewCard?: ReviewTestCardComponent;

  readonly kindLabels = KIND_LABELS;
  readonly gradeBand = gradeBand;
  readonly canStart = computed(() => this.canAct() && !this.readOnly());

  readonly maxStrand = computed(() => Math.max(100, ...this.plan().strands.map((s) => s.averageScore)));
  readonly activityLine = computed(() => {
    const a = this.plan().activity;
    if (!a) return null;
    const week = a.last7Days;
    const sheets = `${week.sheets} sheet${week.sheets === 1 ? '' : 's'}`;
    if (week.averageAccuracy === null) return { text: `This week: ${sheets}`, change: null };
    const c = a.accuracyChange;
    const change =
      c === null
        ? null
        : c === 0
          ? { dir: 'same', label: '→ same as last week', aria: 'same as last week' }
          : { dir: c > 0 ? 'up' : 'down', label: `${c > 0 ? '↑' : '↓'} ${Math.abs(c)} pts`, aria: `${c > 0 ? 'up' : 'down'} ${Math.abs(c)} points from last week` };
    return { text: `This week: ${sheets}, ${week.averageAccuracy}%`, change };
  });

  kindLabel(r: Recommendation): string {
    return this.kindLabels[r.kind];
  }

  nextButtonText(type: string): string {
    if (type === 'topic-test') return '🏁 Start the topic test';
    if (type === 'study-guide-then-practice') return '📘 Read the guide, then practise';
    return '▶ Start';
  }

  topicsLink(): Record<string, string> {
    return this.canAct() ? {} : { studentId: this.studentId() };
  }
}
