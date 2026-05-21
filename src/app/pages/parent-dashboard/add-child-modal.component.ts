import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface AddChildPayload {
  name: string;
  grade: string;
  avatar: string;
}

@Component({
  selector: 'app-add-child-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" (click)="cancel.emit()">
      <section class="modal-card" (click)="$event.stopPropagation()">
        <h3>Add Child</h3>
        <p class="muted">Create a student profile and we will auto-generate the login code.</p>

        <label>
          Name
          <input type="text" [ngModel]="name()" (ngModelChange)="name.set($event)" placeholder="Enter child name" />
        </label>

        <label>
          Grade
          <input type="text" [ngModel]="grade()" (ngModelChange)="grade.set($event)" placeholder="e.g. 3" />
        </label>

        <label>
          Avatar (optional)
          <input type="text" maxlength="2" [ngModel]="avatar()" (ngModelChange)="avatar.set($event)" placeholder="🧠" />
        </label>

        @if (errorMessage) {
          <p class="error">{{ errorMessage }}</p>
        }

        <div class="actions">
          <button type="button" class="btn btn-ghost" [disabled]="saving" (click)="cancel.emit()">Cancel</button>
          <button type="button" class="btn btn-primary" [disabled]="saving" (click)="onSubmit()">
            {{ saving ? 'Saving...' : 'Add Child' }}
          </button>
        </div>
      </section>
    </div>
  `,
  styles: `
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgb(15 23 42 / 0.55);
      display: grid;
      place-items: end center;
      padding: 1rem;
      z-index: 1000;
    }

    .modal-card {
      width: min(560px, 100%);
      background: #fff;
      border-radius: 1rem;
      padding: 1rem;
      display: grid;
      gap: 0.8rem;
      box-shadow: 0 18px 35px rgb(15 23 42 / 0.2);
    }

    h3 {
      margin: 0;
      color: #0f172a;
    }

    .muted {
      margin: 0;
      color: #64748b;
      font-size: 0.92rem;
    }

    label {
      display: grid;
      gap: 0.35rem;
      color: #334155;
      font-weight: 600;
      font-size: 0.92rem;
    }

    input {
      border: 1px solid #cbd5e1;
      border-radius: 0.7rem;
      padding: 0.65rem;
      font-size: 0.95rem;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.55rem;
      margin-top: 0.35rem;
    }

    .btn {
      border: 0;
      border-radius: 0.75rem;
      padding: 0.65rem 0.95rem;
      font-weight: 700;
      cursor: pointer;
    }

    .btn-primary {
      background: #2563eb;
      color: #fff;
    }

    .btn-ghost {
      background: #e2e8f0;
      color: #0f172a;
    }

    .error {
      margin: 0;
      color: #dc2626;
      font-size: 0.9rem;
    }

    @media (min-width: 768px) {
      .modal-backdrop {
        place-items: center;
      }
    }
  `,
})
export class AddChildModalComponent {
  @Input() saving = false;
  @Input() errorMessage = '';

  @Output() save = new EventEmitter<AddChildPayload>();
  @Output() cancel = new EventEmitter<void>();

  readonly name = signal('');
  readonly grade = signal('');
  readonly avatar = signal('🧠');

  onSubmit(): void {
    const name = this.name().trim();
    const grade = this.grade().trim();

    if (!name || !grade) {
      this.save.emit({ name: '', grade: '', avatar: this.avatar().trim() || '🧠' });
      return;
    }

    this.save.emit({
      name,
      grade,
      avatar: this.avatar().trim() || '🧠',
    });
  }
}

