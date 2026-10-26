import { Component, Input, computed, signal } from '@angular/core';
import { formatMath } from '../../shared/utils/math-format';

/**
 * Renders maths text as given, with light formatting: stacked fractions, superscripts, log bases,
 * matrices as a grid and counting dots in groups of five. Screen readers get the original text for
 * fractions and matrices; the formatted version is visual only.
 */
@Component({
  selector: 'app-math-text',
  standalone: true,
  template: `
    @for (p of parts(); track $index) {
      @switch (p.kind) {
        @case ('text') {
          <ng-container>{{ p.value }}</ng-container>
        }
        @case ('sup') {
          <sup class="mt-sup">{{ p.value }}</sup>
        }
        @case ('sub') {
          <sub class="mt-sub">{{ p.value }}</sub>
        }
        @case ('frac') {
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
        @case ('matrix') {
          <span class="mt-matrix-wrap">
            <span class="mt-sr">matrix {{ p.raw }}</span>
            <span
              class="mt-matrix"
              aria-hidden="true"
              [style.grid-template-columns]="'repeat(' + p.rows[0].length + ', auto)'"
            >
              @for (row of p.rows; track $index) {
                @for (cell of row; track $index) {
                  <span class="mt-cell">{{ cell }}</span>
                }
              }
            </span>
          </span>
        }
        @case ('dots') {
          <span class="mt-dots" role="img" [attr.aria-label]="p.count + ' dots in groups of five'">
            @for (g of p.groups; track $index) {
              <span class="mt-dot-group">
                @for (d of dotsOf(g); track $index) {
                  <span class="mt-dot"></span>
                }
              </span>
            }
          </span>
        }
      }
    }
  `,
  styles: [
    `
      :host { display: inline; }
      .mt-sup, .mt-sub { font-size: 0.72em; line-height: 0; }
      /* position: relative keeps the hidden text inside scrolling rows instead of widening the page. */
      .mt-frac-wrap, .mt-matrix-wrap { white-space: nowrap; position: relative; }
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
      .mt-matrix {
        display: inline-grid;
        gap: 0.1em 0.8em;
        vertical-align: middle;
        padding: 0.15em 0.45em;
        margin: 0 0.15em;
        border-left: 0.12em solid currentColor;
        border-right: 0.12em solid currentColor;
        border-radius: 0.25em;
        line-height: 1.2;
      }
      .mt-cell { text-align: center; }
      /* Big, high-contrast dots with a clear gap after every five so children can count them. */
      .mt-dots {
        display: flex;
        flex-wrap: wrap;
        gap: 0.6em 1.1em;
        margin: 0.5em 0;
      }
      .mt-dot-group { display: inline-flex; gap: 0.3em; }
      .mt-dot {
        width: 1.6em;
        height: 1.6em;
        border-radius: 50%;
        background: #1e1b4b;
        display: inline-block;
      }
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
  readonly parts = computed(() => formatMath(this.textSignal()));

  @Input({ required: true }) set text(value: string | null | undefined) {
    this.textSignal.set(value ?? '');
  }

  dotsOf(n: number): number[] {
    return Array.from({ length: n }, (_, i) => i);
  }
}
