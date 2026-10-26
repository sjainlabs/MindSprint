import { Component, Input, computed, signal } from '@angular/core';

type Part =
  | { kind: 'text'; value: string }
  | { kind: 'frac'; whole?: string; num: string; den: string; raw: string };

// "2 1/4" (mixed) or "3/4". Not part of a longer token like a date "12/05/2024" or a URL.
const FRACTION = /(?<![\d/])(?:(\d+) )?(\d+)\/(\d+)(?![\d/])/g;

/** Splits text into plain runs and fractions. Exported for tests. */
export function splitFractions(text: string): Part[] {
  const parts: Part[] = [];
  let last = 0;
  for (const m of text.matchAll(FRACTION)) {
    const start = m.index ?? 0;
    if (start > last) parts.push({ kind: 'text', value: text.slice(last, start) });
    parts.push({ kind: 'frac', whole: m[1], num: m[2], den: m[3], raw: m[0] });
    last = start + m[0].length;
  }
  if (last < text.length) parts.push({ kind: 'text', value: text.slice(last) });
  return parts;
}

/**
 * Renders study-guide text as given, but shows a/b and mixed numbers as stacked fractions.
 * Screen readers get the original "3/4" text; the stacked version is visual only.
 */
@Component({
  selector: 'app-math-text',
  standalone: true,
  template: `
    @for (p of parts(); track $index) {
      @if (p.kind === 'text') {
        <ng-container>{{ p.value }}</ng-container>
      } @else {
        <span class="mt-frac-wrap">
          <span class="mt-sr">{{ p.raw }}</span>
          <span class="mt-visual" aria-hidden="true">
            @if (p.whole) {
              <span class="mt-whole">{{ p.whole }}</span>
            }
            <span class="mt-frac">
              <span class="mt-num">{{ p.num }}</span>
              <span class="mt-den">{{ p.den }}</span>
            </span>
          </span>
        </span>
      }
    }
  `,
  styles: [
    `
      :host { display: inline; }
      /* position: relative keeps the hidden text inside scrolling rows instead of widening the page. */
      .mt-frac-wrap { white-space: nowrap; position: relative; }
      .mt-visual { display: inline-flex; align-items: center; gap: 0.12em; vertical-align: middle; }
      .mt-frac {
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        font-size: 0.82em;
        line-height: 1.05;
        margin: 0 0.08em;
      }
      .mt-num { border-bottom: 0.1em solid currentColor; padding: 0 0.15em; }
      .mt-den { padding: 0 0.15em; }
      .mt-sr {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
        white-space: nowrap;
      }
    `,
  ],
})
export class MathTextComponent {
  private readonly textSignal = signal('');
  readonly parts = computed(() => splitFractions(this.textSignal()));

  @Input({ required: true }) set text(value: string | null | undefined) {
    this.textSignal.set(value ?? '');
  }
}
