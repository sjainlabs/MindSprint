import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PracticeTopicCatalogService } from '../services/practice-topic-catalog.service';
import { LearningPlanService, PlanProposal, ProposalAction } from '../services/learning-plan.service';

/**
 * A suggested plan update from the bi-weekly analysis, on the learning plan for the parent and
 * teachers. Accept applies the proposed focus; Suggest changes sends a comment for the next analysis.
 */
@Component({
  selector: 'app-proposal-card',
  standalone: true,
  imports: [DatePipe],
  template: `
    @if (proposal(); as p) {
      <section class="card proposal" aria-labelledby="proposal-title">
        <div class="row-between">
          <h2 id="proposal-title">📝 Suggested plan update</h2>
          <span class="tag" [class.waiting]="p.status === 'open'">{{ p.status === 'open' ? 'Waiting for review' : 'Under review' }}</span>
        </div>
        @if (p.status === 'changes-requested') {
          <p class="under-review" role="status">
            ⏳ Thanks{{ lastComment()?.name ? ', ' + firstName(lastComment()!.name) : '' }}. Your suggestion and this proposal are under review.
            @if (replyIn(); as r) {
              We'll reply here with an updated proposal. Check back {{ r.hours <= 1 ? 'in about an hour' : 'in about ' + r.hours + ' hours' }} ({{ r.by | date: 'EEE d MMM, h:mm a' }}).
            } @else {
              We'll reply here with an updated proposal soon.
            }
          </p>
        }
        @if (p.reply) {
          <div class="reply">
            <h3>💬 Our reply to your suggestion</h3>
            <p>{{ p.reply }}</p>
          </div>
        }
        <p class="muted small">From the progress analysis on {{ p.createdAt | date: 'd MMM' }}{{ p.from ? ', covering ' + (p.from | date: 'd MMM') + ' – ' + (p.to | date: 'd MMM') : '' }}.</p>

        @for (para of paragraphs(); track $index) { <p class="report">{{ para }}</p> }

        @if (p.findings.length) {
          <h3>What we found</h3>
          <ul class="findings">@for (f of p.findings; track $index) { <li>{{ f }}</li> }</ul>
        }

        <h3>Proposed focus</h3>
        @if (p.proposedFocus.note) { <p class="note">🎯 {{ p.proposedFocus.note }}</p> }
        <ol class="topics">@for (name of focusNames(); track $index) { <li>{{ name }}</li> }</ol>

        @if (p.feedback.length) {
          <h3>Comments</h3>
          <ul class="feedback">
            @for (f of p.feedback; track f.at) {
              <li><strong>{{ f.name || (f.role === 'teacher' ? 'Teacher' : 'Parent') }}</strong>: {{ f.comment || actionText(f.action) }} <span class="muted small">{{ f.at | date: 'd MMM' }}</span></li>
            }
          </ul>
        }

        @if (commenting()) {
          <label class="label" for="proposal-comment">What would you change?</label>
          <textarea id="proposal-comment" rows="3" maxlength="1000" [value]="comment()" (input)="comment.set($any($event.target).value)"
                    placeholder="e.g. Add estimating products too; she finds that hard"></textarea>
        }
        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }

        <div class="actions">
          @if (commenting()) {
            <button type="button" class="btn primary" [disabled]="busy() || !comment().trim()" (click)="respond('comment')">Send comment</button>
            <button type="button" class="btn" [disabled]="busy()" (click)="commenting.set(false)">Cancel</button>
          } @else {
            <button type="button" class="btn primary" [disabled]="busy()" (click)="respond('accept')">✓ Accept and apply</button>
            <button type="button" class="btn" [disabled]="busy()" (click)="commenting.set(true)">💬 Suggest changes</button>
            <button type="button" class="btn ghost" [disabled]="busy()" (click)="respond('decline')">Decline</button>
          }
        </div>
      </section>
    }
  `,
  styleUrls: ['../tests/test-pages.css', './plan-shared.css'],
  styles: [
    `
      .proposal { border: 2px solid #fcd34d; background: #fffdf5; }
      h2, h3, p { margin: 0; }
      h3 { font-size: 0.95rem; color: #334155; margin-top: 12px; }
      .report { margin-top: 8px; color: #1e293b; line-height: 1.55; }
      .findings, .feedback { margin: 6px 0 0; padding-left: 20px; display: grid; gap: 4px; color: #334155; list-style: disc; }
      .topics { margin: 6px 0 0; padding-left: 22px; list-style: decimal; display: grid; gap: 2px; font-weight: 600; color: #1e293b; }
      .note { margin-top: 6px; font-weight: 700; color: #1e1b4b; }
      .tag { border-radius: 999px; padding: 2px 10px; font-size: 0.8rem; font-weight: 700; background: #fef3c7; color: #92400e; white-space: nowrap; }
      .label { display: block; margin-top: 12px; font-weight: 700; font-size: 0.9rem; }
      textarea { width: 100%; box-sizing: border-box; margin-top: 6px; border: 2px solid #cbd5e1; border-radius: 12px; padding: 10px; font: inherit; }
      textarea:focus { outline: none; border-color: #2563eb; }
      .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
      .error { color: #b91c1c; margin-top: 8px; }
      .under-review { margin-top: 10px; padding: 10px 12px; border-radius: 12px; background: #eff6ff; border: 1px solid #bfdbfe; color: #1e3a8a; line-height: 1.5; }
      .reply { margin-top: 10px; padding: 10px 12px; border-radius: 12px; background: #f0fdf4; border: 1px solid #bbf7d0; }
      .reply h3 { margin-top: 0; color: #14532d; }
      .reply p { margin-top: 4px; color: #14532d; line-height: 1.5; }
    `,
  ],
})
export class ProposalCardComponent implements OnInit {
  private readonly api = inject(LearningPlanService);
  private readonly catalog = inject(PracticeTopicCatalogService);

