import { Component, Input, signal } from '@angular/core';

/** What "Find my skill band" does, in one place for the home card and the check itself. */
export const SKILL_BAND_INFO =
  'A quick check, about 20 questions with no timer, that finds the grade you are really working at in each part of maths, ' +
  'like adding, dividing or fractions. Your learning plan and Daily Challenge then start from there, so work is not too easy ' +
  'or too hard. Questions get harder when you are right and easier when you are not, so getting some wrong is normal. ' +
  'You can run it again any time.';

/**
 * An ⓘ button that opens a short explanation. Works with a tap (tablets have no hover), and the same
 * text is on hover and for screen readers.
 */
@Component({
  selector: 'app-skill-band-info',
  standalone: true,
  template: `
    <span class="wrap">
      <button
        type="button"
        class="info"
        [attr.aria-expanded]="open()"
        [attr.aria-label]="'What is ' + label + '?'"
        [title]="text"
        (click)="toggle($event)"
      >ⓘ</button>
      @if (open()) {
        <span class="tip" role="note" [class.end]="alignEnd()">{{ text }}</span>
      }
    </span>
  `,
  styles: [
    `
      .wrap { position: relative; display: inline-flex; vertical-align: middle; }
      .tip.end { left: auto; right: -8px; }
      .info { border: 0; background: #e0e7ff; color: #3730a3; border-radius: 999px; width: 26px; height: 26px; font-size: 0.95rem; font-weight: 800; line-height: 1; cursor: pointer; }
      .info:focus-visible { outline: 3px solid #a5b4fc; outline-offset: 2px; }
      .tip { position: absolute; z-index: 10; top: calc(100% + 8px); left: -8px; right: auto; width: min(300px, 78vw); background: #0f172a; color: #fff; border-radius: 12px; padding: 10px 12px; font-size: 0.85rem; font-weight: 500; line-height: 1.4; box-shadow: 0 10px 28px rgba(15, 23, 42, 0.3); text-align: left; white-space: normal; }
    `,
  ],
})
export class SkillBandInfoComponent {
  @Input() label = 'Find my skill band';
  readonly text = SKILL_BAND_INFO;
  readonly open = signal(false);
  /** Opens leftwards when the button sits on the right half of the screen, so it never runs off the edge. */
  readonly alignEnd = signal(false);

  toggle(event: MouseEvent): void {
    // Inside a link card: don't follow the link
    event.preventDefault();
    event.stopPropagation();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.alignEnd.set(rect.left > window.innerWidth / 2);
    this.open.update((v) => !v);
  }
}
