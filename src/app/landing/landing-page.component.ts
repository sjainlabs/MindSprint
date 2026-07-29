import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="page">
      <section class="hero card">
        <h1>MindSprint</h1>
        <p>Simple learning flow: grade, topics, diagnostic, practice, and tests.</p>
        <div class="actions">
          <a routerLink="/auth/parent-login" class="button primary">Parent Login</a>
          <a routerLink="/auth/access-code" class="button">Enter Access Code</a>
        </div>
      </section>
    </main>
  `,
  styles: [
    `
      .page { max-width: 720px; margin: 0 auto; padding: 16px; display: grid; gap: 16px; }
      .card { background: #fff; border-radius: 16px; padding: 20px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08); }
      .hero h1 { font-size: 2rem; margin: 0 0 8px; }
      .hero p { margin: 0 0 16px; color: #334155; }
      .actions { display: grid; gap: 12px; }
      .button { text-align: center; border: 1px solid #cbd5e1; border-radius: 12px; padding: 14px; text-decoration: none; color: #0f172a; font-weight: 700; }
      .button.primary { background: #2563eb; border-color: #2563eb; color: #fff; }
    `,
  ],
})
export class LandingPageComponent {}
