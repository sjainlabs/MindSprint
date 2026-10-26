import { Component, ElementRef, Input, Output, EventEmitter, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PracticeWorksheetQuestion } from '../services/learning-api.service';
import { VerticalMultiplicationComponent } from '../vertical-multiplication-component/vertical-multiplication.component';
import { FormsModule } from '@angular/forms';
import { MathTextComponent } from '../components/math-text/math-text.component';
import {
  HelperKey,
  inputSpecFor,
  joinMultiAnswer,
  splitMultiAnswer,
} from '../shared/utils/question-input';

let nextId = 0;

@Component({
  selector: 'app-question-renderer',
  imports: [CommonModule, FormsModule, VerticalMultiplicationComponent, MathTextComponent],
  templateUrl: './question-renderer.component.html',
  styleUrl: './question-renderer.component.css',
})
export class QuestionRendererComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly questionSignal = signal<PracticeWorksheetQuestion | null>(null);

  @Input({ required: true }) set question(value: PracticeWorksheetQuestion) {
    this.questionSignal.set(value);
  }
  get question(): PracticeWorksheetQuestion {
    return this.questionSignal()!;
  }

  @Input() answer: string | number | string[] = '';
  @Output() answerChange = new EventEmitter<string | number | string[]>();

  showHint = false;
  readonly uid = `qr-${nextId++}`;

  /** Keyboard, helper keys and hint for this question, chosen from its prompt. */
  readonly spec = computed(() => inputSpecFor(this.questionSignal()?.prompt ?? ''));

  /** The input the helper keys type into (the last one focused). */
  private target: HTMLInputElement | null = null;

  get answerText(): string {
    return this.answer === null || this.answer === undefined ? '' : String(this.answer);
  }

  /* ---------------- Single input ---------------- */

  onInputEvent(e: Event) {
    const value = (e.target as HTMLInputElement)?.value ?? '';
    this.answerChange.emit(value);
  }

  /* ---------------- Multi-part (x = [ ], y = [ ]) ---------------- */

  parts(): string[] {
    return splitMultiAnswer(this.answerText, this.spec().variables.length);
  }

  onPartInput(index: number, e: Event) {
    const el = e.target as HTMLInputElement;
    // Commas separate the values, so they can't appear inside one.
    if (el.value.includes(',')) el.value = el.value.replace(/,/g, '');
    const values = this.parts();
    values[index] = el.value;
    this.answerChange.emit(joinMultiAnswer(values));
  }

  /* ---------------- Helper keys ---------------- */

  setTarget(el: HTMLInputElement) {
    this.target = el;
  }

  insertKey(key: HelperKey) {
    // The last focused box if it's still on screen, otherwise the first answer box.
    const el =
      this.target?.isConnected
        ? this.target
        : this.host.nativeElement.querySelector<HTMLInputElement>('input.answer-input');
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    el.value = el.value.slice(0, start) + key.insert + el.value.slice(end);
    const caret = start + key.insert.length;
    el.focus();
    el.setSelectionRange(caret, caret);
    // Let the normal input handler store the new value.
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  /** Keeps the on-screen keyboard open when a helper key is tapped. */
  keepFocus(e: Event) {
    e.preventDefault();
  }

  /* ---------------- Counting pad ---------------- */

  readonly padKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  padPress(digit: string) {
    const next = (this.answerText + digit).replace(/^0+(?=\d)/, '').slice(0, 3);
    this.answerChange.emit(next);
  }

  padDelete() {
    this.answerChange.emit(this.answerText.slice(0, -1));
  }

  padClear() {
    this.answerChange.emit('');
  }
}
