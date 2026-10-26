import { Component, Input, computed, signal } from '@angular/core';
import { formatMath } from '../../shared/utils/math-format';

/**
 * Renders maths text as given, with light formatting: stacked fractions, superscripts, log bases,
 * square roots with a bar, matrices as a grid, counting dots in groups of five and dice faces.
 * Dice are always drawn as SVG pips, because many Android fonts have no glyphs for ⚀–⚅. Screen readers get the original text for
 * fractions and matrices; the formatted version is visual only. Tally marks (卌) are drawn as SVG too.
 */
const L = 28;
const M = 50;
const H = 72;
/** Pip centres for each face, on a 100×100 die. */
const PIPS: Record<number, Array<[number, number]>> = {
  1: [[M, M]],
  2: [[L, L], [H, H]],
  3: [[L, L], [M, M], [H, H]],
  4: [[L, L], [H, L], [L, H], [H, H]],
  5: [[L, L], [H, L], [M, M], [L, H], [H, H]],
  6: [[L, L], [H, L], [L, M], [H, M], [L, H], [H, H]],
};

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
        @case ('root') {
          <span class="mt-root"><span class="mt-root-sign">√</span><span class="mt-radicand">{{ p.value }}</span></span>
        }
        @case ('dice') {
          <span class="mt-dice" role="img" [attr.aria-label]="diceLabel(p.faces)">
            @for (face of p.faces; track $index) {
              <svg class="mt-die" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
                <rect x="4" y="4" width="92" height="92" rx="18" class="mt-die-face" />
                @for (pip of pipsFor(face); track $index) {
                  <circle [attr.cx]="pip[0]" [attr.cy]="pip[1]" r="9.5" class="mt-pip" />
                }
              </svg>
            }
          </span>
        }
        @case ('tally') {
          <span class="mt-tally" role="img" [attr.aria-label]="'Tally marks showing ' + p.count">
            @for (g of p.groups; track $index) {
              <svg class="mt-tally-group" [attr.viewBox]="'0 0 ' + tallyWidth(g) + ' 40'"
                   [style.width.em]="tallyWidth(g) / 26" aria-hidden="true" focusable="false">
                @for (s of strokesOf(g); track $index) {
                  <line [attr.x1]="s * 10 + 5" y1="6" [attr.x2]="s * 10 + 5" y2="34" class="mt-stroke" />
                }
                @if (g === 5) {
                  <line x1="1" y1="30" [attr.x2]="tallyWidth(g) - 1" y2="10" class="mt-stroke" />
                }
              </svg>
            }
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
      /* Plain inline (not a box) so lines don't break between "(" and the root. */
      .mt-root { white-space: nowrap; }
      /* The vinculum: a bar over the radicand that joins the top of the √ sign. */
      .mt-radicand {
        border-top: 0.08em solid currentColor;
        padding: 0.04em 0.12em 0 0.04em;
      }
      .mt-dice {
        display: inline-flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        padding: 0.6rem 0.75rem;
        margin: 0.35rem 0.15rem;
        border-radius: 1rem;
        background: #f1f5f9;
        vertical-align: middle;
      }
      .mt-die { width: max(48px, 3.25em); height: max(48px, 3.25em); display: block; }
      .mt-die-face { fill: #ffffff; stroke: #1e1b4b; stroke-width: 5; }
      .mt-pip { fill: #1e1b4b; }
      .mt-tally { display: inline-flex; gap: 0.45em; vertical-align: middle; margin: 0 0.15em; }
      .mt-tally-group { height: 1.55em; }
      .mt-stroke { stroke: currentColor; stroke-width: 3.2; stroke-linecap: round; }
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

  /** A bundle of five is four upright strokes and one across them. */
  strokesOf(n: number): number[] {
    return this.dotsOf(n === 5 ? 4 : n);
  }

  tallyWidth(n: number): number {
    return this.strokesOf(n).length * 10 + 4;
  }

  pipsFor(face: number): Array<[number, number]> {
    return PIPS[face] ?? [];
  }

  diceLabel(faces: number[]): string {
    const names = faces.map((f) => `${f}`).join(' and ');
    return faces.length === 1 ? `A dice showing ${names}` : `Dice showing ${names}`;
  }
}
