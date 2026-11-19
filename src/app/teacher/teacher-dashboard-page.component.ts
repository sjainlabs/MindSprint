import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { TeacherProfile, TeacherService, TeacherStudent } from '../services/teacher.service';

/**
 * A teacher's home: their code to give parents, and every student parents have shared with them,
 * each with the same reports a parent sees, a way to write a test, and the study guides.
 */
@Component({
  selector: 'app-teacher-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="page">
      <header class="card row">
        <div>
          <h1>👩‍🏫 Teacher Dashboard</h1>
          <p>Students parents have shared with you.</p>
        </div>
        <button class="ghost" (click)="logout()">Logout</button>
      </header>

      <section class="card code-card" *ngIf="teacher() as t">
        <h2>Your teacher code</h2>
        <div class="code-row">
          <span class="code" aria-label="Teacher code">{{ t.code }}</span>
          <button type="button" (click)="copy(t.code)">{{ copied() ? '✓ Copied' : '📋 Copy' }}</button>
        </div>
        <p class="hint">
          Give this code to a parent. They add it to each child you teach, from their Parent Dashboard
          (⋯ → 👩‍🏫 Teachers). Each child is added separately, even brothers and sisters.
        </p>
      </section>

      <section class="card" *ngIf="loading()">Loading students…</section>
      <section class="card error" *ngIf="errorMessage()">{{ errorMessage() }}</section>

      <section class="card" *ngIf="!loading() && !errorMessage() && students().length === 0">
        <h2>No students yet</h2>
        <p>When a parent adds your code to their child, the child appears here.</p>
      </section>

      <section class="card child" *ngFor="let s of students()" [attr.aria-label]="s.name">
        <div class="child-head">
          <div class="who">
            <h2>{{ s.name }}</h2>
            <p class="meta">Grade {{ gradeText(s.grade) }} · shared {{ s.linkedAt | date: 'mediumDate' }}</p>
          </div>
          <details class="menu" #menu>
            <summary [attr.aria-label]="'More for ' + s.name">⋯</summary>
            <div class="menu-list" role="menu">
              <button role="menuitem" (click)="menu.open = false; leave(s)">🚪 Remove from my list</button>
            </div>
          </details>
        </div>

        <div class="group">
          <h3 class="group-title">📊 Reports</h3>
          <div class="links">
            <a class="link" routerLink="/student/dashboard" [queryParams]="{ studentId: s.studentId, view: 'teacher' }">📋 Learning plan</a>
            <a class="link" routerLink="/reports" [queryParams]="{ studentId: s.studentId, view: 'teacher' }">📈 Overview</a>
            <a class="link" routerLink="/reports" [queryParams]="{ studentId: s.studentId, view: 'teacher', tab: 'history' }">🗂️ Worksheet &amp; test history</a>
            <a class="link" routerLink="/reports/activity" [queryParams]="{ studentId: s.studentId, view: 'teacher' }">⏱️ Active time</a>
            <a class="link" routerLink="/daily/progress" [queryParams]="{ studentId: s.studentId, view: 'teacher' }">🗺️ Daily challenge report</a>
          </div>
        </div>

        <div class="group">
          <h3 class="group-title">✍️ Teach</h3>
          <div class="links">
            <a class="link" routerLink="/tests/manual" [queryParams]="{ studentId: s.studentId, name: s.name, from: 'teacher' }">✍️ Write a test</a>
            <a class="link" routerLink="/study-guides">📚 Study guides</a>
          </div>
        </div>
      </section>
    </main>
  `,
  styles: [
    `
      .page { max-width: 880px; margin: 0 auto; padding: 16px; display: grid; gap: 12px; }
      .card { background: #fff; border-radius: 16px; padding: 16px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08); }
      .row { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
      button { border: 0; border-radius: 12px; padding: 10px 12px; font: inherit; font-weight: 700; background: #e2e8f0; cursor: pointer; min-height: 44px; }
      button:focus-visible, .link:focus-visible, summary:focus-visible { outline: 3px solid #6366f1; outline-offset: 2px; }
      .ghost { background: #f1f5f9; }

      .code-card { display: grid; gap: 10px; }
      .code-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
      .code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 1.6rem; font-weight: 800; letter-spacing: 0.08em; color: #1e1b4b; background: #eef2ff; border-radius: 12px; padding: 6px 14px; }

      .child { display: grid; gap: 14px; }
      .child-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
      .who { min-width: 0; }
      .meta { font-size: 0.9rem; color: #475569; overflow-wrap: anywhere; }
      .menu { position: relative; }
      .menu summary { list-style: none; cursor: pointer; display: grid; place-items: center; width: 44px; height: 44px; border-radius: 12px; background: #f1f5f9; font-size: 1.3rem; font-weight: 800; color: #334155; }
      .menu summary::-webkit-details-marker { display: none; }
      .menu-list { position: absolute; right: 0; top: calc(100% + 6px); z-index: 5; display: grid; gap: 2px; min-width: 220px; background: #fff; border-radius: 14px; padding: 6px; box-shadow: 0 12px 32px rgba(15, 23, 42, 0.18); }
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
export class TeacherDashboardPageComponent implements OnInit {
  private readonly api = inject(TeacherService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly teacher = signal<TeacherProfile | null>(null);
  readonly students = signal<TeacherStudent[]>([]);
  readonly copied = signal(false);

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');
    try {
      // The profile first: it makes the code on a first visit
      this.teacher.set(await this.api.me());
      this.students.set(await this.api.myStudents());
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Unable to load your students.');
    } finally {
      this.loading.set(false);
    }
  }

  gradeText(grade: string | null): string {
    if (grade === null || grade === '') return 'not set';
    return grade === '0' || grade.toUpperCase() === 'K' ? 'K' : grade;
  }

  async copy(code: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(code);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // Clipboard blocked: the code is on screen to copy by hand
    }
  }

  async leave(student: TeacherStudent): Promise<void> {
    if (!confirm(`Remove ${student.name} from your list? Their parent would need to add your code again.`)) return;
    try {
      await this.api.leave(student.studentId);
      this.students.update((list) => list.filter((s) => s.studentId !== student.studentId));
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Unable to remove the student.');
    }
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    await this.router.navigate(['/']);
  }
}
