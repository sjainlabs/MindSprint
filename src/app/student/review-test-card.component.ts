import { Component, EventEmitter, Output, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AdhocTestService } from '../services/adhoc-test.service';
import {
  LearningPlanError,
  LearningPlanService,
  ReviewSchedule,
  STATUS_LABELS,
  WEEKDAYS,
  shortDate,
} from '../services/learning-plan.service';

/** The 3-weekly review test: when it is, what it covers, what to revise, and starting or resuming it. */
@Component({
  selector: 'app-review-test-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './review-test-card.component.html',
  styleUrls: ['../tests/test-pages.css', './plan-shared.css', './review-test-card.component.css'],
})
export class ReviewTestCardComponent {
  private readonly api = inject(LearningPlanService);
  private readonly adhoc = inject(AdhocTestService);
  private readonly router = inject(Router);

  readonly schedule = input.required<ReviewSchedule>();
  readonly studentId = input.required<string>();
  /** Shows the parent reminder and the weekday setting. */
  readonly parentMode = input(false);
  /** False when a parent is looking at another child: no starting tests for them. */
  readonly canAct = input(true);
  /** Ask the dashboard for a grade (GRADE_REQUIRED); it calls start() again once picked. */
  @Output() gradeRequired = new EventEmitter<void>();
  /** The weekday changed; the dashboard reloads the plan for the new dates. */
  @Output() changed = new EventEmitter<void>();

  readonly starting = signal(false);
  readonly savingDay = signal<number | null>(null);
  readonly error = signal('');

  readonly current = computed(() => this.schedule().current);
  readonly weekdays = WEEKDAYS;
  readonly statusLabels = STATUS_LABELS;
  readonly shortDate = shortDate;
  readonly calendarUrl = computed(() => this.api.calendarUrl(this.studentId()));

  readonly countdown = computed(() => {
    const d = this.current().daysUntil;
    if (d < 0) return `${-d} day${d === -1 ? '' : 's'} overdue`;
    if (d === 0) return 'Today';
    if (d === 1) return 'Tomorrow';
    return `In ${d} days`;
  });

  readonly statusText = computed(() => {
    const c = this.current();
    if (c.status === 'open') return 'Open now';
    if (c.status === 'overdue') return `Open until ${shortDate(c.closesOn)}`;
    return `Opens ${shortDate(c.opensOn)}`;
  });

  /** The test was started (on the server) and its questions are still on this device. */
  readonly canResume = computed(() => {
    const id = this.current().inProgressTestId;
    return !!id && this.adhoc.loadActive(this.studentId(), 'review')?.test.testId === id;
  });

  async start(): Promise<void> {
    if (this.starting()) return;
    const studentId = this.studentId();
    if (this.canResume()) {
      await this.router.navigate(['/tests/review/take']);
      return;
    }
    this.starting.set(true);
    this.error.set('');
    try {
      // Starting again replaces an unfinished test on the server, so a resume from another device gets fresh questions.
      const test = await this.api.generateReview(studentId);
      this.adhoc.saveActive(
        {
          studentId,
          test,
          selection: { topicIds: test.topics.map((t) => t.topicId), questionCount: test.questionCount },
          answers: {},
          startedAt: new Date().toISOString(),
          currentIndex: 0,
          review: { cycle: test.cycle, dueDate: test.dueDate },
        },
        'review',
      );
      await this.router.navigate(['/tests/review/take']);
    } catch (err) {
      const e = err as LearningPlanError;
      if (e.code === 'GRADE_REQUIRED') this.gradeRequired.emit();
      else this.error.set(e.message);
    } finally {
      this.starting.set(false);
    }
  }

  async setWeekday(day: number): Promise<void> {
    if (this.savingDay() !== null || day === this.schedule().weekday) return;
    this.savingDay.set(day);
    this.error.set('');
    try {
      await this.api.saveWeekday(this.studentId(), day);
      this.changed.emit();
    } catch (err) {
      this.error.set((err as LearningPlanError).message);
    } finally {
      this.savingDay.set(null);
    }
  }
}
