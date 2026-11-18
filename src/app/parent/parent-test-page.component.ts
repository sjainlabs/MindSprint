import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  PARENT_TEST_MAX_QUESTIONS,
  ParentTestError,
  ParentTestQuestionInput,
  ParentTestService,
  ParentTestSummary,
} from '../services/parent-test.service';

interface DraftQuestion {
  key: number;
  prompt: string;
  answer: string;
}

/** "question | answer" per line; lines without a "|" are skipped and reported. */
export function parseQuestionLines(text: string): { questions: ParentTestQuestionInput[]; skipped: number } {
  const questions: ParentTestQuestionInput[] = [];
  let skipped = 0;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const bar = line.lastIndexOf('|');
    const prompt = bar >= 0 ? line.slice(0, bar).trim() : '';
    const answer = bar >= 0 ? line.slice(bar + 1).trim() : '';
    if (prompt && answer) questions.push({ prompt, answer });
    else skipped += 1;
  }
  return { questions, skipped };
}

/**
 * A parent types in a test for one child: a title and questions with their answers. The child finds
 * it on their Tests page under "From your parent" and takes it like a custom test.
 */
@Component({
  selector: 'app-parent-test-page',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    <main class="page">
      @if (fromTests) {
        <a class="back" routerLink="/tests">← Tests</a>
      } @else {
        <a class="back" routerLink="/parent/dashboard">← Parent dashboard</a>
      }

      <section class="card">
        <h1>✍️ Manual test{{ childName ? ' for ' + childName : '' }}</h1>
        <p class="muted">Type your own questions and answers. {{ childName || 'Your child' }} will find the test on their Tests page under "From your parent".</p>
      </section>

      @if (sent(); as s) {
        <section class="card sent" role="status">
          <p><strong>Sent: "{{ s.title }}"</strong>, {{ s.questionCount }} question{{ s.questionCount === 1 ? '' : 's' }}. It's waiting on {{ childName || 'your child' }}'s Tests page.</p>
          <div class="actions row">
            <button type="button" class="btn" (click)="sent.set(null)">Write another</button>
            @if (fromTests) { <a class="btn primary" routerLink="/tests">Back to tests</a> }
          </div>
        </section>
      } @else {
        <section class="card form">
          <label class="field">
            <span>Test title</span>
            <input type="text" maxlength="80" placeholder="e.g. Times tables practice" [value]="title()" (input)="title.set($any($event.target).value)" />
          </label>

          <ol class="draft">
            @for (q of questions(); track q.key; let i = $index) {
              <li class="draft-q">
                <div class="draft-head">
                  <span class="q-num">Q{{ i + 1 }}</span>
                  <div class="row-actions">
                    <button type="button" class="icon-btn" [disabled]="i === 0" (click)="move(i, -1)" [attr.aria-label]="'Move question ' + (i + 1) + ' up'">↑</button>
                    <button type="button" class="icon-btn" [disabled]="i === questions().length - 1" (click)="move(i, 1)" [attr.aria-label]="'Move question ' + (i + 1) + ' down'">↓</button>
                    <button type="button" class="icon-btn" [disabled]="questions().length === 1" (click)="remove(i)" [attr.aria-label]="'Remove question ' + (i + 1)">✕</button>
                  </div>
                </div>
                <label class="field">
                  <span>Question</span>
                  <textarea rows="2" maxlength="500" placeholder="e.g. What is 7 × 8?" [value]="q.prompt" (input)="edit(i, 'prompt', $any($event.target).value)"></textarea>
                </label>
                <label class="field">
                  <span>Answer</span>
                  <input type="text" maxlength="100" autocomplete="off" spellcheck="false" placeholder="e.g. 56" [value]="q.answer"
                         (input)="edit(i, 'answer', $any($event.target).value)" (keydown.enter)="addAfter(i)" />
                </label>
              </li>
            }
          </ol>

          <div class="actions row">
            <button type="button" class="btn" [disabled]="questions().length >= max" (click)="add()">+ Add question</button>
            <button type="button" class="btn" (click)="pasting.set(!pasting())">{{ pasting() ? 'Close' : '📋 Paste a list' }}</button>
          </div>

          @if (pasting()) {
            <div class="paste">
              <label class="field">
                <span>One question per line: <code>question | answer</code></span>
                <textarea rows="5" placeholder="7 × 8 | 56&#10;Spell 12 | twelve" [value]="pasteText()" (input)="pasteText.set($any($event.target).value)"></textarea>
              </label>
              <button type="button" class="btn" [disabled]="!pasteText().trim()" (click)="addPasted()">Add these questions</button>
              @if (pasteNote()) { <p class="hint">{{ pasteNote() }}</p> }
            </div>
          }

          <p class="hint">Answers are checked without minding capitals or extra spaces. For numbers, the same value written another way also counts, e.g. 1 1/2 for 3/2.</p>

          @if (formError()) { <p class="notice error" role="alert">{{ formError() }}</p> }
          <button type="button" class="btn primary big" [disabled]="saving() || readyCount() === 0" (click)="save()">
            {{ saving() ? 'Sending…' : 'Send test (' + readyCount() + ' question' + (readyCount() === 1 ? '' : 's') + ')' }}
          </button>
        </section>
      }

      <section class="card">
        <h2>Tests you've written</h2>
        @if (listError()) { <p class="notice error" role="alert">{{ listError() }}</p> }
        @if (loadingList()) {
          <p class="muted">Loading…</p>
        } @else if (!tests().length) {
          <p class="muted">None yet.</p>
        } @else {
          <ul class="written">
            @for (t of tests(); track t.testId) {
              <li>
                <div class="written-main">
                  <strong>{{ t.title }}</strong>
                  <span class="muted">{{ t.questionCount }} question{{ t.questionCount === 1 ? '' : 's' }} · written {{ t.createdAt | date: 'd MMM' }}</span>
                </div>
                @if (t.status === 'submitted') {
                  <span class="score">{{ t.accuracy }}% <span class="muted">{{ t.score }}/{{ t.total }}</span></span>
                  <a class="btn small" routerLink="/parent/fix-answers" [queryParams]="{ studentId: studentId, worksheetId: t.testId }">Answers &amp; typos</a>
                } @else {
                  <span class="tag waiting">Waiting</span>
                  <button type="button" class="btn small" [disabled]="deleting() === t.testId" (click)="removeTest(t)">Delete</button>
                }
              </li>
            }
          </ul>
        }
      </section>
    </main>
  `,
  styleUrls: ['../tests/test-pages.css'],
  styles: [
    `
      .back { color: #3730a3; font-weight: 700; text-decoration: none; }
      h1, h2 { font-weight: 800; margin: 0; }
      .form { gap: 14px; }
      .field { display: grid; gap: 4px; font-weight: 700; color: #334155; }
      .field input, .field textarea { font: inherit; font-weight: 500; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 12px; min-height: 44px; resize: vertical; }
      .field input:focus, .field textarea:focus { outline: 3px solid #c7d2fe; border-color: #6366f1; }
      .draft { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
      .draft-q { display: grid; gap: 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px; }
      .draft-head { display: flex; align-items: center; justify-content: space-between; }
      .q-num { font-weight: 800; color: #4338ca; }
      .row-actions { display: flex; gap: 4px; }
      .icon-btn { border: 0; background: #e2e8f0; border-radius: 8px; width: 36px; height: 36px; font-weight: 800; cursor: pointer; }
      .icon-btn:disabled { opacity: 0.35; cursor: default; }
      .actions.row { display: flex; flex-wrap: wrap; gap: 8px; }
      .paste { display: grid; gap: 8px; }
      .sent { border: 2px solid #86efac; background: #f0fdf4; }
      .written { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
      .written li { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; border-bottom: 1px solid #e2e8f0; padding: 8px 0; }
      .written-main { display: grid; flex: 1 1 12rem; min-width: 0; }
      .score { font-weight: 800; }
      .tag.waiting { background: #fef3c7; color: #92400e; }
    `,
  ],
})
export class ParentTestPageComponent implements OnInit {
  private readonly api = inject(ParentTestService);
  private readonly route = inject(ActivatedRoute);

  readonly studentId = this.route.snapshot.queryParamMap.get('studentId') ?? '';
  readonly childName = this.route.snapshot.queryParamMap.get('name') ?? '';
  /** Opened from the Tests page (?from=tests) rather than the parent dashboard. */
  readonly fromTests = this.route.snapshot.queryParamMap.get('from') === 'tests';
  readonly max = PARENT_TEST_MAX_QUESTIONS;

  private nextKey = 1;
  readonly title = signal('');
  readonly questions = signal<DraftQuestion[]>([this.blank()]);
  readonly pasting = signal(false);
  readonly pasteText = signal('');
  readonly pasteNote = signal('');
  readonly saving = signal(false);
  readonly formError = signal('');
  readonly sent = signal<ParentTestSummary | null>(null);

  readonly tests = signal<ParentTestSummary[]>([]);
  readonly loadingList = signal(true);
  readonly listError = signal('');
  readonly deleting = signal<string | null>(null);

  /** Rows with both a question and an answer; fully blank rows are ignored when sending. */
  readonly readyCount = computed(() => this.questions().filter((q) => q.prompt.trim() && q.answer.trim()).length);

  ngOnInit(): void {
    this.loadList();
  }

  private blank(): DraftQuestion {
    return { key: this.nextKey++, prompt: '', answer: '' };
  }

  edit(index: number, field: 'prompt' | 'answer', value: string): void {
    this.questions.update((qs) => qs.map((q, i) => (i === index ? { ...q, [field]: value } : q)));
    this.formError.set('');
  }

  add(): void {
    if (this.questions().length < this.max) this.questions.update((qs) => [...qs, this.blank()]);
  }

  /** Enter in an answer starts the next question (or moves to it). */
  addAfter(index: number): void {
    if (index === this.questions().length - 1) this.add();
    setTimeout(() => document.querySelectorAll<HTMLTextAreaElement>('.draft-q textarea')[index + 1]?.focus());
  }

  remove(index: number): void {
    this.questions.update((qs) => (qs.length > 1 ? qs.filter((_, i) => i !== index) : qs));
  }

  move(index: number, by: -1 | 1): void {
    this.questions.update((qs) => {
      const next = [...qs];
      const [q] = next.splice(index, 1);
      next.splice(index + by, 0, q);
      return next;
    });
  }

  addPasted(): void {
    const { questions, skipped } = parseQuestionLines(this.pasteText());
    const kept = this.questions().filter((q) => q.prompt.trim() || q.answer.trim());
    const room = this.max - kept.length;
    const added = questions.slice(0, Math.max(0, room)).map((q) => ({ key: this.nextKey++, ...q }));
    this.questions.set(kept.length + added.length ? [...kept, ...added] : [this.blank()]);
    const notes = [`Added ${added.length} question${added.length === 1 ? '' : 's'}.`];
    if (skipped) notes.push(`${skipped} line${skipped === 1 ? ' was' : 's were'} skipped (no "|" or nothing after it).`);
    if (questions.length > added.length) notes.push(`Only ${this.max} questions fit in one test.`);
    this.pasteNote.set(notes.join(' '));
    this.pasteText.set('');
  }

  async save(): Promise<void> {
    const filled = this.questions().filter((q) => q.prompt.trim() || q.answer.trim());
    const half = filled.findIndex((q) => !q.prompt.trim() || !q.answer.trim());
    if (half >= 0) {
      const n = this.questions().indexOf(filled[half]) + 1;
      this.formError.set(`Question ${n} needs both the question and its answer.`);
      return;
    }
    this.saving.set(true);
    this.formError.set('');
    try {
      const created = await this.api.write(this.studentId, this.title().trim(), filled.map((q) => ({ prompt: q.prompt.trim(), answer: q.answer.trim() })));
      this.sent.set(created);
      this.title.set('');
      this.questions.set([this.blank()]);
      this.pasteNote.set('');
      await this.loadList();
    } catch (err) {
      this.formError.set((err as ParentTestError).message || 'Could not send the test.');
    } finally {
      this.saving.set(false);
    }
  }

  async loadList(): Promise<void> {
    this.loadingList.set(true);
    try {
      this.tests.set(await this.api.list(this.studentId));
      this.listError.set('');
    } catch (err) {
      this.listError.set((err as ParentTestError).message || 'Could not load your tests.');
    } finally {
      this.loadingList.set(false);
    }
  }

  async removeTest(test: ParentTestSummary): Promise<void> {
    if (!window.confirm(`Delete "${test.title}"? ${this.childName || 'Your child'} hasn't taken it yet.`)) return;
    this.deleting.set(test.testId);
    try {
      await this.api.remove(this.studentId, test.testId);
      this.tests.update((ts) => ts.filter((t) => t.testId !== test.testId));
    } catch (err) {
      this.listError.set((err as ParentTestError).message || 'Could not delete the test.');
    } finally {
      this.deleting.set(null);
    }
  }
}
