import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { LearningApiService } from '../services/learning-api.service';

export interface SubmittedWork {
  worksheetId: string;
  kindLabel: string;
  title: string;
  submittedAt: string;
  accuracy: number | null;
}

const KIND_LABELS: Record<string, string> = {
  practice: 'Practice sheet',
  'topic-test': 'Topic test',
  'review-test': 'Review test',
  'adhoc-test': 'Test',
};

/** One child's recent submitted work, newest first; picking a row opens the typo-fix screen. */
@Component({
  selector: 'app-fix-typos-modal',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="backdrop" (click)="closed.emit()">
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="fix-title" (click)="$event.stopPropagation()">
        <h2 id="fix-title">Fix typos</h2>
        <p class="sub">{{ studentName() }}: pick a sheet or test where a right answer was typed wrong.</p>

        @if (loading()) {
          <p class="muted" aria-busy="true">Loading recent work…</p>
        } @else if (error()) {
          <p class="error" role="alert">{{ error() }}</p>
          <button type="button" class="primary" (click)="load()">Try again</button>
        } @else if (!items().length) {
          <p class="muted">No submitted sheets or tests yet.</p>
        } @else {
          <ul class="list">
            @for (w of items(); track w.worksheetId) {
              <li>
                <button type="button" class="row" (click)="open(w)">
                  <span class="main">
                    <span class="kind">{{ w.kindLabel }}</span>
                    <span class="title">{{ w.title }}</span>
                    <span class="date">{{ w.submittedAt | date: 'EEE d MMM, h:mm a' }}</span>
                  </span>
                  <span class="pct">{{ w.accuracy !== null ? w.accuracy + '%' : '—' }}</span>
                  <span class="chev" aria-hidden="true">›</span>
                </button>
              </li>
            }
          </ul>
        }

        <button type="button" class="ghost" (click)="closed.emit()">Close</button>
      </section>
    </div>
  `,
  styles: [
    `
      .backdrop { position: fixed; inset: 0; z-index: 50; background: rgba(15, 23, 42, 0.5); display: grid; place-items: center; padding: 16px; }
      .modal { width: min(480px, 100%); max-height: calc(100vh - 32px); box-sizing: border-box; background: #fff; border-radius: 16px; padding: 16px; display: grid; grid-template-rows: auto auto minmax(0, 1fr) auto; gap: 10px; }
      h2, p { margin: 0; }
      .sub { color: #475569; }
      .muted { color: #64748b; }
      .error { color: #b91c1c; }
      .list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; overflow-y: auto; min-height: 0; }
      .row { width: 100%; display: flex; align-items: center; gap: 10px; text-align: left; border: 1px solid #e2e8f0; background: #fff; border-radius: 12px; padding: 10px 12px; cursor: pointer; font: inherit; color: inherit; }
      .row:hover { border-color: #a5b4fc; background: #f8fafc; }
      .main { display: grid; gap: 2px; flex: 1; min-width: 0; }
      .kind { font-size: 0.72rem; font-weight: 800; color: #3730a3; text-transform: uppercase; letter-spacing: 0.04em; }
      .title { font-weight: 700; color: #1e293b; overflow-wrap: anywhere; }
      .date { font-size: 0.8rem; color: #64748b; }
      .pct { font-weight: 800; color: #0f172a; }
      .chev { color: #94a3b8; font-size: 1.4rem; }
      button.primary, button.ghost { border: 0; border-radius: 12px; padding: 12px; font-weight: 700; cursor: pointer; }
      .primary { background: #2563eb; color: #fff; }
      .ghost { background: #f1f5f9; color: #0f172a; }
    `,
  ],
})
export class FixTyposModalComponent implements OnInit {
  private readonly api = inject(LearningApiService);
  private readonly router = inject(Router);

  readonly studentId = input.required<string>();
  readonly studentName = input('');
  readonly closed = output<void>();

  readonly loading = signal(true);
  readonly error = signal('');
  readonly items = signal<SubmittedWork[]>([]);

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const history = await this.api.getWorksheetHistory(this.studentId());
      this.items.set(toSubmittedWork(history ?? []));
    } catch {
      this.error.set("Couldn't load recent work. Please try again.");
    } finally {
      this.loading.set(false);
    }
  }

  open(w: SubmittedWork): void {
    this.closed.emit();
    void this.router.navigate(['/parent/fix-answers'], { queryParams: { studentId: this.studentId(), worksheetId: w.worksheetId } });
  }
}

/** History rows (GET /insights/worksheets/:studentId/history), newest first. */
export function toSubmittedWork(history: any[]): SubmittedWork[] {
  return history
    .filter((w) => w?.worksheetId && w?.submittedAt)
    .map((w) => ({
      worksheetId: String(w.worksheetId),
      kindLabel: KIND_LABELS[w.kind] ?? KIND_LABELS['practice'],
      title: (Array.isArray(w.topics) && w.topics.length ? w.topics.join(', ') : w.topicName) || 'Worksheet',
      submittedAt: String(w.submittedAt),
      accuracy: typeof w.accuracy === 'number' ? w.accuracy : null,
    }))
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
}
