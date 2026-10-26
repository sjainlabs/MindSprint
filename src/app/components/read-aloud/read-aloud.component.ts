import { Component, Injectable, Input, OnDestroy, computed, inject, signal } from '@angular/core';

/** Wraps the browser's speech synthesis so only one thing is read at a time. */
@Injectable({ providedIn: 'root' })
export class ReadAloudService {
  readonly supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  readonly speakingId = signal<string | null>(null);

  speak(id: string, text: string): void {
    if (!this.supported) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(this.forSpeech(text));
    utterance.rate = 0.9; // a little slower for young listeners
    utterance.onend = utterance.onerror = () => {
      if (this.speakingId() === id) this.speakingId.set(null);
    };
    this.speakingId.set(id);
    window.speechSynthesis.speak(utterance);
  }

  stop(): void {
    if (!this.supported) return;
    window.speechSynthesis.cancel();
    this.speakingId.set(null);
  }

  /** Say maths symbols the way a teacher would. */
  private forSpeech(text: string): string {
    return text
      .replace(/×/g, ' times ')
      .replace(/÷/g, ' divided by ')
      .replace(/−/g, ' minus ')
      .replace(/√/g, ' square root of ')
      .replace(/²/g, ' squared ')
      .replace(/³/g, ' cubed ')
      .replace(/π/g, ' pi ')
      .replace(/≤/g, ' less than or equal to ')
      .replace(/≥/g, ' greater than or equal to ')
      .replace(/θ/g, ' theta ')
      .replace(/₹\s?(\d[\d,]*)/g, '$1 rupees')
      .replace(/(\d+)\s*\/\s*(\d+)/g, '$1 over $2');
  }
}

let nextId = 0;

/** Speaker button that reads `text` aloud. Renders nothing on devices without text-to-speech. */
@Component({
  selector: 'app-read-aloud',
  standalone: true,
  template: `
    @if (speech.supported) {
      <button
        type="button"
        class="read-aloud"
        [class.speaking]="speaking()"
        [attr.aria-label]="speaking() ? 'Stop reading' : 'Read ' + label + ' aloud'"
        [attr.aria-pressed]="speaking()"
        (click)="toggle($event)"
      >
        <span aria-hidden="true">{{ speaking() ? '⏹' : '🔊' }}</span>
      </button>
    }
  `,
  styles: [
    `
      .read-aloud {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        border: 2px solid currentColor;
        background: rgba(255, 255, 255, 0.85);
        color: #4338ca;
        font-size: 1.15rem;
        cursor: pointer;
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .read-aloud:focus-visible { outline: 3px solid #f59e0b; outline-offset: 2px; }
      .read-aloud.speaking { background: #4338ca; color: #fff; border-color: #4338ca; }
    `,
  ],
})
export class ReadAloudComponent implements OnDestroy {
  protected readonly speech = inject(ReadAloudService);
  private readonly id = `ra-${nextId++}`;

  @Input({ required: true }) text = '';
  /** What is being read, for the button's accessible name, e.g. "the trick". */
  @Input() label = 'this';

  readonly speaking = computed(() => this.speech.speakingId() === this.id);

  toggle(event: Event): void {
    event.stopPropagation();
    if (this.speaking()) this.speech.stop();
    else this.speech.speak(this.id, this.text);
  }

  ngOnDestroy(): void {
    if (this.speaking()) this.speech.stop();
  }
}
