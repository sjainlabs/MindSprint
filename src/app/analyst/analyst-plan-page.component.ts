import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { LearningPlan, TopicStanding, gradeLabel } from '../services/learning-plan.service';
import { PlanViewComponent } from '../student/plan-view.component';
import { PlanTopicsListComponent } from '../student/plan-topics-list.component';
import { AnalystApiService, INVALID_ANALYST_CODE, analystErrorMessage } from './analyst-api.service';
import { AnalystSessionService } from './analyst-session.service';

type Phase = 'loading' | 'ready' | 'error';

/** The child's learning plan and every topic's standing, read-only. */
@Component({
  selector: 'app-analyst-plan-page',
  standalone: true,
  imports: [PlanViewComponent, PlanTopicsListComponent],
  template: `
    <main class="page">
      @switch (phase()) {
        @case ('loading') {
          <section class="card center" aria-busy="true">
            <div class="spinner"></div>
            <p class="muted">Loading the learning plan…</p>
          </section>
        }

        @case ('error') {
          <section class="card">
            <h2>We couldn't load the plan</h2>
            <p class="notice error" role="alert">{{ error() }}</p>
            <button type="button" class="btn primary" (click)="load()">Try again</button>
          </section>
        }

        @case ('ready') {
          @if (plan(); as p) {
            <app-plan-view
              [plan]="p"
              [studentId]="studentId()"
              [parentMode]="true"
              [canAct]="false"
              [readOnly]="true"
              (gradeSelected)="showGrade($event)"
            />

            <div #topicsSection class="row-between topics-head" tabindex="-1">
              <h2>All topics</h2>
              @if (gradeFilter() !== null) {
                <button type="button" class="chip active" (click)="gradeFilter.set(null)" aria-label="Show every grade">
                  Grade {{ gradeLabel(gradeFilter()!) }} ✕
                </button>
              }
            </div>
            @if (topicsError()) {
              <section class="card">
                <p class="notice error" role="alert">{{ topicsError() }}</p>
                <button type="button" class="btn primary" (click)="loadTopics()">Try again</button>
              </section>
            } @else if (topics(); as list) {
              <app-plan-topics-list [topics]="list" [(grade)]="gradeFilter" [readOnly]="true" />
            } @else {
              <section class="card center" aria-busy="true"><div class="spinner"></div></section>
            }

            <p class="muted small updated">Plan generated {{ generated() }}</p>
          }
        }
      }
    </main>
  `,
  styleUrls: ['../tests/test-pages.css', '../student/plan-shared.css'],
  styles: [
    `
      .page { max-width: 760px; width: 100%; box-sizing: border-box; padding: 6px 0 40px; background: none; }
      .topics-head { margin-top: 8px; outline: none; }
      .updated { text-align: center; }
    `,
  ],
})
export class AnalystPlanPageComponent implements OnInit {
  private readonly api = inject(AnalystApiService);
  private readonly sessions = inject(AnalystSessionService);

  @ViewChild('topicsSection') topicsSection?: ElementRef<HTMLElement>;

  readonly gradeLabel = gradeLabel;
  readonly phase = signal<Phase>('loading');
  readonly error = signal('');
  readonly plan = signal<LearningPlan | null>(null);
  readonly topics = signal<TopicStanding[] | null>(null);
  readonly topicsError = signal('');
  readonly gradeFilter = signal<number | null>(null);
  readonly studentId = computed(() => this.sessions.session()?.studentId ?? '');
  readonly generated = computed(() => {
    const at = this.plan()?.generatedAt;
    return at ? new Date(at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';
  });

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.phase.set('loading');
    this.error.set('');
    try {
      this.plan.set(await this.api.plan());
      this.phase.set('ready');
      void this.loadTopics();
    } catch (err) {
      // An expired code is sent to the code page by the interceptor.
      if ((err as { code?: string }).code === INVALID_ANALYST_CODE) return;
      this.error.set(analystErrorMessage(err));
      this.phase.set('error');
    }
  }

  async loadTopics(): Promise<void> {
    this.topicsError.set('');
    this.topics.set(null);
    try {
      this.topics.set(await this.api.topics());
    } catch (err) {
      if ((err as { code?: string }).code === INVALID_ANALYST_CODE) return;
      this.topicsError.set(analystErrorMessage(err));
    }
  }

  /** A level-card rung: filter the topic list to that grade and bring it into view. */
  showGrade(grade: number): void {
    this.gradeFilter.set(grade);
    const el = this.topicsSection?.nativeElement;
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el?.focus({ preventScroll: true });
  }
}
