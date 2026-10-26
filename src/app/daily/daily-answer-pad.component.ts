import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  computed,
  signal,
} from '@angular/core';
import { HelperKey, inputSpecFor } from '../shared/utils/question-input';

const BASE_KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', ',', '0', '.'];
/** Keys the pad always has, so the prompt's own helper keys don't repeat them. */
const PAD_SYMBOLS = new Set(['-', '/', '.', ',']);

/**
 * A large answer box with an on-screen number pad (digits, "/", "-", "." and ","). On phones the pad
 * replaces the system keyboard; "Keyboard" switches to it for answers that need letters.
 */
@Component({
  selector: 'app-daily-answer-pad',
  standalone: true,
  template: `
    <div class="pad-wrap">
      <input
        #box
        type="text"
        class="answer-box"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        enterkeyhint="done"
        [attr.inputmode]="mode() === 'pad' ? 'none' : 'text'"
        [attr.aria-describedby]="describedBy"
        aria-label="Your answer"
        [placeholder]="placeholder || 'Your answer'"
        [value]="value"
        [disabled]="disabled"
        (input)="emit($any($event.target).value)"
        (keydown.enter)="$event.preventDefault(); submitted.emit()"
      />

      @if (mode() === 'pad') {
        <div class="pad" role="group" aria-label="Number pad">
          @for (k of baseKeys; track k) {
            <button type="button" class="key" [disabled]="disabled" (pointerdown)="keep($event)" (click)="insert(k)">{{ k }}</button>
          }
          <button type="button" class="key sym" aria-label="Minus sign" [disabled]="disabled" (pointerdown)="keep($event)" (click)="insert('-')">−</button>
          <button type="button" class="key sym" aria-label="Fraction bar" [disabled]="disabled" (pointerdown)="keep($event)" (click)="insert('/')">/</button>
          <button type="button" class="key sym" aria-label="Delete" [disabled]="disabled" (pointerdown)="keep($event)" (click)="backspace()">⌫</button>
        </div>
      }

      @if (extraKeys().length) {
        <div class="extra" role="group" aria-label="Maths symbols">
          @for (k of extraKeys(); track k.label) {
            <button type="button" class="key sym" [attr.aria-label]="k.aria" [disabled]="disabled" (pointerdown)="keep($event)" (click)="insert(k.insert)">{{ k.label }}</button>
          }
        </div>
      }

      <button type="button" class="mode-btn" (click)="toggleMode()">
        {{ mode() === 'pad' ? '⌨ Use keyboard' : '🔢 Use number pad' }}
      </button>
    </div>
  `,
  styles: [
    `
      .pad-wrap { display: grid; gap: 10px; }
      /* 16px+ so iOS doesn't zoom; big enough for small fingers. */
      .answer-box {
        width: 100%;
        min-height: 60px;
        font-size: 1.8rem;
        font-weight: 800;
        text-align: center;
        letter-spacing: 0.03em;
        border-radius: 14px;
        border: 3px solid #c7d2fe;
        background: #fff;
        color: #1e1b4b;
        padding: 6px 12px;
      }
      .answer-box:focus { outline: none; border-color: #6c63ff; box-shadow: 0 0 0 4px rgba(108, 99, 255, 0.18); }
      .pad { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
      .extra { display: flex; flex-wrap: wrap; gap: 8px; }
      .key {
        min-height: 52px;
        min-width: 52px;
        border-radius: 12px;
        border: 0;
        background: #eef2ff;
        color: #1e1b4b;
        font-size: 1.4rem;
        font-weight: 800;
        cursor: pointer;
        touch-action: manipulation;
      }
      .key:active { transform: scale(0.96); background: #e0e7ff; }
      .key.sym { background: #f1f5f9; }
      .key:disabled { opacity: 0.5; }
      .mode-btn { justify-self: center; background: none; border: 0; color: #6c63ff; font-weight: 700; cursor: pointer; padding: 6px; }
      @media (min-width: 640px) { .pad { max-width: 360px; margin: 0 auto; width: 100%; } }
    `,
  ],
})
export class DailyAnswerPadComponent implements OnChanges {
  @Input() value = '';
  @Input() prompt = '';
  @Input() placeholder = '';
  @Input() disabled = false;
  @Input() describedBy: string | null = null;
  @Output() valueChange = new EventEmitter<string>();
  @Output() submitted = new EventEmitter<void>();

  @ViewChild('box', { static: true }) box!: ElementRef<HTMLInputElement>;

  readonly baseKeys = BASE_KEYS;
  readonly mode = signal<'pad' | 'keyboard'>('pad');
  private readonly promptSignal = signal('');
  private readonly spec = computed(() => inputSpecFor(this.promptSignal()));
  readonly extraKeys = computed<HelperKey[]>(() => this.spec().helperKeys.filter((k) => !PAD_SYMBOLS.has(k.insert)));

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['prompt']) {
      this.promptSignal.set(this.prompt ?? '');
      // Answers with letters (x ≤ 5, words) start on the keyboard; everything else on the pad.
      const s = this.spec();
      const needsLetters = s.kind === 'inequality' || (/\b(which|name|word|spell|true or false)\b/i.test(this.prompt ?? ''));
      this.mode.set(needsLetters ? 'keyboard' : 'pad');
    }
  }

  focus(): void {
    // Only on devices with a real keyboard; on phones it would pop up the system keyboard in keyboard mode.
    if (window.matchMedia?.('(pointer: fine)').matches) this.box.nativeElement.focus();
  }

  toggleMode(): void {
    this.mode.update((m) => (m === 'pad' ? 'keyboard' : 'pad'));
    if (this.mode() === 'keyboard') setTimeout(() => this.box.nativeElement.focus());
  }

  /** Keeps focus (and the caret) in the answer box when a key is tapped. */
  keep(e: Event): void {
    e.preventDefault();
  }

  insert(text: string): void {
    const el = this.box.nativeElement;
    const focused = document.activeElement === el;
    const start = focused ? (el.selectionStart ?? el.value.length) : el.value.length;
    const end = focused ? (el.selectionEnd ?? el.value.length) : el.value.length;
    el.value = el.value.slice(0, start) + text + el.value.slice(end);
    const caret = start + text.length;
    if (focused) el.setSelectionRange(caret, caret);
    this.emit(el.value);
  }

  backspace(): void {
    const el = this.box.nativeElement;
    const focused = document.activeElement === el;
    let start = focused ? (el.selectionStart ?? el.value.length) : el.value.length;
    const end = focused ? (el.selectionEnd ?? el.value.length) : el.value.length;
    if (start === end) start = Math.max(0, start - 1);
    el.value = el.value.slice(0, start) + el.value.slice(end);
    if (focused) el.setSelectionRange(start, start);
    this.emit(el.value);
  }

  emit(value: string): void {
    this.value = value;
    this.valueChange.emit(value);
  }
}
