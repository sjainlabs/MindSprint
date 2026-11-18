import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import {FullInsightsResponse, LearningApiService, PracticeWorksheetV2Response} from '../services/learning-api.service';
import {firstValueFrom, map} from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { TopicTestService, readyThenLocked } from '../services/topic-test.service';
import { TopicTestCardComponent } from '../components/topic-test-card/topic-test-card.component';
import { withoutHiddenTopics } from '../constants/hidden-topics';
import { HoursMinutesPipe, describeDuration } from '../shared/utils/duration';
import { PracticeTopicCatalogService } from '../services/practice-topic-catalog.service';
import { AnalystApiService, INVALID_ANALYST_CODE, analystErrorMessage } from '../analyst/analyst-api.service';

type ReportTab = 'overview' | 'history';

@Component({
  selector: 'app-simple-insights-page',
  standalone: true,
  imports: [CommonModule, TopicTestCardComponent, RouterLink, HoursMinutesPipe],
  templateUrl: './insights-page.component.html',
  styleUrls: ['./insights-page.component.css'],
})
export class InsightsPageComponent implements OnInit {
  private readonly api = inject(LearningApiService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly topicTests = inject(TopicTestService);
  private readonly analystApi = inject(AnalystApiService);
  private readonly catalog = inject(PracticeTopicCatalogService);
  readonly describeDuration = describeDuration;
  /** topicId → name, so history shows "3-Digit Addition" rather than its id. Ids stay until the catalog loads. */
  private readonly topicNames = signal<Map<string, string>>(new Map());
  private readonly allTopicNames = computed(() => {
    const names = new Map((this.insights()?.topicTests ?? []).map((t) => [t.topicId, t.topicName] as [string, string]));
    for (const [id, name] of this.topicNames()) names.set(id, name);
    return names;
  });

  /** Guest analyst (route data { analyst: true }): reads /api/analyst/*, and nothing can be resubmitted. */
  private readonly route = inject(ActivatedRoute);
  readonly readOnly = this.route.snapshot.data['analyst'] === true;
  /** A logged-in parent opened ?studentId=… from their dashboard: they can fix typos, not resubmit for the kid. */
  readonly childId = this.readOnly ? null : this.route.snapshot.queryParamMap.get('studentId');
  readonly parentView = !!this.childId && this.authService.isParentLoggedIn();
  /** The kid's own correction attempts: only for the kid. */
  readonly canCorrect = !this.readOnly && !this.parentView;
  /** Wording about the child rather than "you". */
  readonly aboutChild = this.readOnly || this.parentView;

  /** Overview (summary and topic tests) or the full worksheet and test history; kept in ?tab= so links can open either. */
  // Follows the URL, so a link to ?tab=history switches tabs even while the page is already open.
  readonly tab = toSignal(
    this.route.queryParamMap.pipe(map((params): ReportTab => (params.get('tab') === 'history' ? 'history' : 'overview'))),
    { initialValue: (this.route.snapshot.queryParamMap.get('tab') === 'history' ? 'history' : 'overview') as ReportTab },
  );

  setTab(tab: ReportTab): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { tab: tab === 'overview' ? null : tab }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly insights = signal<FullInsightsResponse | null>(null);
  // Read from the shared cache so a just-submitted test result shows without refetching.
  // Ready tests first, then locked ones (only one topic test is open at a time).
  readonly topicTestStatuses = computed(() =>
    readyThenLocked(
      withoutHiddenTopics(this.insights()?.topicTests ?? []).map((t) => (this.canCorrect ? this.topicTests.statusFor(t.topicId) ?? t : t)),
    ),
  );

  readonly worksheetHistory = signal<any[]>([]);
  readonly expandedRows = signal<Record<string, boolean>>({});
  readonly showCorrect = signal<Record<string, boolean>>({});
  readonly correctionMode = signal<Record<string, boolean>>({});
  readonly correctionAnswers = signal<Record<string, Record<string, string>>>({});
  readonly correctionAttemptCount = signal<Record<string, number>>({});
  readonly correctionMaxAttempts = signal<Record<string, number>>({});


  toggleRow(id: string) {
    this.expandedRows.update(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  }

  toggleCorrect(qid: string) {
    this.showCorrect.update(prev => ({
      ...prev,
      [qid]: !prev[qid]
    }));
  }

  /** The worksheet's topics by name, falling back to the id for topics the catalog doesn't know. */
  topicLabel(w: { topics?: string[]; topicName?: string; title?: string | null }): string {
    if (w.title) return w.title;
    if (!w.topics?.length) return w.topicName ?? '';
    const names = this.allTopicNames();
    return w.topics.map((id) => names.get(id) ?? id).join(', ');
  }

  private loadTopicNames(): void {
    // Not awaited: the report shows straight away and the names fill in when the catalog arrives
    void this.catalog.loadMergedCatalogAsync().then(() =>
      this.topicNames.set(new Map(this.catalog.getAllTopics().map((t) => [t.id, t.name]))),
    );
  }

  async ngOnInit(): Promise<void> {
    this.loadTopicNames();
    const studentId = this.readOnly ? null : this.parentView ? this.childId : this.authService.getStoredStudentId();

    if (!this.readOnly && !studentId) {
      this.errorMessage.set('No active student.');
      this.loading.set(false);
      return;
    }

    try {
      // Both requests at once; neither needs the other
      const [result, loadedHistory] = await Promise.all([
        this.readOnly ? this.analystApi.insights() : this.api.getFullInsights(studentId!),
        this.readOnly ? this.analystApi.worksheetHistory() : this.api.getWorksheetHistory(studentId!),
      ]);
      if (this.canCorrect) this.topicTests.ingest(result.topicTests);
      this.insights.set(result);
      const history = loadedHistory ?? [];

      // Sort newest → oldest
      history.sort((a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );

      const attemptMap: Record<string, number> = {};
      const maxMap: Record<string, number> = {};
      const answerMap: Record<string, Record<string, string>> = {};
      for (const w of history) {
        attemptMap[w.worksheetId] = w.attemptCount ?? 0;
        maxMap[w.worksheetId] = w.maxAttempts ?? 2;

        // Store answers for editing
        const ans: Record<string, string> = {};
        for (const q of w.details ?? []) {
          ans[q.questionId] = q.submittedAnswer;
        }
        answerMap[w.worksheetId] = ans;
      }

      this.correctionAttemptCount.set(attemptMap);
      this.correctionMaxAttempts.set(maxMap);
      this.correctionAnswers.set(answerMap);

      this.worksheetHistory.set(history);
    } catch (err) {
      if (this.readOnly) {
        // An expired code is sent to the code page by the analyst interceptor.
        if ((err as { code?: string }).code !== INVALID_ANALYST_CODE) this.errorMessage.set(analystErrorMessage(err));
      } else {
        this.errorMessage.set('Unable to load insights right now.');
      }
    } finally {
      this.loading.set(false);
    }
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }

  isTopicTest(entry: { kind?: string }): boolean {
    return entry?.kind === 'topic-test';
  }

  isAdhocTest(entry: { kind?: string }): boolean {
    return entry?.kind === 'adhoc-test';
  }

  /** Topic and custom tests have one submission, so no corrections. */
  isTest(entry: { kind?: string }): boolean {
    return this.isTopicTest(entry) || this.isAdhocTest(entry);
  }

  startCorrection(worksheetId: string) {
    if (!this.canCorrect) return;
    const attempts = this.correctionAttemptCount()[worksheetId];
    const max = this.correctionMaxAttempts()[worksheetId];

    if (attempts >= max) return; // locked

    this.correctionMode.update(prev => ({
      ...prev,
      [worksheetId]: true
    }));
  }

  exitCorrection(worksheetId: string) {
    this.correctionMode.update(prev => ({
      ...prev,
      [worksheetId]: false
    }));
  }

  updateCorrectionAnswer(worksheetId: string, questionId: string, value: string) {
    const current = this.correctionAnswers()[worksheetId];

    this.correctionAnswers.update(prev => ({
      ...prev,
      [worksheetId]: {
        ...current,
        [questionId]: value
      }
    }));
  }

  async submitCorrection(worksheetId: string) {
    if (!this.canCorrect) return;
    const studentId = this.authService.getStoredStudentId();
    if (!studentId) return;

    const answers = this.correctionAnswers()[worksheetId];

    const payload = {
      worksheetId,
      studentId,
      answers,
      submittedAt: new Date().toISOString()
    };

    const idempotencyKey = crypto.randomUUID();

    try {
      // ⭐ FIX: remove double await + correct typing
      const response: any = await firstValueFrom(
        await this.api.submitPracticeWorksheetV1(payload, idempotencyKey)
      );



      this.correctionAttemptCount.update(prev => ({
        ...prev,
        [worksheetId]: response.attemptCount
      }));

      const updatedHistory = this.worksheetHistory().map(w =>
        w.worksheetId === worksheetId ? { ...w, details: response.results } : w
      );

      this.worksheetHistory.set(updatedHistory);

      this.exitCorrection(worksheetId);

    } catch (err) {
      console.error(err);
      alert("Unable to submit corrections.");
    }
  }



}