  readonly studentId = input.required<string>();
  /** Accepted: the focus changed, so the plan reloads */
  readonly applied = output<void>();

  readonly proposal = signal<PlanProposal | null>(null);
  readonly names = signal<Map<string, string>>(new Map());
  readonly commenting = signal(false);
  readonly comment = signal('');
  readonly busy = signal(false);
  readonly error = signal('');

  readonly paragraphs = computed(() => (this.proposal()?.report ?? '').split(/\n\s*\n/).map((p) => p.replace(/[*_#`]/g, '').trim()).filter(Boolean));
  /** The latest comment, which the next reply run answers */
  readonly lastComment = computed(() => [...(this.proposal()?.feedback ?? [])].reverse().find((f) => f.action === 'comment') ?? null);
  /** When to check back: hours from now until the reply run is done */
  readonly replyIn = computed(() => {
    const by = this.lastComment()?.replyBy;
    if (!by) return null;
    const hours = Math.max(1, Math.ceil((Date.parse(by) - Date.now()) / 3_600_000));
    return Date.parse(by) > Date.now() ? { hours, by } : null;
  });
  readonly focusNames = computed(() => (this.proposal()?.proposedFocus.topicIds ?? []).map((id) => this.names().get(id.toLowerCase()) ?? id));

  async ngOnInit(): Promise<void> {
    try {
      const proposals = await this.api.proposals(this.studentId());
      this.proposal.set(proposals.find((p) => p.status === 'open' || p.status === 'changes-requested') ?? null);
      if (this.proposal()) {
        await this.catalog.loadMergedCatalogAsync();
        this.names.set(new Map(this.catalog.getCatalog().map((t) => [t.id.toLowerCase(), t.name])));
      }
    } catch {
      // No proposals to show (or not signed in as an adult): the card stays hidden
    }
  }

  firstName(name: string): string {
    const first = name.trim().split(/\s+/)[0] ?? '';
    return first.charAt(0).toUpperCase() + first.slice(1);
  }

  actionText(action: ProposalAction): string {
    return action === 'accept' ? 'Accepted' : action === 'decline' ? 'Declined' : '';
  }

  async respond(action: ProposalAction): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      const updated = await this.api.respondToProposal(this.studentId(), this.proposal()!.id, action, action === 'comment' ? this.comment().trim() : '');
      this.commenting.set(false);
      this.comment.set('');
      this.proposal.set(updated.status === 'open' || updated.status === 'changes-requested' ? updated : null);
      if (action === 'accept') this.applied.emit();
    } catch (err) {
      this.error.set(err instanceof Error && err.message ? err.message : "Couldn't save that. Please try again.");
    } finally {
      this.busy.set(false);
    }
  }
}
