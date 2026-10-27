import { Component, Input, OnChanges, SimpleChanges, computed, signal } from '@angular/core';

const BEAD = 27;
const HEAVEN_UP = 6;
const HEAVEN_DOWN = 42;
const EARTH_TOP = 82;
const DRAG_PX = 8;
const PLACE_NAMES = ['ones', 'tens', 'hundreds', 'thousands', 'ten thousands', 'hundred thousands', 'millions'];

interface Rod {
  heaven: boolean;
  /** Earth beads pushed up to the beam (0–4). */
  earth: number;
}

/**
 * A simple on-screen soroban: each rod has one "5" bead above the beam and four "1" beads below.
 * Drag a bead towards the beam (or tap it) to count it. It's only a thinking tool; answers are typed.
 */
@Component({
  selector: 'app-soroban',
  standalone: true,
  template: `
    <div class="soroban">
      <div class="frame" role="group" aria-label="Abacus">
        @for (rod of rods(); track $index; let r = $index) {
          <div class="rod" [attr.aria-label]="placeName(r) + ': ' + rodValue(rod)">
            <span class="stick" aria-hidden="true"></span>
            <button type="button" class="bead heaven" [class.on]="rod.heaven"
                    [style.top.px]="rod.heaven ? heavenDown : heavenUp"
                    [attr.aria-label]="'Five bead, ' + placeName(r) + (rod.heaven ? ', counted' : '')"
                    [attr.aria-pressed]="rod.heaven"
                    (pointerdown)="down($event, r, -1)" (pointermove)="move($event)" (pointerup)="up(r, -1)" (pointercancel)="cancel()"
                    (keydown.enter)="$event.preventDefault(); tap(r, -1)" (keydown.space)="$event.preventDefault(); tap(r, -1)"></button>
            @for (k of earthBeads; track k) {
              <button type="button" class="bead earth" [class.on]="k < rod.earth"
                      [style.top.px]="earthTop(k, rod.earth)"
                      [attr.aria-label]="'One bead ' + (k + 1) + ', ' + placeName(r) + (k < rod.earth ? ', counted' : '')"
                      [attr.aria-pressed]="k < rod.earth"
                      (pointerdown)="down($event, r, k)" (pointermove)="move($event)" (pointerup)="up(r, k)" (pointercancel)="cancel()"
                      (keydown.enter)="$event.preventDefault(); tap(r, k)" (keydown.space)="$event.preventDefault(); tap(r, k)"></button>
            }
          </div>
        }
        <span class="beam" aria-hidden="true">
          @for (rod of rods(); track $index; let r = $index) {
            <span class="unit-dot" [class.show]="(rods().length - 1 - r) % 3 === 0"></span>
          }
        </span>
      </div>
      <div class="tools">
        <button type="button" class="tool" (click)="clear()">Clear</button>
        <button type="button" class="tool" (click)="showValue.set(!showValue())" [attr.aria-pressed]="showValue()">
          {{ showValue() ? 'Hide number' : 'Show number' }}
        </button>
        @if (showValue()) {
          <span class="value" aria-live="polite">{{ value().toLocaleString() }}</span>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .soroban { display: grid; gap: 8px; justify-items: center; }
      .frame {
        position: relative;
        display: flex;
        gap: 4px;
        padding: 6px 10px;
        background: #7c4a1e;
        border-radius: 14px;
        box-shadow: inset 0 0 0 4px #5b3412;
        touch-action: none;
        user-select: none;
        max-width: 100%;
        overflow-x: auto;
      }
      .rod { position: relative; width: 40px; height: 221px; flex: 0 0 auto; }
      .stick { position: absolute; left: 50%; top: 0; bottom: 0; width: 4px; margin-left: -2px; background: #d6b98c; border-radius: 2px; }
      .beam {
        position: absolute;
        left: 10px;
        right: 10px;
        top: 76px;
        height: 8px;
        background: #3f230b;
        display: flex;
        gap: 4px;
        pointer-events: none;
      }
      .unit-dot { width: 40px; display: grid; place-items: center; }
      .unit-dot.show::after { content: ''; width: 4px; height: 4px; border-radius: 50%; background: #fde68a; margin-top: 2px; }
      .bead {
        position: absolute;
        left: 0;
        width: 40px;
        height: 25px;
        border: 0;
        padding: 0;
        border-radius: 50% / 50%;
        background: radial-gradient(ellipse at 40% 35%, #fde68a, #d97706 70%);
        box-shadow: 0 2px 0 rgba(0, 0, 0, 0.35);
        cursor: grab;
        transition: top 0.15s ease;
        touch-action: none;
      }
      .bead.on { background: radial-gradient(ellipse at 40% 35%, #fecaca, #dc2626 70%); }
      .bead:focus-visible { outline: 3px solid #a5b4fc; outline-offset: 1px; }
      @media (prefers-reduced-motion: reduce) { .bead { transition: none; } }
      .tools { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 8px; }
      .tool { border: 0; background: #f1f5f9; border-radius: 10px; padding: 8px 12px; font-weight: 700; cursor: pointer; }
      .value { font-weight: 800; font-size: 1.2rem; color: #1e1b4b; font-variant-numeric: tabular-nums; }
    `,
  ],
})
export class SorobanComponent implements OnChanges {
  @Input() columns = 7;
  /** Change it (e.g. to the round ID) to clear the beads for a new question. */
  @Input() resetKey: unknown;

