import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  AnswerFixError,
  AnswerFixResult,
  AnswerFixService,
  FIX_KIND_LABELS,
  FixableQuestion,
  FixableSubmission,
  TOPIC_TEST_PASS,
} from '../services/answer-fix.service';
import { MathTextComponent } from '../components/math-text/math-text.component';
import { ColumnLayout, columnLayout } from '../shared/utils/column-layout';

/**
 * A parent corrects typos in one submitted sheet or test. Only wrong answers can be changed, and the
 * server re-scores everything (sheet %, topic test pass, review topics, sheets toward a topic test).
 */
@Component({
  selector: 'app-fix-answers-page',
  standalone: true,
  imports: [DatePipe, RouterLink, MathTextComponent],
  template: `
    <main class="page">
      <a class="back" routerLink="/parent/dashboard">← Parent dashboard</a>

      @if (loading()) {
        <section class="card center" aria-busy="true">
          <div class="spinner"></div>
          <p class="muted">Loading the answers…</p>
        </section>
      } @else if (loadError()) {
        <section class="card">
          <h1>We couldn't open this work</h1>
          <p class="notice error" role="alert">{{ loadError() }}</p>
          <div class="actions row">
            <button type="button" class="btn primary" (click)="load()">Try again</button>
            <a class="btn" routerLink="/parent/dashboard">Back</a>
          </div>
        </section>
      } @else if (submission(); as s) {
        <section class="card head">
          <div class="head-row">
            <div>
              <span class="tag kind">{{ kindLabel() }}</span>
              <h1>Fix typos</h1>
              @if (s.submittedAt) { <p class="muted">Submitted {{ s.submittedAt | date: 'EEE d MMM, h:mm a' }}</p> }
            </div>
            <div class="score" aria-label="Current score">
              <strong>{{ s.accuracy }}%</strong>
              <span class="muted">{{ s.score }}/{{ s.total }}</span>
            </div>
          </div>
          <p class="hint">
            Change an answer only when your child knew it and slipped, e.g. a typo or a swapped digit.
            Only wrong answers can be changed, so the score can only go up.
          </p>
        </section>

        @if (result(); as r) {
          <section class="card result" role="status">
            <p class="result-score">Score {{ r.previousAccuracy }}% → {{ r.accuracy }}%</p>
            @if (passedNow()) {
              <p class="passed">Test passed 🎉, other topic tests unlocked</p>
            }
            @if (stillWrong() > 0) {
              <p class="muted">{{ stillWrong() }} changed answer{{ stillWrong() === 1 ? ' still doesn’t' : 's still don’t' }} match the correct answer.</p>
            }
          </section>
        }

        @if (!s.questions.length) {
          <section class="card"><p class="muted">There are no questions on this {{ kindLabel().toLowerCase() }}.</p></section>
        } @else {
          @if (!fixableCount()) {
            <p class="notice info">Every answer is already correct, so there is nothing to fix.</p>
          }

          <ol class="questions">
            @for (q of s.questions; track q.questionId; let i = $index) {
              <li class="card q" [class.right]="q.correct" [class.wrong]="!q.correct">
                <div class="q-head">
                  <span class="q-num">Q{{ i + 1 }}</span>
                  <span class="mark" [attr.aria-label]="q.correct ? 'correct' : 'wrong'">{{ q.correct ? '✓' : '✗' }}</span>
                  @if (q.fixedByParent) { <span class="tag fixed">Fixed by parent</span> }
                </div>

                @if (column(q); as col) {
                  @if (col.intro) { <p class="prompt"><app-math-text [text]="col.intro" /></p> }
                  <div class="column-sum" role="img" [attr.aria-label]="q.prompt">
                    @for (r of col.rows; track $index; let last = $last) {
                      <span class="col-op">{{ r.op }}</span>
                      <span class="col-num" [class.last]="last">{{ r.value }}</span>
                    }
                  </div>
                } @else {
                  <p class="prompt"><app-math-text [text]="q.prompt" /></p>
                }

                <dl class="answers">
                  <div><dt>Child's answer</dt><dd>{{ q.submittedAnswer || '(no answer)' }}</dd></div>
                  <div><dt>Correct answer</dt><dd>{{ q.expectedAnswer }}</dd></div>
                </dl>

                @if (q.canFix) {
                  <label class="fix">
                    <span>Fixed answer</span>
                    <input
                      type="text"
                      autocomplete="off"
                      spellcheck="false"
                      [value]="valueOf(q)"
                      [disabled]="saving()"
                      [class.changed]="isChanged(q)"
                      (input)="setEdit(q.questionId, $any($event.target).value)"
                    />
                  </label>
                }
              </li>
            }
          </ol>

          @if (fixableCount()) {
            <section class="card save-bar">
              @if (saveError()) {
                <p class="notice error" role="alert">{{ saveError() }}</p>
              }
              @if (confirming()) {
                <p>These answers will be marked as typo fixes ({{ changedCount() }} change{{ changedCount() === 1 ? '' : 's' }}). The score is worked out again.</p>
                <div class="actions row">
                  <button type="button" class="btn primary" [disabled]="saving()" (click)="save()">{{ saving() ? 'Saving…' : 'Yes, save fixes' }}</button>
                  <button type="button" class="btn" [disabled]="saving()" (click)="confirming.set(false)">Cancel</button>
                </div>
              } @else {
                <button type="button" class="btn primary" [disabled]="!changedCount()" (click)="confirming.set(true)">
                  Save fixes{{ changedCount() ? ' (' + changedCount() + ')' : '' }}
                </button>
              }
            </section>
          }
        }
      }
    </main>
  `,
  styleUrls: ['../tests/test-pages.css'],
  styles: [
    `
      .back { color: #4338ca; font-weight: 700; text-decoration: none; justify-self: start; }
      .head-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
      .head h1 { margin-top: 6px; }
      .tag.kind { background: #eef2ff; color: #3730a3; }
      .score { display: grid; justify-items: end; flex: none; }
      .score strong { font-size: 1.8rem; color: #1e1b4b; }
      .result { background: linear-gradient(180deg, #ecfdf5, #fff); border: 2px solid #86efac; }
      .result-score { font-size: 1.3rem; font-weight: 800; color: #166534; }
      .passed { font-weight: 800; color: #1e1b4b; }
      .questions { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
      .q { gap: 10px; border-left: 5px solid #e2e8f0; }
      .q.right { border-left-color: #4ade80; }
      .q.wrong { border-left-color: #f87171; }
      .q-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .q-num { font-weight: 800; color: #475569; }
      .mark { font-weight: 900; font-size: 1.1rem; }
      .right .mark { color: #15803d; }
      .wrong .mark { color: #b91c1c; }
      .tag.fixed { background: #fef3c7; color: #92400e; }
      .prompt { font-weight: 700; color: #1e293b; overflow-wrap: anywhere; }
      .answers { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 0; }
      .answers div { background: #f8fafc; border-radius: 10px; padding: 8px 10px; min-width: 0; }
      dt { font-size: 0.78rem; font-weight: 700; color: #64748b; }
      dd { margin: 2px 0 0; font-weight: 800; color: #0f172a; overflow-wrap: anywhere; }
      .fix { display: grid; gap: 4px; font-size: 0.85rem; font-weight: 700; color: #334155; }
      .fix input { font: inherit; font-size: 1.05rem; font-weight: 700; padding: 10px 12px; border-radius: 10px; border: 2px solid #cbd5e1; min-width: 0; }
      .fix input:focus { outline: none; border-color: var(--primary); }
      .fix input.changed { border-color: #f59e0b; background: #fffbeb; }
      .save-bar { position: sticky; bottom: 12px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.18); }
      .column-sum { display: inline-grid; grid-template-columns: auto auto; justify-self: start; font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace; font-size: 1.6rem; line-height: 1.25; text-align: right; font-variant-numeric: tabular-nums; }
      .col-op { text-align: left; padding-right: 0.4em; }
      .col-num { letter-spacing: 0.12em; }
      .col-num.last, .col-op:nth-last-child(2) { border-bottom: 3px solid currentColor; padding-bottom: 4px; }
      @media (max-width: 480px) { .answers { grid-template-columns: 1fr; } }
    `,
  ],
})
export class FixAnswersPageComponent implements OnInit {
  private readonly api = inject(AnswerFixService);
  private readonly route = inject(ActivatedRoute);

