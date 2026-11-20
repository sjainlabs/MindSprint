import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { EnhancedTopic } from '../services/practice-config.service';
import { PracticeTopicCatalogService } from '../services/practice-topic-catalog.service';
import { LearningPlanService, MAX_FOCUS_TOPICS, PlanFocus } from '../services/learning-plan.service';

const MAX_RESULTS = 30;

/**
 * A parent or teacher picks the topics the learning plan puts first, in order, with a short note the
 * child sees, e.g. "Multiplying big numbers: it's what trips up long division".
 */
@Component({
  selector: 'app-focus-editor',
  standalone: true,
  template: `
    <div class="backdrop" (click)="closed.emit()">
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="focus-title" (click)="$event.stopPropagation()">
        <h2 id="focus-title">🎯 Focus for the plan</h2>
        <p class="muted">These topics go to the top of the plan, in this order, until each is strong. Topics not started yet open with their study guide.</p>

        <label class="label" for="focus-note">Note for your child (optional)</label>
        <input id="focus-note" class="note" maxlength="200" placeholder="e.g. Multiplying big numbers"
               [value]="note()" (input)="note.set($any($event.target).value)" />

        <h3>Focus topics ({{ picked().length }} / {{ max }})</h3>
        @if (picked().length) {
          <ol class="picked">
            @for (t of picked(); track t.id; let i = $index, first = $first, last = $last) {
              <li>
                <span class="name">{{ t.name }} <span class="grade">G{{ gradeLabel(t.cbseGrade) }}</span></span>
                <span class="order">
                  <button type="button" [disabled]="first" [attr.aria-label]="'Move ' + t.name + ' up'" (click)="move(i, -1)">↑</button>
                  <button type="button" [disabled]="last" [attr.aria-label]="'Move ' + t.name + ' down'" (click)="move(i, 1)">↓</button>
                  <button type="button" class="remove" [attr.aria-label]="'Remove ' + t.name" (click)="remove(t.id)">×</button>
                </span>
              </li>
            }
          </ol>
        } @else {
          <p class="muted">No topics yet. Search below to add some.</p>
        }

        <input type="search" class="search" placeholder="Search topics, e.g. multiplication" aria-label="Search topics"
               [value]="search()" (input)="search.set($any($event.target).value)" />
        @if (search().trim()) {
          <ul class="results">
            @for (t of results(); track t.id) {
              <li>
                <button type="button" [disabled]="isPicked(t.id) || picked().length >= max" (click)="add(t)">
                  <span>{{ t.name }}</span>
                  <span class="grade">G{{ gradeLabel(t.cbseGrade) }}{{ isPicked(t.id) ? ' · added' : '' }}</span>
                </button>
              </li>
            } @empty {
              <li class="muted">No topics match.</li>
            }
          </ul>
        }

        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }

        <div class="actions">
          <button type="button" class="primary" [disabled]="saving() || !picked().length" (click)="save()">{{ saving() ? 'Saving…' : 'Save focus' }}</button>
          @if (current()) {
            <button type="button" class="danger-text" [disabled]="saving()" (click)="clear()">Clear focus</button>
          }
          <button type="button" class="ghost" [disabled]="saving()" (click)="closed.emit()">Cancel</button>
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      .backdrop { position: fixed; inset: 0; z-index: 50; background: rgba(15, 23, 42, 0.5); display: grid; place-items: center; padding: 16px; overflow-y: auto; }
      .modal { width: min(520px, 100%); box-sizing: border-box; background: #fff; border-radius: 16px; padding: 16px; display: grid; gap: 10px; }
      h2, h3, p { margin: 0; }
      h3 { font-size: 0.95rem; color: #334155; margin-top: 4px; }
      .muted { color: #64748b; font-size: 0.9rem; }
      .label { font-weight: 700; font-size: 0.9rem; color: #334155; }
      .note, .search { border: 2px solid #cbd5e1; border-radius: 12px; padding: 10px 12px; font: inherit; font-size: 1rem; min-width: 0; }
      .note:focus, .search:focus { outline: none; border-color: #2563eb; }
      .picked { margin: 0; padding: 0; list-style: none; display: grid; gap: 6px; counter-reset: focus; }
      .picked li { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 10px; border-radius: 12px; background: #eef2ff; counter-increment: focus; }
      .picked .name::before { content: counter(focus) '. '; font-weight: 800; color: #3730a3; }
      .name { min-width: 0; overflow-wrap: anywhere; font-weight: 600; }
      .grade { font-size: 0.75rem; font-weight: 700; color: #475569; white-space: nowrap; }
      .order { display: flex; gap: 4px; flex: none; }
      .order button { width: 36px; height: 36px; min-height: 36px; padding: 0; background: #fff; }
      .order .remove { color: #b91c1c; }
      .results { margin: 0; padding: 0; list-style: none; display: grid; gap: 4px; max-height: 240px; overflow-y: auto; }
      .results button { width: 100%; display: flex; justify-content: space-between; gap: 8px; text-align: left; background: #f8fafc; font-weight: 600; }
      .results button:hover:not(:disabled) { background: #eef2ff; }
      .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
      .actions button { flex: 1 1 auto; }
      button { border: 0; border-radius: 12px; padding: 10px 12px; font: inherit; font-weight: 700; background: #e2e8f0; color: #0f172a; cursor: pointer; min-height: 44px; }
      button:disabled { opacity: 0.5; cursor: not-allowed; }
      button:focus-visible { outline: 3px solid #6366f1; outline-offset: 2px; }
      .primary { background: #2563eb; color: #fff; }
      .ghost { background: #f1f5f9; }
      .danger-text { background: #fef2f2; color: #b91c1c; }
      .error { color: #b91c1c; }
    `,
  ],
})
export class FocusEditorComponent implements OnInit {
  private readonly catalog = inject(PracticeTopicCatalogService);
  private readonly api = inject(LearningPlanService);