  readonly earthBeads = [0, 1, 2, 3];
  readonly heavenUp = HEAVEN_UP;
  readonly heavenDown = HEAVEN_DOWN;
  readonly showValue = signal(false);
  readonly rods = signal<Rod[]>([]);
  readonly value = computed(() => this.rods().reduce((sum, rod) => sum * 10 + this.rodValue(rod), 0));

  private drag: { startY: number; moved: boolean } | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['columns'] || changes['resetKey']) this.clear();
  }

  clear(): void {
    this.rods.set(Array.from({ length: this.columns }, () => ({ heaven: false, earth: 0 })));
  }

  rodValue(rod: Rod): number {
    return (rod.heaven ? 5 : 0) + rod.earth;
  }

  placeName(r: number): string {
    return PLACE_NAMES[this.columns - 1 - r] ?? `column ${r + 1}`;
  }

  earthTop(k: number, active: number): number {
    return EARTH_TOP + (k < active ? k : k + 1) * BEAD;
  }

  /* ---------------- Interaction: drag towards the beam to count, away to un-count; tap toggles ---------------- */

  down(e: PointerEvent, _rod: number, _bead: number): void {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    this.drag = { startY: e.clientY, moved: false };
  }

  move(e: PointerEvent): void {
    if (!this.drag || this.drag.moved) return;
    const dy = e.clientY - this.drag.startY;
    if (Math.abs(dy) < DRAG_PX) return;
    this.drag.moved = true;
    const target = e.target as HTMLElement;
    const rodEl = target.parentElement;
    const r = rodEl ? Array.from(rodEl.parentElement!.querySelectorAll('.rod')).indexOf(rodEl) : -1;
    if (r < 0) return;
    if (target.classList.contains('heaven')) this.setHeaven(r, dy > 0);
    else {
      const k = Array.from(rodEl!.querySelectorAll('.earth')).indexOf(target);
      this.setEarth(r, k, dy < 0);
    }
  }

  up(r: number, bead: number): void {
    if (this.drag && !this.drag.moved) this.tap(r, bead);
    this.drag = null;
  }

  cancel(): void {
    this.drag = null;
  }

  tap(r: number, bead: number): void {
    const rod = this.rods()[r];
    if (bead < 0) this.setHeaven(r, !rod.heaven);
    else this.setEarth(r, bead, bead >= rod.earth);
  }

  private setHeaven(r: number, on: boolean): void {
    this.update(r, (rod) => ({ ...rod, heaven: on }));
  }

  /** Counting bead k also counts the beads between it and the beam; un-counting it frees the ones below. */
  private setEarth(r: number, k: number, on: boolean): void {
    this.update(r, (rod) => ({ ...rod, earth: on ? Math.max(rod.earth, k + 1) : Math.min(rod.earth, k) }));
  }

  private update(r: number, fn: (rod: Rod) => Rod): void {
    this.rods.update((rods) => rods.map((rod, i) => (i === r ? fn(rod) : rod)));
  }
}