  readonly studentId = this.route.snapshot.queryParamMap.get('studentId') ?? '';
  readonly worksheetId = this.route.snapshot.queryParamMap.get('worksheetId') ?? '';

  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly saveError = signal('');
  readonly saving = signal(false);
  readonly confirming = signal(false);
  readonly submission = signal<FixableSubmission | null>(null);
  readonly result = signal<AnswerFixResult | null>(null);
  /** Typed answers by questionId; only fixable questions get one. */
  readonly edits = signal<Record<string, string>>({});

  readonly kindLabel = computed(() => {
    const kind = this.submission()?.kind;
    return kind ? FIX_KIND_LABELS[kind] ?? 'Worksheet' : 'Worksheet';
  });
  readonly fixableCount = computed(() => this.submission()?.questions.filter((q) => q.canFix).length ?? 0);
  /** Only answers that differ from what the child typed are sent. */
  readonly changes = computed(() => {
    const out: Record<string, string> = {};
    for (const q of this.submission()?.questions ?? []) {
      const typed = this.edits()[q.questionId];
      if (q.canFix && typed !== undefined && typed.trim() !== '' && typed.trim() !== q.submittedAnswer.trim()) {
        out[q.questionId] = typed.trim();
      }
    }
    return out;
  });
  readonly changedCount = computed(() => Object.keys(this.changes()).length);
  readonly passedNow = computed(() => {
    const r = this.result();
    return !!r && r.kind === 'topic-test' && r.previousAccuracy < TOPIC_TEST_PASS && r.accuracy >= TOPIC_TEST_PASS;
  });
  readonly stillWrong = computed(() => {
    const r = this.result();
    if (!r) return 0;
    const fixed = new Set(r.fixedQuestionIds);
    return r.questions.filter((q) => fixed.has(q.questionId) && !q.correct).length;
  });

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    if (!this.studentId || !this.worksheetId) {
      this.loadError.set('This link is missing the child or the worksheet. Open it again from the parent dashboard.');
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.loadError.set('');
    try {
      this.submission.set(await this.api.get(this.studentId, this.worksheetId));
      this.edits.set({});
    } catch (err) {
      this.loadError.set(messageOf(err));
    } finally {
      this.loading.set(false);
    }
  }

