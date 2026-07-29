import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-diagnostic-result-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="page">
      <section class="card">
        <h1>Diagnostic Result</h1>
        <p class="score">{{ score() }}%</p>
        <p *ngIf="score() === 100">Great job! You can move to Grade {{ nextGrade() }}.</p>

        <div class="actions">
          <a routerLink="/practice/hub" class="button primary">Continue to Grade {{ nextGrade() }}</a>
          <a routerLink="/practice/hub" class="button">Practice Previous Concepts</a>
          <a routerLink="/practice/hub" class="button">Explore Advanced Concepts</a>
        </div>
      </section>
    </main>
  `,
  styles: [
    `
      .page { max-width: 640px; margin: 0 auto; padding: 16px; }
      .card { background: #fff; border-radius: 16px; padding: 16px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08); display: grid; gap: 12px; }
      .score { font-size: 3rem; font-weight: 800; color: #1d4ed8; margin: 0; }
      .actions { display: grid; gap: 8px; }
      .button { border-radius: 12px; padding: 12px; text-decoration: none; text-align: center; background: #e2e8f0; color: #0f172a; font-weight: 700; }
      .primary { background: #2563eb; color: #fff; }
      h1, p { margin: 0; }
    `,
  ],
})
export class DiagnosticResultPageComponent {
  private readonly route = inject(ActivatedRoute);

  readonly score = computed(() => Number(this.route.snapshot.queryParamMap.get('score') ?? '0'));
  readonly nextGrade = computed(() => this.route.snapshot.queryParamMap.get('nextGrade') ?? '5');
}
