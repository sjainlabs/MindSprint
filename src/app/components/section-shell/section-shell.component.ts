import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

export interface SectionTab {
  path: string;
  label: string;
}

export interface SectionShellData {
  title: string;
  tabs: SectionTab[];
}

/** A section heading with tabs over one outlet (Math Brain, Math Games). Title and tabs come from the route's data. */
@Component({
  selector: 'app-section-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="mb-shell">
      <header class="mb-head">
        <h1>{{ data.title }}</h1>
        <nav class="mb-tabs" [class.single]="data.tabs.length === 1" [style.--tab-count]="data.tabs.length" [attr.aria-label]="data.title + ' sections'">
          @for (tab of data.tabs; track tab.path) {
            <!-- exact, so a tab's own sub-pages (e.g. abacus/parent) don't light it up -->
            <a [routerLink]="tab.path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" ariaCurrentWhenActive="page">{{ tab.label }}</a>
          }
        </nav>
      </header>
      <router-outlet />
    </div>
  `,
  styles: [
    `
      .mb-shell { max-width: 860px; margin: 0 auto; padding: 12px 16px 0; display: grid; gap: 4px; }
      .mb-head { display: grid; gap: 10px; }
      h1 { margin: 0; font-size: 1.5rem; font-weight: 800; color: #1e1b4b; }
      .mb-tabs {
        display: grid;
        grid-template-columns: repeat(var(--tab-count, 3), minmax(0, 1fr));
        gap: 6px;
        background: #ede9fe;
        padding: 5px;
        border-radius: 16px;
      }
      /* One game so far: a short tab, not a full-width bar. */
      .mb-tabs.single { grid-template-columns: minmax(0, 12rem); justify-self: start; }
      .mb-tabs a {
        text-align: center;
        text-decoration: none;
        font-weight: 800;
        color: #4c1d95;
        padding: 10px 4px;
        border-radius: 12px;
        font-size: 0.95rem;
        display: grid;
        place-items: center;
      }
      .mb-tabs a.active { background: #fff; color: #1e1b4b; box-shadow: 0 2px 8px rgba(76, 29, 149, 0.15); }
      @media (max-width: 420px) { .mb-tabs a { font-size: 0.82rem; } }
    `,
  ],
})
export class SectionShellComponent {
  readonly data = inject(ActivatedRoute).snapshot.data as SectionShellData;
}
