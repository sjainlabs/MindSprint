import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { GradePickerComponent } from '../components/grade-picker/grade-picker.component';
import { LearningPlanError, LearningPlanService, TopicStanding, gradeLabel } from '../services/learning-plan.service';
import { PlanTopicsListComponent } from './plan-topics-list.component';

/** Every topic with its standing, grouped by grade, with a status filter. */
@Component({
  selector: 'app-plan-topics-page',
  standalone: true,
  imports: [GradePickerComponent, PlanTopicsListComponent],
  template: `
    <main class="page">
      <div class="row-between">
        <h1>All topics</h1>
        @if (gradeFilter() !== null) {
          <button type="button" class="chip active" (click)="gradeFilter.set(null)" aria-label="Show every grade">
            Grade {{ gradeLabel(gradeFilter()!) }} ✕
          </button>
        }
      </div>

      @if (loading()) {
        <section class="card center" aria-busy="true"><div class="spinner"></div></section>
      } @else if (needGrade()) {
        <section class="card">
          <h2>Which grade?</h2>
          <app-grade-picker (picked)="pickGrade($event)" />
        </section>
      } @else if (error()) {
        <section class="card">
          <p class="notice error" role="alert">{{ error() }}</p>
          <button type="button" class="btn primary" (click)="load()">Try again</button>
        </section>
      } @else {
        <app-plan-topics-list [topics]="topics()" [(grade)]="gradeFilter" />
      }
    </main>
  `,
  styleUrls: ['../tests/test-pages.css', './plan-shared.css'],
})
export class PlanTopicsPageComponent implements OnInit {
  private readonly api = inject(LearningPlanService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly gradeLabel = gradeLabel;

  readonly loading = signal(true);
  readonly needGrade = signal(false);
  readonly error = signal('');
  readonly topics = signal<TopicStanding[]>([]);
  /** From a level-card ladder row (?grade=3). */
  readonly gradeFilter = signal<number | null>(null);

  private studentId = '';

  ngOnInit(): void {
    const query = this.route.snapshot.queryParamMap;
    this.studentId = query.get('studentId') ?? this.auth.getStoredStudentId() ?? '';
    const grade = query.get('grade');
    if (grade !== null && grade !== '' && !Number.isNaN(Number(grade))) this.gradeFilter.set(Number(grade));
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    this.needGrade.set(false);
    try {
      this.topics.set(await this.api.topics(this.studentId));
    } catch (err) {
      const e = err as LearningPlanError;
      if (e.code === 'GRADE_REQUIRED') this.needGrade.set(true);
      else this.error.set(e.message);
    } finally {
      this.loading.set(false);
    }
  }

  pickGrade(grade: string): void {
    this.api.setGrade(this.studentId, grade);
    this.load();
  }
}
