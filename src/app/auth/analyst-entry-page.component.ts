import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AnalystApiService, analystErrorMessage } from '../analyst/analyst-api.service';
import { AnalystSessionService } from '../analyst/analyst-session.service';
import { ANALYST_CODE_LENGTH, expiryDate, formatAnalystCode, normalizeAnalystCode } from '../analyst/analyst-code';
import { EXPIRED_QUERY } from '../analyst/analyst.interceptor';

/** Where an analyst types (or follows a link with) the code a parent shared. */
@Component({
  selector: 'app-analyst-entry-page',
  standalone: true,
  template: `
    <main class="page">
      <div class="header">
        <button type="button" class="back-btn" (click)="goBack()">← Back</button>
        <h2>Analyst access</h2>
      </div>

      <section class="card">
        @if (notice()) {
          <p class="notice" role="status">{{ notice() }}</p>
        }

        @if (existing(); as s) {
          <div class="resume">
            <p>You're viewing <strong>{{ s.studentName || 'a student' }}</strong>'s report until {{ until(s.expiresAt) }}.</p>
            <button type="button" class="submit-btn resume-btn" (click)="resume()">Continue to the report</button>
          </div>
        }

        <form (submit)="$event.preventDefault(); submit()">
          <label class="subtitle" for="analyst-code">Enter the 8-character code a parent shared with you.</label>
          <input
            id="analyst-code"
            class="code-input"
            type="text"
            autocomplete="off"
            autocapitalize="characters"
            spellcheck="false"
            maxlength="9"
            placeholder="ABCD-EFGH"
            [value]="code()"
            [disabled]="busy()"
            (input)="onInput($event)"
          />

          @if (error()) {
            <p class="error" role="alert">{{ error() }}</p>
          }

          <button type="submit" class="submit-btn" [disabled]="!valid() || busy()">
            {{ busy() ? 'Checking…' : 'View report' }}
          </button>
        </form>

        <p class="fine">Read-only: you'll see one child's learning plan and insights.</p>
      </section>
    </main>
  `,
  styleUrls: ['./access-code-page.component.css'],
  styles: [
    `
      .code-input { text-transform: uppercase; letter-spacing: 4px; }
      .notice { margin: 0 0 16px; background: #fff7ed; border: 1px solid #fed7aa; color: #9a3412; border-radius: 12px; padding: 10px 12px; }
      .resume { margin: 0 0 20px; padding: 0 0 20px; border-bottom: 1px solid #e2e8f0; color: #334155; }
      .resume p { margin: 0; }
      .resume-btn { margin-top: 12px; background: #eef2ff; color: #3730a3; }
      label.subtitle { display: block; }
      .fine { margin: 16px 0 0; color: #64748b; font-size: 0.85rem; text-align: center; }
    `,
  ],
})
export class AnalystEntryPageComponent implements OnInit {
  private readonly api = inject(AnalystApiService);
  private readonly sessions = inject(AnalystSessionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly code = signal('');
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly valid = computed(() => normalizeAnalystCode(this.code()).length === ANALYST_CODE_LENGTH);
  /** A code checked earlier in this tab that still works. */
  readonly existing = computed(() => (this.busy() ? null : this.sessions.session()));
  readonly until = expiryDate;

  ngOnInit(): void {
    const query = this.route.snapshot.queryParamMap;
    if (query.has(EXPIRED_QUERY)) this.notice.set('This access code has expired or was revoked.');
    const fromLink = query.get('code');
    if (fromLink) {
      this.code.set(formatAnalystCode(fromLink));
      if (this.valid()) void this.submit();
    }
  }

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.code.set(formatAnalystCode(input.value));
    // Keep the field in step when the formatting changed what was typed.
    if (input.value !== this.code()) input.value = this.code();
    this.error.set('');
  }

  async submit(): Promise<void> {
    if (!this.valid() || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const session = await this.api.startSession(this.code());
      this.sessions.save(session);
      await this.router.navigate(['/analyst/plan'], { replaceUrl: true });
    } catch (err) {
      this.error.set(analystErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  resume(): void {
    void this.router.navigate(['/analyst/plan']);
  }

  goBack(): void {
    void this.router.navigate(['/']);
  }
}