  readonly studentId = input.required<string>();
  readonly current = input<PlanFocus | null>(null);
  readonly closed = output<void>();
  /** Saved or cleared: the plan reloads */
  readonly saved = output<void>();

  readonly max = MAX_FOCUS_TOPICS;
  readonly topics = signal<EnhancedTopic[]>([]);
  readonly picked = signal<EnhancedTopic[]>([]);
  readonly note = signal('');
  readonly search = signal('');
  readonly saving = signal(false);
  readonly error = signal('');

  readonly results = computed(() => {
    const words = this.search().trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return this.topics()
      .filter((t) => words.every((w) => `${t.name} ${t.id}`.toLowerCase().includes(w)))
      .sort((a, b) => a.cbseGrade - b.cbseGrade || a.name.localeCompare(b.name))
      .slice(0, MAX_RESULTS);
  });

  async ngOnInit(): Promise<void> {
    await this.catalog.loadMergedCatalogAsync();
    const all = this.catalog.getCatalog();
    this.topics.set(all);
    const focus = this.current();
    if (focus) {
      const byId = new Map(all.map((t) => [t.id.toLowerCase(), t]));
      this.picked.set(focus.topics.map((t) => byId.get(t.topicId.toLowerCase())).filter((t): t is EnhancedTopic => !!t));
      this.note.set(focus.note);
    }
  }

  gradeLabel(grade: number): string {
    return grade === 0 ? 'K' : String(grade);
  }

  isPicked(id: string): boolean {
    return this.picked().some((t) => t.id === id);
  }

  add(topic: EnhancedTopic): void {
    if (this.isPicked(topic.id) || this.picked().length >= this.max) return;
    this.picked.update((list) => [...list, topic]);
  }

  remove(id: string): void {
    this.picked.update((list) => list.filter((t) => t.id !== id));
  }

  move(index: number, by: number): void {
    this.picked.update((list) => {
      const next = [...list];
      [next[index], next[index + by]] = [next[index + by], next[index]];
      return next;
    });
  }

  save(): Promise<void> {
    return this.run(() => this.api.setFocus(this.studentId(), this.picked().map((t) => t.id), this.note().trim()));
  }

  clear(): Promise<void> {
    return this.run(() => this.api.setFocus(this.studentId(), [], ''));
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.saving.set(true);
    this.error.set('');
    try {
      await action();
      this.saved.emit();
    } catch (err) {
      this.error.set(err instanceof Error && err.message ? err.message : "Couldn't save the focus.");
    } finally {
      this.saving.set(false);
    }
  }
}
