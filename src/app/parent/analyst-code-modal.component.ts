import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { AnalystCode, AnalystCodeService } from '../analyst/analyst-api.service';
import { analystShareLink, expiryDate, formatAnalystCode } from '../analyst/analyst-code';

type Confirm = 'regenerate' | 'revoke' | null;

/** A parent shares one child's learning plan and insights, read-only, with an analyst who has no account. */
@Component({
  selector: 'app-analyst-code-modal',
  standalone: true,
  template: `
    <div class="backdrop" (click)="closed.emit()">
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="analyst-title" (click)="$event.stopPropagation()">
        <h2 id="analyst-title">Share with an analyst</h2>
        <p class="who">{{ studentName() }}</p>

        @if (loading()) {
          <p class="muted" aria-busy="true">Loading…</p>
        } @else if (loadError()) {
          <p class="error" role="alert">{{ loadError() }}</p>
          <button type="button" class="primary" (click)="load()">Try again</button>
        } @else if (code(); as c) {
          <p>Anyone with this code can see {{ studentName() }}'s learning plan and insights, read-only.</p>
          <div class="code-row">
            <p class="code" aria-label="Analyst code">{{ display(c.code) }}</p>
            <button type="button" class="ghost" (click)="copy('code', display(c.code))">{{ copied() === 'code' ? 'Copied!' : 'Copy' }}</button>
          </div>
          <p class="expires">Expires {{ expires(c.expiresAt) }}</p>

          <label class="link-label" for="analyst-link">Or send this link</label>
          <div class="link-row">
            <input id="analyst-link" readonly [value]="link(c.code)" (focus)="$any($event.target).select()" />
            <button type="button" class="ghost" (click)="copy('link', link(c.code))">{{ copied() === 'link' ? 'Copied!' : 'Copy link' }}</button>
          </div>

          @switch (confirming()) {
            @case ('regenerate') {
              <div class="confirm" role="alertdialog" aria-label="Make a new code?">
                <p>Make a new code? The old code will stop working straight away.</p>
                <div class="actions">
                  <button type="button" class="primary" [disabled]="busy()" (click)="regenerate()">{{ busy() ? 'Making…' : 'Yes, make a new code' }}</button>
                  <button type="button" class="ghost" [disabled]="busy()" (click)="confirming.set(null)">Cancel</button>
                </div>
              </div>
            }
            @case ('revoke') {
              <div class="confirm danger" role="alertdialog" aria-label="Revoke access?">
                <p>Revoke access? The analyst will no longer be able to see {{ studentName() }}'s report.</p>
                <div class="actions">
                  <button type="button" class="danger-btn" [disabled]="busy()" (click)="revoke()">{{ busy() ? 'Revoking…' : 'Yes, revoke' }}</button>
                  <button type="button" class="ghost" [disabled]="busy()" (click)="confirming.set(null)">Cancel</button>
                </div>
              </div>
            }
            @default {
              <div class="actions">
                <button type="button" (click)="confirming.set('regenerate')">Make new code</button>
                <button type="button" class="danger-text" (click)="confirming.set('revoke')">Revoke</button>
              </div>
            }
          }
        } @else {
          <p>An analyst can use a code to see {{ studentName() }}'s:</p>
          <ul class="sees">
            <li>📋 Learning plan: level, next steps, review test and progress</li>
            <li>📈 Insights: scores, topic tests and worksheet history</li>
          </ul>
          <p class="muted">Read-only: they can't practise, take tests or change anything, and see nothing else. The code works for 30 days, and you can revoke it any time.</p>
          <button type="button" class="primary" [disabled]="busy()" (click)="create()">{{ busy() ? 'Creating…' : 'Create code' }}</button>
        }

        @if (actionError()) {
          <p class="error" role="alert">{{ actionError() }}</p>
        }

        <button type="button" class="ghost done" (click)="closed.emit()">Done</button>
      </section>
    </div>
  `,
  styles: [
    `
      .backdrop { position: fixed; inset: 0; z-index: 50; background: rgba(15, 23, 42, 0.5); display: grid; place-items: center; padding: 16px; overflow-y: auto; }
      .modal { width: min(440px, 100%); box-sizing: border-box; background: #fff; border-radius: 16px; padding: 16px; display: grid; gap: 10px; }
      h2, p { margin: 0; }
      p, li { color: #334155; }
      .who { font-weight: 700; color: #475569; margin-top: -6px; }
      .muted { color: #64748b; font-size: 0.9rem; }
      .sees { margin: 0; padding-left: 20px; display: grid; gap: 4px; }
      .code-row, .link-row { display: flex; align-items: center; gap: 8px; }
      .code { flex: 1; text-align: center; font-size: 2rem; letter-spacing: 0.12em; font-weight: 800; font-family: ui-monospace, Menlo, monospace; color: #0f172a; background: #f8fafc; border-radius: 12px; padding: 10px 6px; overflow-wrap: anywhere; }
      .expires { text-align: center; font-weight: 700; color: #475569; }
      .link-label { font-weight: 700; font-size: 0.9rem; color: #334155; }
      .link-row input { flex: 1; min-width: 0; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px; font-size: 0.85rem; color: #334155; background: #f8fafc; }
      .actions { display: flex; flex-wrap: wrap; gap: 8px; }
      .actions button { flex: 1 1 auto; }
      button { border: 0; border-radius: 12px; padding: 12px; font-weight: 700; background: #e2e8f0; color: #0f172a; cursor: pointer; }
      button:disabled { opacity: 0.6; cursor: not-allowed; }
      .primary { background: #2563eb; color: #fff; }
      .ghost { background: #f1f5f9; }
      .code-row .ghost, .link-row .ghost { flex: none; }
      .danger-text { background: #fef2f2; color: #b91c1c; }
      .danger-btn { background: #dc2626; color: #fff; }
      .confirm { display: grid; gap: 8px; padding: 12px; border-radius: 12px; background: #eff6ff; border: 1px solid #bfdbfe; }
      .confirm.danger { background: #fef2f2; border-color: #fecaca; }
      .error { color: #b91c1c; }
      .done { margin-top: 4px; }
      @media (max-width: 400px) { .code { font-size: 1.6rem; } }
    `,
  ],
})
export class AnalystCodeModalComponent implements OnInit {
  private readonly api = inject(AnalystCodeService);

