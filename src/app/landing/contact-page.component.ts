import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** The Contact tab: one email address, with a ready subject for the common reasons to write */
@Component({
  selector: 'app-contact-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="page">
      <section class="card head">
        <h1>✉️ Contact us</h1>
        <p>Questions, ideas or something not working? Email us; we read every message.</p>
        <a class="email" [href]="mailto('Hello from a MindSprint family')">{{ email }}</a>
      </section>

      <section class="card">
        <h2>What can we help with?</h2>
        <p class="muted">Pick one and your email app opens with the subject filled in.</p>
        <ul class="reasons">
          @for (r of reasons; track r.subject) {
            <li>
              <a [href]="mailto(r.subject, r.body)">
                <span class="icon" aria-hidden="true">{{ r.icon }}</span>
                <span><strong>{{ r.title }}</strong><span class="hint">{{ r.hint }}</span></span>
              </a>
            </li>
          }
        </ul>
      </section>

      <section class="card">
        <p class="muted">
          Looking for how things work first? See <a routerLink="/how-it-works">How it works</a>,
          including the questions parents ask most.
        </p>
      </section>
    </main>
  `,
  styles: [
    `
      .page { max-width: 760px; margin: 0 auto; padding: 16px; display: grid; gap: 16px; }
      .card { background: #fff; border-radius: 16px; padding: 20px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08); display: grid; gap: 10px; }
      h1, h2, p { margin: 0; }
      h1 { font-size: 1.5rem; color: #1e1b4b; }
      h2 { font-size: 1.1rem; color: #1e1b4b; }
      p { color: #334155; line-height: 1.55; }
      .muted { color: #64748b; font-size: 0.92rem; }
      .muted a { color: #1d4ed8; font-weight: 700; }
      .email { justify-self: start; max-width: 100%; overflow-wrap: anywhere; background: #2563eb; color: #fff; font-weight: 800; text-decoration: none; border-radius: 12px; padding: 12px 16px; }
      .email:focus-visible, .reasons a:focus-visible { outline: 3px solid #6366f1; outline-offset: 2px; }
      .reasons { list-style: none; margin: 4px 0 0; padding: 0; display: grid; gap: 8px; }
      .reasons a { display: flex; gap: 12px; align-items: flex-start; padding: 12px; border: 1px solid #e2e8f0; border-radius: 12px; color: #0f172a; text-decoration: none; }
      .reasons a:hover { border-color: #93c5fd; background: #f8fafc; }
      .icon { font-size: 1.3rem; line-height: 1.2; }
      .hint { display: block; color: #64748b; font-size: 0.88rem; margin-top: 2px; }
    `,
  ],
})
export class ContactPageComponent {
  readonly email = 'sjlabs.mindsprint@gmail.com';

  readonly reasons = [
    { icon: '🔓', title: 'Unlock more practice', hint: 'The free trial has ended, or you want to add more children.',
      subject: 'MindSprint free trial', body: "My child's name:\nWhat I'd like:\n" },
    { icon: '📈', title: "A question about my child's plan", hint: 'Their level, focus topics or a suggested update.',
      subject: "Question about my child's plan", body: "My child's name:\nMy question:\n" },
    { icon: '🐞', title: 'Something isn’t working', hint: 'Tell us what you did and what happened; a screenshot helps.',
      subject: 'Something isn’t working in MindSprint', body: 'What I was doing:\nWhat happened:\nPhone or computer, and browser:\n' },
    { icon: '🧑‍🏫', title: 'Teachers and tutors', hint: 'Using MindSprint with your students.',
      subject: 'MindSprint for teachers', body: '' },
    { icon: '💡', title: 'Ideas and feedback', hint: 'What would make MindSprint better for your family.',
      subject: 'Feedback on MindSprint', body: '' },
  ];

  mailto(subject: string, body = ''): string {
    return `mailto:${this.email}?subject=${encodeURIComponent(subject)}${body ? `&body=${encodeURIComponent(body)}` : ''}`;
  }
}
