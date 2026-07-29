import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import {
  LearningApiService,
  ParentStudentSummary,
  StudentCreateResponse,
} from '../services/learning-api.service';
import { AddStudentModalComponent, AddStudentPayload } from './add-student-modal.component';
import { EditChildModalComponent, EditChildPayload } from './edit-child-modal.component';
import { AccessCodeModalComponent } from './access-code-modal.component';

interface DashboardStudent {
  id: string;
  name: string;
  grade: string;
  masterySummary: string;
  upcomingTests: string[];
  accessCode?: string;
}

@Component({
  selector: 'app-parent-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    AddStudentModalComponent,
    EditChildModalComponent,
    AccessCodeModalComponent,
  ],
  template: `
    <main class="page">
      <header class="card row">
        <div>
          <h1>Parent Dashboard</h1>
          <p>Manage your students and generate access codes.</p>
        </div>
        <button class="ghost" (click)="logout()">Logout</button>
      </header>

      <section class="card">
        <button class="primary" (click)="showAddStudent.set(true)">Add Student</button>
      </section>

      <section class="card" *ngIf="loading()">Loading students...</section>
      <section class="card" *ngIf="!loading() && students().length === 0">No students yet.</section>

      <section class="card" *ngFor="let student of students()">
        <h2>{{ student.name }}</h2>
        <p>Grade: {{ student.grade || 'Not set' }}</p>
        <p>Mastery summary: {{ student.masterySummary }}</p>
        <p>Upcoming tests: {{ student.upcomingTests.join(', ') || 'No tests scheduled' }}</p>
        <div class="actions">
          <button (click)="openEdit(student)">Edit Student</button>
          <button (click)="generateAccessCode(student)">Generate Access Code</button>
          <button (click)="openStudentView(student)">Open Student View</button>
        </div>
      </section>

      <app-add-student-modal
        *ngIf="showAddStudent()"
        (closed)="showAddStudent.set(false)"
        (saved)="addStudent($event)"
      />

      <app-edit-child-modal
        *ngIf="editingStudent()"
        [childName]="editingStudent()!.name"
        [grade]="editingStudent()!.grade"
        (closed)="editingStudent.set(null)"
        (saved)="saveEdit($event)"
      />

      <app-access-code-modal
        *ngIf="activeAccessCode()"
        [code]="activeAccessCode()!"
        (closed)="activeAccessCode.set('')"
      />

      <section class="card error" *ngIf="errorMessage()">{{ errorMessage() }}</section>
    </main>
  `,
  styles: [
    `
      .page { max-width: 880px; margin: 0 auto; padding: 16px; display: grid; gap: 12px; }
      .card { background: #fff; border-radius: 16px; padding: 16px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08); }
      .row { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
      .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
      button { border: 0; border-radius: 12px; padding: 10px 12px; font-weight: 700; background: #e2e8f0; }
      .primary { background: #2563eb; color: #fff; width: 100%; }
      .ghost { background: #f1f5f9; }
      h1, h2, p { margin: 0; }
      section p { margin-top: 6px; color: #334155; }
      .error { color: #b91c1c; }
    `,
  ],
})
export class ParentDashboardPageComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly api = inject(LearningApiService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly students = signal<DashboardStudent[]>([]);
  readonly showAddStudent = signal(false);
  readonly editingStudent = signal<DashboardStudent | null>(null);
  readonly activeAccessCode = signal('');
  readonly studentCount = computed(() => this.students().length);

  ngOnInit(): void {
    void this.loadStudents();
  }

  async loadStudents(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const students = await this.api.getParentStudents();
      this.students.set(students.map((student) => this.toViewModel(student)));
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Unable to load students.');
    } finally {
      this.loading.set(false);
    }
  }

  async addStudent(payload: AddStudentPayload): Promise<void> {
    if (!payload.childName || !payload.grade) {
      this.errorMessage.set('Child name and grade are required.');
      return;
    }

    try {
      const created = await this.api.createStudent(payload);
      const createdStudent = this.mapCreatedStudent(created);
      this.students.set([createdStudent, ...this.students()]);
      this.showAddStudent.set(false);
      this.activeAccessCode.set(created.accessCode);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Unable to add student.');
    }
  }

  openEdit(student: DashboardStudent): void {
    this.editingStudent.set(student);
  }

  async saveEdit(payload: EditChildPayload): Promise<void> {
    const student = this.editingStudent();
    if (!student) {
      return;
    }

    try {
      await this.api.updateStudent(student.id, payload);
      this.students.set(
        this.students().map((entry) =>
          entry.id === student.id ? { ...entry, name: payload.childName, grade: payload.grade } : entry,
        ),
      );
      this.editingStudent.set(null);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Unable to update student.');
    }
  }

  async generateAccessCode(student: DashboardStudent): Promise<void> {
    try {
      const response = await this.api.generateAccessCode(student.id);
      this.activeAccessCode.set(response.accessCode);
      this.students.set(
        this.students().map((entry) =>
          entry.id === student.id ? { ...entry, accessCode: response.accessCode } : entry,
        ),
      );
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Unable to generate access code.');
    }
  }

  async openStudentView(student: DashboardStudent): Promise<void> {
    this.authService.setActiveStudentId(student.id);
    await this.router.navigate(['/student/dashboard']);
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    await this.router.navigate(['/']);
  }

  private toViewModel(student: ParentStudentSummary): DashboardStudent {
    return {
      id: student.id,
      name: student.name,
      grade: student.grade,
      masterySummary: student.masterySummary || 'Getting started',
      upcomingTests: student.upcomingTests ?? [],
      accessCode: student.accessCode,
    };
  }

  private mapCreatedStudent(student: StudentCreateResponse): DashboardStudent {
    return {
      id: student.studentId,
      name: student.childName,
      grade: student.grade,
      masterySummary: 'Getting started',
      upcomingTests: [],
      accessCode: student.accessCode,
    };
  }
}
