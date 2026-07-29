import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-topic-library-preview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="panel">
      <button class="toggle" (click)="toggled.emit()">Topic Library {{ expanded ? '▲' : '▼' }}</button>
      <ul *ngIf="expanded">
        <li>Fractions</li>
        <li>Decimals</li>
        <li>Geometry</li>
      </ul>
    </section>
  `,
  styles: [
    `
      .panel { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; }
      .toggle { width: 100%; border: 0; background: transparent; text-align: left; font-weight: 700; }
      ul { margin: 10px 0 0; padding-left: 18px; color: #334155; }
    `,
  ],
})
export class TopicLibraryPreviewComponent {
  @Input() expanded = false;
  @Output() readonly toggled = new EventEmitter<void>();
}