  column(q: FixableQuestion): ColumnLayout | null {
    return q.layout === 'vertical' ? columnLayout(q.prompt, q.metadata) : null;
  }

  /** What is in the box: the parent's edit, or the child's answer to start from. */
  valueOf(q: FixableQuestion): string {
    const typed: string | undefined = this.edits()[q.questionId];
    return typed ?? q.submittedAnswer;
  }

  isChanged(q: FixableQuestion): boolean {
    return q.questionId in this.changes();
  }

  setEdit(questionId: string, value: string): void {
    this.edits.update((prev) => ({ ...prev, [questionId]: value }));
    this.saveError.set('');
  }

  async save(): Promise<void> {
    const answers = this.changes();
    if (!Object.keys(answers).length || this.saving()) return;
    this.saving.set(true);
    this.saveError.set('');
    try {
      const result = await this.api.save(this.studentId, this.worksheetId, answers);
      this.result.set(result);
      this.submission.set(result);
      this.edits.set({});
      this.confirming.set(false);
    } catch (err) {
      this.saveError.set(messageOf(err));
      this.confirming.set(false);
    } finally {
      this.saving.set(false);
    }
  }
}

function messageOf(err: unknown): string {
  const e = err as Partial<AnswerFixError>;
  return e?.message || 'Something went wrong. Please try again.';
}
