import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StudentProfile } from '../../services/auth.service';

export interface EditChildPayload {
  id: string;
  name: string;
  grade: string;
  avatar: string;
}

@Component({
  selector: 'app-edit-child-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
	<div class="modal-backdrop" (click)="cancel.emit()">
	  <section class="modal-card" (click)="$event.stopPropagation()">
		<h3>Edit Child</h3>
		<p class="muted">Update profile details and keep the same login code.</p>

		@if (student) {
		  <label>
			Name
			<input type="text" [ngModel]="name()" (ngModelChange)="name.set($event)" placeholder="Enter child name" />
		  </label>

		  <label>
			Grade
			<input type="text" [ngModel]="grade()" (ngModelChange)="grade.set($event)" placeholder="e.g. 3" />
		  </label>

		  <label>
			Avatar
			<input type="text" maxlength="2" [ngModel]="avatar()" (ngModelChange)="avatar.set($event)" placeholder="🧠" />
		  </label>

		  <p class="code">Login code: <strong>{{ student.loginCode }}</strong></p>

		  @if (errorMessage) {
			<p class="error">{{ errorMessage }}</p>
		  }

		  <div class="actions">
			@if (allowDelete) {
			  <button type="button" class="btn btn-danger" [disabled]="saving" (click)="delete.emit(student.id)">Delete</button>
			}
			<button type="button" class="btn btn-ghost" [disabled]="saving" (click)="cancel.emit()">Cancel</button>
			<button type="button" class="btn btn-primary" [disabled]="saving" (click)="onSubmit(student.id)">
			  {{ saving ? 'Saving...' : 'Save Changes' }}
			</button>
		  </div>
		}
	  </section>
	</div>
  `,
  styles: `
	.modal-backdrop { position: fixed; inset: 0; background: rgb(15 23 42 / 0.55); display: grid; place-items: end center; padding: 1rem; z-index: 1000; }
	.modal-card { width: min(560px, 100%); background: #fff; border-radius: 1rem; padding: 1rem; display: grid; gap: 0.8rem; box-shadow: 0 18px 35px rgb(15 23 42 / 0.2); }
	h3 { margin: 0; color: #0f172a; }
	.muted { margin: 0; color: #64748b; font-size: 0.92rem; }
	label { display: grid; gap: 0.35rem; color: #334155; font-weight: 600; font-size: 0.92rem; }
	input { border: 1px solid #cbd5e1; border-radius: 0.7rem; padding: 0.65rem; font-size: 0.95rem; }
	.code { margin: 0; padding: 0.65rem; border: 1px dashed #93c5fd; border-radius: 0.7rem; background: #eff6ff; color: #1e3a8a; }
	.actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 0.55rem; margin-top: 0.35rem; }
	.btn { border: 0; border-radius: 0.75rem; padding: 0.65rem 0.95rem; font-weight: 700; cursor: pointer; }
	.btn-primary { background: #2563eb; color: #fff; }
	.btn-ghost { background: #e2e8f0; color: #0f172a; }
	.btn-danger { background: #dc2626; color: #fff; margin-right: auto; }
	.error { margin: 0; color: #dc2626; font-size: 0.9rem; }
	@media (min-width: 768px) { .modal-backdrop { place-items: center; } }
  `,
})
export class EditChildModalComponent implements OnChanges {
  @Input() student: StudentProfile | null = null;
  @Input() saving = false;
  @Input() errorMessage = '';
  @Input() allowDelete = true;

  @Output() save = new EventEmitter<EditChildPayload>();
  @Output() delete = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();

  readonly name = signal('');
  readonly grade = signal('');
  readonly avatar = signal('🧠');

  ngOnChanges(changes: SimpleChanges): void {
	if (!changes['student'] || !this.student) {
	  return;
	}
	this.name.set(this.student.name);
	this.grade.set(this.student.grade);
	this.avatar.set(this.student.avatar || '🧠');
  }

  onSubmit(id: string): void {
	const name = this.name().trim();
	const grade = this.grade().trim();

	if (!name || !grade) {
	  this.save.emit({ id, name: '', grade: '', avatar: this.avatar().trim() || '🧠' });
	  return;
	}

	this.save.emit({ id, name, grade, avatar: this.avatar().trim() || '🧠' });
  }
}

