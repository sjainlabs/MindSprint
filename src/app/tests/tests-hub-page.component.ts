import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { LearningApiService } from '../services/learning-api.service';
import { AdhocSelection, AdhocTestService } from '../services/adhoc-test.service';

type HistoryKind = 'adhoc-test' | 'topic-test';
type HistoryFilter = 'all' | HistoryKind;

interface TestHistoryEntry {
  id: string;
  kind: HistoryKind;
  submittedAt: string;
  topics: string[];
  score: number | null;
  total: number | null;
  accuracy: number | null;
  details: Array<{
    questionId: string;
    prompt: string;
    correct: boolean;
    submittedAnswer: string;
    expectedAnswer: string;
  }>;
}

/** Landing page for the dashboard's "Tests" button: custom tests, scheduled tests and test history. */
@Component({
  selector: 'app-tests-hub-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './tests-hub-page.component.html',
  styleUrls: ['./test-pages.css', './tests-hub-page.component.css'],
})
export class TestsHubPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly api = inject(LearningApiService);
  private readonly adhoc = inject(AdhocTestService);

  readonly loadingHistory = signal(true);
  readonly historyError = signal('');
  readonly history = signal<TestHistoryEntry[]>([]);
  readonly filter = signal<HistoryFilter>('all');
  readonly expanded = signal<Record<string, boolean>>({});

  readonly unfinished = signal<{ topicCount: number; answered: number; total: number } | null>(null);
  readonly lastSelection = signal<AdhocSelection | null>(null);

  readonly filteredHistory = computed(() => {
    const f = this.filter();
    return f === 'all' ? this.history() : this.history().filter((h) => h.kind === f);
  });

  readonly counts = computed(() => ({
    all: this.history().length,
    adhoc: this.history().filter((h) => h.kind === 'adhoc-test').length,
    topic: this.history().filter((h) => h.kind === 'topic-test').length,
  }));

  async ngOnInit(): Promise<void> {
    const studentId = this.auth.getStoredStudentId();
    if (!studentId) {
      await this.router.navigate(['/auth/access-code']);
      return;
    }

    const active = this.adhoc.loadActive(studentId);
    if (active) {
      this.unfinished.set({
        topicCount: active.test.topics.length,
        answered: Object.values(active.answers).filter((a) => a.trim()).length,
        total: active.test.questionCount,
      });
    }
    this.lastSelection.set(this.adhoc.loadLastSelection(studentId));

    await this.loadHistory(studentId);
  }

  async loadHistory(studentId = this.auth.getStoredStudentId() ?? ''): Promise<void> {
    this.loadingHistory.set(true);
    this.historyError.set('');
    try {
      const raw = await this.api.getWorksheetHistory(studentId);
      const entries = (raw ?? [])
        .filter((w: any) => w?.kind === 'adhoc-test' || w?.kind === 'topic-test')
        .map((w: any): TestHistoryEntry => ({
          id: String(w.worksheetId ?? w.testId ?? w.submittedAt),
          kind: w.kind,
          submittedAt: w.submittedAt,
          topics: Array.isArray(w.topics) ? w.topics : w.topicName ? [w.topicName] : [],
          score: w.score ?? null,
          total: w.total ?? null,
          accuracy: w.accuracy ?? null,
          details: Array.isArray(w.details) ? w.details : [],
        }))
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      this.history.set(entries);
    } catch {
      this.historyError.set('Unable to load your test history right now.');
    } finally {
      this.loadingHistory.set(false);
    }
  }

  toggle(id: string): void {
    this.expanded.update((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  resume(): void {
    this.router.navigate(['/tests/custom/take']);
  }

  buildTest(): void {
    this.router.navigate(['/tests/custom']);
  }
}
