import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService, StudentProfile } from '../../services/auth.service';

@Component({
  selector: 'app-student-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './student-home.component.html',
  styleUrl: './student-home.component.css',
})
export class StudentHomeComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly student = signal<StudentProfile | null>(null);
  readonly parentView = signal(false);

  ngOnInit(): void {
    void this.loadStudent();
  }

  async loadStudent(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const parentSelectedStudentId = this.route.snapshot.queryParamMap.get('studentId');
      const isParent = this.authService.isParentLoggedIn() && !!parentSelectedStudentId;
      const studentId = parentSelectedStudentId ?? this.authService.getStoredStudentId();

      if (!studentId) {
        throw new Error('Student session not found. Please login again.');
      }

      this.parentView.set(isParent);
      const student = await this.authService.getStudentProfile(studentId);
      if (!student) {
        throw new Error('Student profile not found.');
      }
      this.student.set(student);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Unable to load student profile.');
    } finally {
      this.loading.set(false);
    }
  }

  async logout(): Promise<void> {
    if (this.parentView()) {
      await this.router.navigate(['/parent/dashboard']);
      return;
    }

    this.authService.logoutStudent();
    await this.router.navigate(['/login/student']);
  }

  hasMasteryEntries(student: StudentProfile): boolean {
    return Object.keys(student.masteryMap).length > 0;
  }
}
