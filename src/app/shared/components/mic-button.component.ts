import { Component, EventEmitter, Input, NgZone, OnDestroy, Output, inject, signal } from '@angular/core';
import { spokenToAnswer } from '../utils/spoken-answer';

/* The Web Speech API isn't in the TypeScript DOM types yet */
interface SpeechAlternative { transcript: string }
interface SpeechResultEvent { results: ArrayLike<ArrayLike<SpeechAlternative>> }
interface SpeechErrorEvent { error: string }
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

const recognitionCtor = (): SpeechRecognitionCtor | null => {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

/** English as the device speaks it, defaulting to Indian English */
const speechLang = (): string => {
  const lang = typeof navigator !== 'undefined' ? navigator.language : '';
  return lang?.toLowerCase().startsWith('en') ? lang : 'en-IN';
};

const ERRORS: Record<string, string> = {
  'not-allowed': 'Allow the microphone for this site to speak answers.',
  'service-not-allowed': 'Allow the microphone for this site to speak answers.',
  'no-speech': "Didn't hear anything. Tap 🎤 and try again.",
  'audio-capture': 'No microphone found.',
  network: 'Speech needs an internet connection.',
};

/**
 * Tap to say an answer instead of typing it. What was heard goes into the answer box (turned into
 * digits: "three quarters" → 3/4), so the student can check or fix it before moving on; nothing is
 * submitted by voice. Hidden in browsers without speech recognition (Firefox).
 */
@Component({
  selector: 'app-mic-button',
  standalone: true,
  template: `
    @if (supported) {
      <div class="mic">
        <button
          type="button"
          class="mic-btn"
          [class.listening]="listening()"
          [disabled]="disabled"
          [attr.aria-pressed]="listening()"
          [attr.aria-label]="listening() ? 'Stop listening' : 'Speak your answer'"
          [title]="listening() ? 'Stop listening' : 'Speak your answer'"
          (click)="toggle()"
        >🎤</button>
        <span class="mic-status" aria-live="polite">
          @if (listening()) { Listening… }
          @else if (error()) { {{ error() }} }
          @else if (heard()) { Heard “{{ heard() }}” }
        </span>
      </div>
    }
  `,
  styles: [
    `
      .mic { display: flex; align-items: center; gap: 8px; min-width: 0; }
      .mic-btn {
        flex: none; width: 48px; height: 48px; border-radius: 50%;
        border: 2px solid #c7d2fe; background: #eef2ff; font-size: 1.35rem; cursor: pointer;
      }
      .mic-btn:hover:not(:disabled) { background: #e0e7ff; }
      .mic-btn:focus-visible { outline: 3px solid #6366f1; outline-offset: 2px; }
      .mic-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .mic-btn.listening { background: #fee2e2; border-color: #f87171; animation: pulse 1.2s ease-in-out infinite; }
      @keyframes pulse { 50% { box-shadow: 0 0 0 8px rgba(248, 113, 113, 0.2); } }
      @media (prefers-reduced-motion: reduce) { .mic-btn.listening { animation: none; } }
      .mic-status { font-size: 0.85rem; color: #475569; overflow-wrap: anywhere; }
    `,
  ],
})
export class MicButtonComponent implements OnDestroy {
  private readonly zone = inject(NgZone);

  @Input() disabled = false;
  /** The answer, already turned into digits and symbols */
  @Output() heardAnswer = new EventEmitter<string>();

  readonly supported = recognitionCtor() !== null;
  readonly listening = signal(false);
  readonly error = signal('');
  /** What the student said, as words, so they can see why the box changed */
  readonly heard = signal('');

  private recognition: SpeechRecognitionLike | null = null;

  toggle(): void {
    if (this.listening()) {
      this.recognition?.stop();
      return;
    }
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    const recognition = new Ctor();
    recognition.lang = speechLang();
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 3;
    // Speech callbacks fire outside Angular's zone
    recognition.onresult = (event) => this.zone.run(() => this.onResult(event));
    recognition.onerror = (event) => this.zone.run(() => {
      if (event.error !== 'aborted') this.error.set(ERRORS[event.error] ?? "Couldn't hear that. Try again.");
    });
    recognition.onend = () => this.zone.run(() => this.listening.set(false));
    this.recognition = recognition;
    this.error.set('');
    this.heard.set('');
    try {
      recognition.start();
      this.listening.set(true);
    } catch {
      this.error.set("Couldn't start the microphone. Try again.");
    }
  }

  private onResult(event: SpeechResultEvent): void {
    const result = event.results[0];
    if (!result) return;
    const alternatives = Array.from({ length: result.length }, (_, i) => result[i]?.transcript ?? '').filter(Boolean);
    // Prefer the first guess that reads as a number ("for" vs "4")
    const answers = alternatives.map((said) => ({ said, answer: spokenToAnswer(said) }));
    const best = answers.find((a) => /\d/.test(a.answer)) ?? answers[0];
    if (!best) return;
    this.heard.set(best.said);
    if (best.answer) this.heardAnswer.emit(best.answer);
  }

  ngOnDestroy(): void {
    this.recognition?.abort();
  }
}
