import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface AddStudentPayload {
  childName: string;
  grade: string;
}

@Component({
  selector: 'app-add-student-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="backdrop" (click)="closed.emit()">
      <section class="modal" (click)="$event.stopPropagation()">
        <h2>Add Student</h2>
        <label class="label" for="child-name">Child Name</label>
        <input id="child-name" class="input" [(ngModel)]="childName" placeholder="Child name" />

        <label class="label" for="grade">Grade</label>
        <select id="grade" class="input" [(ngModel)]="grade">
          <option value="">Select grade</option>
          <option *ngFor="let option of grades" [value]="option">{{ option }}</option>
        </select>

        <div class="actions">
          <button class="secondary" (click)="closed.emit()">Cancel</button>
          <button class="primary" (click)="submit()" [disabled]="!childName.trim() || !grade">Create</button>
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
      .primary:disabled { opacity: 0.6; }
      .secondary { background: #e2e8f0; color: #0f172a; }
      h2 { margin: 0; }
    `,
  ],
})
export class AddStudentModalComponent {
  @Output() readonly saved = new EventEmitter<AddStudentPayload>();
  @Output() readonly closed = new EventEmitter<void>();

  readonly grades = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  childName = '';
  grade = '';

  submit(): void {
    this.saved.emit({ childName: this.childName.trim(), grade: this.grade });
  }
}
