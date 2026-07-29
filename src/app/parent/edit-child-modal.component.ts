import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface EditChildPayload {
  childName: string;
  grade: string;
}

@Component({
  selector: 'app-edit-child-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="backdrop" (click)="closed.emit()">
      <section class="modal" (click)="$event.stopPropagation()">
        <h2>Edit Student</h2>

        <label class="label" for="edit-child-name">Child Name</label>
        <input
          id="edit-child-name"
          class="input"
          [ngModel]="childName"
          (ngModelChange)="childName = $event"
          placeholder="Child name"
        />

        <label class="label" for="edit-grade">Grade</label>
        <select id="edit-grade" class="input" [ngModel]="grade" (ngModelChange)="grade = $event">
          <option value="">Select grade</option>
          <option *ngFor="let option of grades" [value]="option">{{ option }}</option>
        </select>

        <div class="actions">
          <button class="secondary" (click)="closed.emit()">Cancel</button>
          <button class="primary" (click)="submit()" [disabled]="!childName.trim() || !grade">Save</button>
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      .backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.5); display: grid; place-items: center; padding: 16px; }
      .modal { width: min(420px, 100%); background: #fff; border-radius: 16px; padding: 16px; display: grid; gap: 10px; }
      .label { font-weight: 700; color: #0f172a; }
      .input { border: 2px solid #cbd5e1; border-radius: 12px; padding: 12px; font-size: 1rem; }
      .actions { display: flex; gap: 10px; justify-content: flex-end; }
      button { border: 0; border-radius: 10px; padding: 10px 14px; font-weight: 700; }
      .primary { background: #2563eb; color: #fff; }
      .secondary { background: #e2e8f0; color: #0f172a; }
      h2 { margin: 0; }
    `,
  ],
})
export class EditChildModalComponent {
  @Input() childName = '';
  @Input() grade = '';
  @Output() readonly saved = new EventEmitter<EditChildPayload>();
  @Output() readonly closed = new EventEmitter<void>();

  readonly grades = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

  submit(): void {
    this.saved.emit({ childName: this.childName.trim(), grade: this.grade });
  }
}

