import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import {
  LearningApiService,
  ParentStudentSummary,
  StudentCreateResponse,
} from '../services/learning-api.service';
import { AddStudentModalComponent, AddStudentPayload } from './add-student-modal.component';
import { EditChildModalComponent, EditChildPayload } from './edit-child-modal.component';
import { AccessCodeModalComponent } from './access-code-modal.component';
import { AnalystCodeModalComponent } from './analyst-code-modal.component';
import { TeachersModalComponent } from './teachers-modal.component';
import { TrialBannerComponent } from '../trial/trial-banner.component';

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
    AnalystCodeModalComponent,
    TeachersModalComponent,
    TrialBannerComponent,
    RouterLink,
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

      <section class="card child" *ngFor="let student of students()" [attr.aria-label]="student.name">
        <div class="child-head">
          <div class="who">
            <h2>{{ student.name }}</h2>
            <p class="meta">Grade {{ student.grade || 'not set' }} · {{ student.masterySummary }}</p>
            <p class="meta" *ngIf="student.upcomingTests.length">📅 Upcoming tests: {{ student.upcomingTests.join(', ') }}</p>
            <app-trial-banner [studentId]="student.id" [compact]="true" />
          </div>
          <div class="head-actions">
            <button class="open" (click)="openStudentView(student)">Open as {{ student.name }} ▶️</button>
            <details class="menu" #menu>
              <summary [attr.aria-label]="'More for ' + student.name">⋯</summary>
              <div class="menu-list" role="menu">
                <button role="menuitem" (click)="menu.open = false; openEdit(student)">✏️ Edit child</button>
                <button role="menuitem" (click)="menu.open = false; generateAccessCode(student)">🔑 New login code</button>
                <button role="menuitem" (click)="menu.open = false; teachersFor.set(student)">👩‍🏫 Teachers</button>
                <button role="menuitem" (click)="menu.open = false; sharingStudent.set(student)">🔗 Share with analyst</button>
              </div>
            </details>
          </div>
        </div>

        <div class="group">
          <h3 class="group-title">📊 Reports</h3>
          <div class="links">
            <a class="link" routerLink="/student/dashboard" [queryParams]="{ studentId: student.id, view: 'parent' }">📋 Learning plan</a>
            <a class="link" routerLink="/reports" [queryParams]="{ studentId: student.id }">📈 Overview</a>
            <a class="link" routerLink="/reports" [queryParams]="{ studentId: student.id, tab: 'history' }">🗂️ Worksheet &amp; test history</a>
            <a class="link" routerLink="/reports/activity" [queryParams]="{ studentId: student.id }">⏱️ Active time</a>
            <a class="link" routerLink="/daily/progress" [queryParams]="{ studentId: student.id }">🗺️ Daily challenge report</a>
          </div>
          <p class="hint">Spotted a typo in an answer? Open the history and use ✏️ Fix typos on that worksheet.</p>
        </div>

        <div class="group">
          <h3 class="group-title">🎮 Games</h3>
          <div class="links">
            <a class="link" routerLink="/math-games/abacus/parent" [queryParams]="{ studentId: student.id }">🧮 Abacus levels</a>
          </div>
        </div>

        <div class="group">
          <h3 class="group-title">⭐ Rewards</h3>
          <div class="links">
            <a class="link" routerLink="/rewards/parent" [queryParams]="{ studentId: student.id }">🎁 Reward shop</a>
          </div>
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

      <app-teachers-modal
        *ngIf="teachersFor()"
        [studentId]="teachersFor()!.id"
        [studentName]="teachersFor()!.name"
        (closed)="teachersFor.set(null)"
      />

      <app-analyst-code-modal
        *ngIf="sharingStudent()"
        [studentId]="sharingStudent()!.id"
        [studentName]="sharingStudent()!.name"
        (closed)="sharingStudent.set(null)"
      />


      <section class="card error" *ngIf="errorMessage()">{{ errorMessage() }}</section>
    </main>
  `,
  styles: [
    `
      .page { max-width: 880px; margin: 0 auto; padding: 16px; display: grid; gap: 12px; }
      .card { background: #fff; border-radius: 16px; padding: 16px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08); }
      .row { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
      button { border: 0; border-radius: 12px; padding: 10px 12px; font: inherit; font-weight: 700; background: #e2e8f0; cursor: pointer; min-height: 44px; }
      button:focus-visible, .link:focus-visible, summary:focus-visible { outline: 3px solid #6366f1; outline-offset: 2px; }
      .primary { background: #2563eb; color: #fff; width: 100%; }
      .ghost { background: #f1f5f9; }

      /* One child: who they are, then reports, practice and rewards */
      .child { display: grid; gap: 14px; }
      .child-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
      .who { min-width: 0; }
      .meta { font-size: 0.9rem; color: #475569; overflow-wrap: anywhere; }
      .head-actions { display: flex; align-items: center; gap: 8px; }
      .open { background: #2563eb; color: #fff; }
      .menu { position: relative; }
      .menu summary { list-style: none; cursor: pointer; display: grid; place-items: center; width: 44px; height: 44px; border-radius: 12px; background: #f1f5f9; font-size: 1.3rem; font-weight: 800; color: #334155; }
      .menu summary::-webkit-details-marker { display: none; }
      .menu-list { position: absolute; right: 0; top: calc(100% + 6px); z-index: 5; display: grid; gap: 2px; min-width: 210px; background: #fff; border-radius: 14px; padding: 6px; box-shadow: 0 12px 32px rgba(15, 23, 42, 0.18); }
      .menu-list button { background: none; text-align: left; }
      .menu-list button:hover { background: #f1f5f9; }
      .group { display: grid; gap: 8px; border-top: 1px solid #e2e8f0; padding-top: 12px; }
      .group-title { margin: 0; font-size: 0.9rem; font-weight: 800; color: #475569; }
      .links { display: flex; flex-wrap: wrap; gap: 8px; }
      .link { display: inline-flex; align-items: center; min-height: 44px; border-radius: 12px; padding: 0 14px; font-weight: 700; background: #eef2ff; color: #3730a3; text-decoration: none; }
      .link:hover { background: #e0e7ff; }
      .hint { font-size: 0.85rem; color: #64748b; }
      h1, h2, h3, p { margin: 0; }
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
  /** The child whose analyst code is being shown. */
  readonly sharingStudent = signal<DashboardStudent | null>(null);
  /** The child whose teachers are being shown. */
  readonly teachersFor = signal<DashboardStudent | null>(null);
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
