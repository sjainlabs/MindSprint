import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AboutContentComponent } from './about-content.component';

/** The About tab: what MindSprint is, what it solves, and a way in. */
@Component({
  selector: 'app-about-page',
  standalone: true,
  imports: [RouterLink, AboutContentComponent],
  template: `
    <main class="page">
      <section class="card head">
        <h1>ℹ️ About MindSprint</h1>
        <p>
          MindSprint is a maths practice app for children from kindergarten to Grade 12. It finds where each child
          really is, gives them a plan and a few minutes of practice every day, and shows parents and teachers how
          they're doing.
        </p>
      </section>
      <app-about-content />
      <section class="card cta">
        <a routerLink="/auth/parent-login" class="button primary">👪 Get started as a parent</a>
      </section>
    </main>
  `,
  styles: [
    `
      .page { max-width: 760px; margin: 0 auto; padding: 16px; display: grid; gap: 16px; }
      .card { background: #fff; border-radius: 16px; padding: 20px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08); }
      h1, p { margin: 0; }
      .head { display: grid; gap: 10px; }
      h1 { font-size: 1.5rem; color: #1e1b4b; }
      p { color: #334155; line-height: 1.55; }
      .cta { display: grid; gap: 12px; }
      .button { display: block; text-align: center; border: 1px solid #cbd5e1; border-radius: 12px; padding: 14px; text-decoration: none; color: #0f172a; font-weight: 700; }
      .button.primary { background: #2563eb; border-color: #2563eb; color: #fff; }
      .button:focus-visible { outline: 3px solid #6366f1; outline-offset: 2px; }
    `,
  ],
})
export class AboutPageComponent {}
