import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-access-code-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="backdrop" (click)="closed.emit()">
      <section class="modal" (click)="$event.stopPropagation()">
        <h2>Student Access Code</h2>
        <p>Share this code with your child.</p>
        <p class="code">{{ code }}</p>
        <button (click)="closed.emit()">Done</button>
      </section>
    </div>
  `,
  styles: [
    `
      .backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.5); display: grid; place-items: center; padding: 16px; }
      .modal { width: min(380px, 100%); background: #fff; border-radius: 16px; padding: 16px; display: grid; gap: 10px; text-align: center; }
      .code { font-size: 2rem; letter-spacing: 0.12em; font-weight: 800; margin: 8px 0; }
      button { border: 0; border-radius: 12px; background: #2563eb; color: #fff; padding: 12px; font-weight: 700; }
      h2, p { margin: 0; }
      p { color: #334155; }
    `,
  ],
})
export class AccessCodeModalComponent {
  @Input({ required: true }) code = '';
  @Output() readonly closed = new EventEmitter<void>();
}

