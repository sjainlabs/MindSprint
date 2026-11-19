import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface SignInChoice {
  icon: string;
  who: string;
  /** Who it's for and what they need, so a teacher and an analyst can tell their doors apart */
  what: string;
  action: string;
  path: string;
  query?: Record<string, string>;
}

/** The way in for each kind of visitor; what MindSprint is lives on the About and How it works tabs. */
@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="page">
      <section class="hero card">
        <h1>MindSprint</h1>
        <p class="pitch">
          Maths practice that finds where your child really is, from kindergarten to Grade 12, and grows them a
          little every day.
        </p>
      </section>

      <section class="card">
        <h2>Who are you?</h2>
        <ul class="choices">
          @for (c of choices; track c.who) {
            <li>
              <a class="choice" [routerLink]="c.path" [queryParams]="c.query ?? {}">
                <span class="icon" aria-hidden="true">{{ c.icon }}</span>
                <span class="text">
                  <span class="who">{{ c.who }}</span>
                  <span class="what">{{ c.what }}</span>
                </span>
                <span class="action">{{ c.action }} <span aria-hidden="true">→</span></span>
              </a>
            </li>
          }
        </ul>
      </section>
    </main>
  `,
  styles: [
    `
      .page { max-width: 760px; margin: 0 auto; padding: 16px; display: grid; gap: 16px; }
      .card { background: #fff; border-radius: 16px; padding: 20px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08); }
      h1, h2, p { margin: 0; }
      .hero { display: grid; gap: 10px; }
      .hero h1 { font-size: 2.2rem; color: #1e1b4b; }
      .pitch { font-size: 1.1rem; line-height: 1.5; color: #334155; }
      h2 { font-size: 1.2rem; color: #1e1b4b; margin-bottom: 12px; }

      .choices { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
      @media (min-width: 640px) { .choices { grid-template-columns: 1fr 1fr; } }
      .choice {
        height: 100%; box-sizing: border-box; display: grid; grid-template-columns: auto 1fr; grid-template-rows: 1fr auto;
        column-gap: 12px; row-gap: 10px; padding: 14px; border: 2px solid #e2e8f0; border-radius: 14px;
        text-decoration: none; color: inherit; background: #fff;
      }
      .choice:hover { border-color: #93c5fd; background: #f8fbff; }
      .choice:focus-visible { outline: 3px solid #6366f1; outline-offset: 2px; }
      .icon { grid-row: 1 / span 2; font-size: 1.8rem; line-height: 1.1; }
      .text { display: grid; gap: 4px; }
      .who { font-weight: 800; font-size: 1.05rem; color: #0f172a; }
      .what { font-size: 0.9rem; line-height: 1.45; color: #475569; }
      .action { justify-self: start; border-radius: 10px; padding: 8px 12px; background: #2563eb; color: #fff; font-weight: 700; font-size: 0.9rem; }
    `,
  ],
})
export class LandingPageComponent {
  readonly choices: SignInChoice[] = [
    {
      icon: '👪',
      who: 'Parent',
      what: 'Set up your children, get their login codes and follow their progress. Sign in with Google.',
      action: 'Parent sign in',
      path: '/auth/parent-login',
    },
    {
      icon: '🎒',
      who: 'Student',
      what: 'Practise and take tests. Use the 6-character code from your parent.',
      action: 'Enter my code',
      path: '/auth/access-code',
    },
    {
      icon: '👩‍🏫',
      who: 'Teacher or tutor',
      what: 'See the students parents have added you to and set them tests. Sign in with Google.',
      action: 'Teacher sign in',
      path: '/auth/parent-login',
      query: { role: 'teacher' },
    },
    {
      icon: '🔎',
      who: 'Analyst',
      what: 'View one child\'s report, read-only. No account needed: use the 8-character code a parent shared.',
      action: 'Enter analyst code',
      path: '/auth/analyst',
    },
  ];
}
