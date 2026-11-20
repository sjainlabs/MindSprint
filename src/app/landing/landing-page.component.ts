import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface SignInChoice {
  icon: string;
  who: string;
  /** What they need to sign in, so a teacher and an analyst can tell their doors apart */
  what: string;
  path: string;
  query?: Record<string, string>;
}

interface Reason {
  icon: string;
  title: string;
  text: string;
  link: { label: string; path: string };
}

/**
 * The front door. New parents get the promise and one clear "get started"; everyone who already has an
 * account signs in from the panel beside it (below it on phones), so nobody scrolls to log in. The
 * detail lives on the About and How it works tabs.
 */
@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="page">
      <!-- 1. Promise + sign-in, both on the first screen -->
      <section class="hero">
        <div class="pitch">
          <p class="eyebrow">Maths practice for kindergarten to Grade 12</p>
          <h1>Find where your child really is in maths, and grow them a little every day.</h1>
          <p class="sub">
            A 10-minute check finds their level. A daily plan builds from there. Every two weeks, AI looks at
            <em>why</em> they lose marks and suggests what to work on next, and you decide.
          </p>
          <div class="ctas">
            <a routerLink="/auth/parent-login" class="btn primary">Get started as a parent</a>
            <a routerLink="/how-it-works" class="btn ghost">See how it works</a>
          </div>
          <ul class="facts" aria-label="At a glance">
            <li>📚 340+ topics, CBSE K–12</li>
            <li>🧭 10-minute skill check</li>
            <li>📱 Phone, tablet or computer</li>
          </ul>
        </div>

        <aside class="signin" aria-labelledby="signin-title">
          <h2 id="signin-title">Sign in</h2>
          <ul>
            @for (c of choices; track c.who) {
              <li>
                <a class="choice" [routerLink]="c.path" [queryParams]="c.query ?? {}">
                  <span class="icon" aria-hidden="true">{{ c.icon }}</span>
                  <span class="text">
                    <span class="who">{{ c.who }}</span>
                    <span class="what">{{ c.what }}</span>
                  </span>
                  <span class="go" aria-hidden="true">→</span>
                </a>
              </li>
            }
          </ul>
        </aside>
      </section>

      <!-- 2. Why MindSprint -->
      <section class="reasons" aria-labelledby="why-title">
        <h2 id="why-title">Why families choose MindSprint</h2>
        <ul>
          @for (r of reasons; track r.title) {
            <li class="reason" [class.highlight]="r.icon === '🧠'">
              <span class="r-icon" aria-hidden="true">{{ r.icon }}</span>
              <h3>{{ r.title }}</h3>
              <p>{{ r.text }}</p>
              <a [routerLink]="r.link.path" class="more">{{ r.link.label }} →</a>
            </li>
          }
        </ul>
      </section>

      <!-- 3. Getting started -->
      <section class="steps-band" aria-labelledby="steps-title">
        <h2 id="steps-title">Get started in 3 steps</h2>
        <ol>
          @for (s of steps; track s.title; let i = $index) {
            <li>
              <span class="num" aria-hidden="true">{{ i + 1 }}</span>
              <div>
                <h3>{{ s.title }}</h3>
                <p>{{ s.text }}</p>
              </div>
            </li>
          }
        </ol>
      </section>

      <!-- 4. Last call -->
      <section class="final">
        <h2>Ready to find your child's level?</h2>
        <p>Set up takes two minutes. Your child can start their skill check today.</p>
        <a routerLink="/auth/parent-login" class="btn primary">Get started as a parent</a>
      </section>

      <footer class="footer">
        <nav aria-label="More about MindSprint">
          <a routerLink="/about">About MindSprint</a>
          <a routerLink="/how-it-works">How it works</a>
          <a routerLink="/contact">Contact us</a>
        </nav>
        <p>© {{ year }} MindSprint</p>
      </footer>
    </main>
  `,
  styles: [
    `
      :host { display: block; }
      .page { max-width: 1080px; margin: 0 auto; padding: 8px 16px 32px; display: grid; gap: 28px; }
      h1, h2, h3, p { margin: 0; }
      a:focus-visible { outline: 3px solid #6366f1; outline-offset: 2px; }

      /* Buttons */
      .btn { display: inline-flex; align-items: center; justify-content: center; min-height: 48px; padding: 0 20px; border-radius: 12px; font-weight: 800; text-decoration: none; }
      .btn.primary { background: #2563eb; color: #fff; box-shadow: 0 6px 16px rgba(37, 99, 235, 0.25); }
      .btn.primary:hover { background: #1d4ed8; }
      .btn.ghost { background: #fff; color: #1e3a8a; border: 2px solid #c7d2fe; }
      .btn.ghost:hover { border-color: #93c5fd; }

      /* 1. Hero: pitch beside sign-in on wide screens, stacked on phones */
      .hero { display: grid; gap: 20px; align-items: start; }
      @media (min-width: 900px) { .hero { grid-template-columns: minmax(0, 1.35fr) minmax(300px, 1fr); gap: 32px; padding-top: 12px; } }
      .pitch { display: grid; gap: 16px; padding: 8px 0; }
      .eyebrow { font-size: 0.85rem; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: #4f46e5; }
      h1 { font-size: clamp(1.75rem, 4.2vw, 2.6rem); line-height: 1.15; color: #1e1b4b; letter-spacing: -0.01em; }
      .sub { font-size: 1.08rem; line-height: 1.6; color: #334155; max-width: 60ch; }
      .sub em { font-style: normal; font-weight: 800; color: #4f46e5; }
      .ctas { display: flex; flex-wrap: wrap; gap: 10px; }
      .facts { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
      .facts li { padding: 6px 12px; border-radius: 999px; background: rgba(255, 255, 255, 0.85); border: 1px solid #e0e7ff; font-size: 0.85rem; font-weight: 600; color: #334155; }

      .signin { background: #fff; border-radius: 18px; padding: 18px; box-shadow: 0 12px 32px rgba(15, 23, 42, 0.1); border: 1px solid #e2e8f0; }
      .signin h2 { font-size: 1.1rem; color: #1e1b4b; margin-bottom: 10px; }
      .signin ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
      .choice { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 12px; border: 2px solid #eef2ff; text-decoration: none; color: inherit; min-height: 44px; }
      .choice:hover { border-color: #93c5fd; background: #f8fbff; }
      .icon { flex: none; font-size: 1.5rem; }
      .text { display: grid; gap: 2px; min-width: 0; flex: 1; }
      .who { font-weight: 800; color: #0f172a; }
      .what { font-size: 0.82rem; color: #64748b; line-height: 1.35; }
      .go { flex: none; font-weight: 800; color: #2563eb; }

      /* Phones and tablets: sign-in fits on the first screen as a 2 × 2 grid, and the fact chips step aside */
      @media (max-width: 899px) {
        .signin ul { grid-template-columns: 1fr 1fr; }
        .choice { flex-direction: column; align-items: flex-start; gap: 4px; padding: 10px; }
        .go { display: none; }
        .what { font-size: 0.75rem; }
      }
      @media (max-width: 599px) {
        .facts { display: none; }
        .pitch { gap: 12px; }
        .sub { font-size: 1rem; }
      }

      /* 2. Reasons */
      .reasons h2, .steps-band h2 { font-size: 1.4rem; color: #1e1b4b; margin-bottom: 14px; }
      .reasons ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; }
      @media (min-width: 760px) { .reasons ul { grid-template-columns: repeat(3, 1fr); } }
      .reason { display: grid; gap: 8px; align-content: start; background: #fff; border-radius: 16px; padding: 18px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06); border: 1px solid #eef2ff; }
      .reason.highlight { border: 2px solid #c7d2fe; background: linear-gradient(180deg, #f5f3ff 0%, #ffffff 75%); }
      .r-icon { font-size: 1.8rem; }
      .reason h3 { font-size: 1.05rem; color: #0f172a; }
      .reason p { color: #475569; line-height: 1.55; font-size: 0.95rem; }
      .more { color: #1d4ed8; font-weight: 700; text-decoration: none; font-size: 0.92rem; }
      .more:hover { text-decoration: underline; }

      /* 3. Steps */
      .steps-band { background: #fff; border-radius: 18px; padding: 20px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06); }
      .steps-band ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 16px; }
      @media (min-width: 760px) { .steps-band ol { grid-template-columns: repeat(3, 1fr); } }
      .steps-band li { display: flex; gap: 12px; align-items: flex-start; }
      .num { flex: none; display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; background: #2563eb; color: #fff; font-weight: 800; }
      .steps-band h3 { font-size: 1rem; color: #0f172a; margin-bottom: 4px; }
      .steps-band p { color: #475569; line-height: 1.5; font-size: 0.93rem; }

      /* 4. Final call */
      .final { display: grid; justify-items: center; gap: 10px; text-align: center; padding: 28px 16px; border-radius: 18px; background: linear-gradient(135deg, #1e3a8a 0%, #4f46e5 100%); color: #fff; }
      .final h2 { font-size: 1.4rem; }
      .final p { color: #e0e7ff; }
      .final .btn.primary { background: #fff; color: #1e3a8a; box-shadow: none; margin-top: 6px; }
      .final .btn.primary:hover { background: #eef2ff; }

      /* Footer: the places public sites keep About (and later privacy and contact) */
      .footer { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; padding: 4px 4px 0; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 0.9rem; color: #64748b; }
      .footer nav { display: flex; flex-wrap: wrap; gap: 16px; }
      .footer a { color: #334155; font-weight: 600; text-decoration: none; }
      .footer a:hover { text-decoration: underline; }
    `,
  ],
})
export class LandingPageComponent {
  readonly year = new Date().getFullYear();
  readonly choices: SignInChoice[] = [
    { icon: '👪', who: 'Parent', what: 'Sign in with Google', path: '/auth/parent-login' },
    { icon: '🎒', who: 'Student', what: 'Enter the 6-character code from your parent', path: '/auth/access-code' },
    { icon: '👩‍🏫', who: 'Teacher or tutor', what: 'Sign in with Google to see your students', path: '/auth/parent-login', query: { role: 'teacher' } },
    { icon: '🔎', who: 'Analyst', what: 'Read-only report with an 8-character code', path: '/auth/analyst' },
  ];

  readonly reasons: Reason[] = [
    {
      icon: '🧭',
      title: 'Starts at the right level',
      text: 'School grade and maths level often differ. A short check places your child in each area of maths, even years ahead or behind, so practice is never too easy or too hard.',
      link: { label: 'About the skill check', path: '/about' },
    },
    {
      icon: '🧠',
      title: 'AI that finds the why',
      text: 'Every two weeks, AI reviews your child\'s answers and finds the skill underneath the mistakes. If long division keeps going wrong, the real gap is often the multiplying inside it, so the plan builds that first.',
      link: { label: 'How the analysis works', path: '/about' },
    },
    {
      icon: '🤝',
      title: 'You stay in charge',
      text: 'Nothing changes in the plan until you or their teacher approve it. See every worksheet, test and minute practised, add a teacher or tutor, and set your own tests and rewards.',
      link: { label: 'The parent guide', path: '/how-it-works' },
    },
  ];

  readonly steps = [
    { title: 'Add your child', text: 'Sign in with Google and add your child with their school grade. They get a 6-character login code.' },
    { title: 'Find their skill band', text: 'About 20 questions, no timer. Their plan and Daily Challenge start from what they show.' },
    { title: 'A little every day', text: 'A few minutes of Daily Challenge and worksheets. You see progress, and approve each new focus.' },
  ];
}
