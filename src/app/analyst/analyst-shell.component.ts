import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AnalystSessionService } from './analyst-session.service';
import { expiryDate } from './analyst-code';

/** The analyst's whole app: who they're viewing, two tabs, and Exit. Nothing links out of it. */
@Component({
  selector: 'app-analyst-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="an-shell">
      <header class="an-head">
        <div class="an-title">
          <h1>Viewing {{ name() }}'s progress</h1>
          <p>
            <span class="pill">👁 read-only</span>
            @if (until()) { <span>· access until {{ until() }}</span> }
          </p>
        </div>
        <button type="button" class="exit" (click)="exit()">Exit</button>
      </header>
      <nav class="an-tabs" aria-label="Report sections">
        <a routerLink="plan" routerLinkActive="active" ariaCurrentWhenActive="page">📋 Learning plan</a>
        <a routerLink="insights" routerLinkActive="active" ariaCurrentWhenActive="page">📈 Insights</a>
      </nav>
      <router-outlet />
    </div>
  `,
  styles: [
    `
      .an-shell { max-width: 860px; margin: 0 auto; padding: 12px 16px 0; display: grid; gap: 10px; }
      .an-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
      .an-title { min-width: 0; }
      h1 { margin: 0; font-size: 1.4rem; font-weight: 800; color: #1e1b4b; overflow-wrap: anywhere; }
      .an-title p { margin: 4px 0 0; display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; color: #475569; font-size: 0.88rem; font-weight: 700; }
      .pill { background: #ede9fe; color: #4c1d95; border-radius: 999px; padding: 2px 10px; font-size: 0.8rem; font-weight: 800; }
      .exit { border: 0; border-radius: 12px; padding: 10px 16px; font-weight: 800; background: #f1f5f9; color: #0f172a; cursor: pointer; flex: none; min-height: 40px; }
      .exit:hover { background: #e2e8f0; }
      .an-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; background: #ede9fe; padding: 5px; border-radius: 16px; }
      .an-tabs a { text-align: center; text-decoration: none; font-weight: 800; color: #4c1d95; padding: 10px 4px; border-radius: 12px; font-size: 0.95rem; }
      .an-tabs a.active { background: #fff; color: #1e1b4b; box-shadow: 0 2px 8px rgba(76, 29, 149, 0.15); }
    `,
  ],
})
export class AnalystShellComponent {
  private readonly sessions = inject(AnalystSessionService);
  private readonly router = inject(Router);

  readonly name = computed(() => this.sessions.session()?.studentName || 'Student');
  readonly until = computed(() => {
    const s = this.sessions.session();
    return s ? expiryDate(s.expiresAt) : '';
  });

  exit(): void {
    this.sessions.clear();
    void this.router.navigate(['/auth/analyst'], { replaceUrl: true });
  }
}
