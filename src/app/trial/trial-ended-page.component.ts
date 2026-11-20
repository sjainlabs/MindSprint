import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

/** Shown when the free trial stops a request: no new work, or (90 days on) no reports either */
@Component({
  selector: 'app-trial-ended-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="page">
      <section class="card">
        <h1>🔒 {{ closed ? 'Reports are closed' : 'Your free trial has ended' }}</h1>
        <p>{{ message || (closed
          ? 'The free trial ended more than 90 days ago, so reports are closed.'
          : 'You have used the free trial (10 hours or 30 sheets). Reports and history stay open for 90 days.') }}</p>
        <p>To unlock more practice, email the admin:</p>
        <a class="btn primary" href="mailto:sjlabs.mindsprint@gmail.com?subject=MindSprint%20free%20trial">sjlabs.mindsprint&#64;gmail.com</a>
        <a class="link" routerLink="/">Back to home</a>
      </section>
    </main>
  `,
  styles: [
    `
      .page { max-width: 560px; margin: 0 auto; padding: 16px; }
      .card { background: #fff; border-radius: 16px; padding: 20px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08); display: grid; gap: 12px; }
      h1, p { margin: 0; }
      p { color: #334155; line-height: 1.55; }
      .btn { display: inline-flex; justify-content: center; align-items: center; min-height: 48px; border-radius: 12px; background: #2563eb; color: #fff; font-weight: 800; text-decoration: none; }
      .link { color: #1d4ed8; font-weight: 700; text-decoration: none; text-align: center; }
    `,
  ],
})
export class TrialEndedPageComponent {
  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;
  readonly closed = this.query.get('reason') === 'REPORTS_CLOSED';
  readonly message = this.query.get('message') ?? '';
}