  readonly studentId = input.required<string>();
  readonly studentName = input('');
  readonly closed = output<void>();

  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly actionError = signal('');
  readonly busy = signal(false);
  readonly code = signal<AnalystCode | null>(null);
  readonly confirming = signal<Confirm>(null);
  readonly copied = signal<'code' | 'link' | null>(null);

  readonly display = formatAnalystCode;
  readonly expires = expiryDate;
  readonly link = (code: string) => analystShareLink(code);

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    try {
      this.code.set(await this.api.get(this.studentId()));
    } catch (err) {
      this.loadError.set(message(err, "Couldn't load the analyst code."));
    } finally {
      this.loading.set(false);
    }
  }

  create(): Promise<void> {
    return this.run(async () => this.code.set(await this.api.create(this.studentId())), "Couldn't create a code.");
  }

  /** Replaces the code; the old one stops working. */
  regenerate(): Promise<void> {
    return this.run(async () => this.code.set(await this.api.create(this.studentId())), "Couldn't make a new code.");
  }

  revoke(): Promise<void> {
    return this.run(async () => {
      await this.api.revoke(this.studentId());
      this.code.set(null);
    }, "Couldn't revoke the code.");
  }

  async copy(what: 'code' | 'link', text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(what);
      setTimeout(() => this.copied() === what && this.copied.set(null), 2000);
    } catch {
      this.actionError.set('Copying is blocked here; select the text and copy it instead.');
    }
  }

  private async run(action: () => Promise<void>, fallback: string): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.actionError.set('');
    try {
      await action();
      this.confirming.set(null);
      this.copied.set(null);
    } catch (err) {
      this.actionError.set(message(err, fallback));
    } finally {
      this.busy.set(false);
    }
  }
}

function message(err: unknown, fallback: string): string {
  const m = (err as { message?: string; code?: string })?.message;
  const code = (err as { code?: string })?.code;
  return m && code !== 'UNKNOWN' ? m : fallback;
}
