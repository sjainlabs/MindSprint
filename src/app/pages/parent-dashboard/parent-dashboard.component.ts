import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, ParentProfile, StudentProfile } from '../../services/auth.service';
import { ParentAccessService } from '../../services/parent-access.service';

@Component({
  selector: 'app-parent-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './parent-dashboard.component.html',
  styleUrl: './parent-dashboard.component.css',
})
export class ParentDashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly parentAccessService = inject(ParentAccessService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly savingStudent = signal(false);
  readonly errorMessage = signal('');
  readonly profile = signal<ParentProfile | null>(null);
  readonly students = signal<StudentProfile[]>([]);

  readonly newStudentName = signal('');
  readonly newStudentGrade = signal('');
  readonly newStudentAvatar = signal('🧠');
  readonly accessCode = signal('');
  readonly validatingAccessCode = signal(false);
  readonly accessCodeErrorMessage = signal('');
  readonly accessCodeSuccessMessage = signal('');

  ngOnInit(): void {
    void this.loadDashboard();
  }

  async loadDashboard(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const profile = await this.authService.getParentProfile();
      if (!profile) {
        throw new Error('Parent profile not found.');
      }

      this.profile.set(profile);
      this.students.set(await this.authService.getStudentsForParent(profile.id));
    } catch {
      this.errorMessage.set('Unable to load parent dashboard.');
    } finally {
      this.loading.set(false);
    }
  }

  async addStudent(): Promise<void> {
    if (!this.newStudentName().trim() || !this.newStudentGrade().trim()) {
      this.errorMessage.set('Please enter student name and grade.');
      return;
    }

    this.savingStudent.set(true);
    this.errorMessage.set('');

    try {
      const student = await this.authService.addStudentForParent({
        name: this.newStudentName(),
        grade: this.newStudentGrade(),
        avatar: this.newStudentAvatar(),
      });
      this.students.update((list) => [...list, student]);
      this.newStudentName.set('');
      this.newStudentGrade.set('');
      this.newStudentAvatar.set('🧠');
    } catch {
      this.errorMessage.set('Unable to add student. Please try again.');
    } finally {
      this.savingStudent.set(false);
    }
  }

  async unlockStudentMaterials(): Promise<void> {
    const enteredAccessCode = this.accessCode().trim();
    if (!enteredAccessCode) {
      this.accessCodeErrorMessage.set('Please enter a student access code.');
      this.accessCodeSuccessMessage.set('');
      return;
    }

    this.validatingAccessCode.set(true);
    this.accessCodeErrorMessage.set('');
    this.accessCodeSuccessMessage.set('');
    this.parentAccessService.clearAccess();

    try {
      const student = await this.parentAccessService.validateAccessCode(enteredAccessCode);
      await this.parentAccessService.loadUnlockedMaterials();
      this.accessCodeSuccessMessage.set(`Unlocked materials for ${student.name}.`);
      await this.router.navigate(['/parent/materials']);
    } catch (error) {
      this.accessCodeErrorMessage.set(
        error instanceof Error ? error.message : 'Unable to validate student access code.',
      );
    } finally {
      this.validatingAccessCode.set(false);
    }
  }

  viewStudent(studentId: string): void {
    void this.router.navigate(['/student/home'], { queryParams: { studentId } });
  }

  async logout(): Promise<void> {
    this.parentAccessService.clearAccess();
    await this.authService.logout();
    await this.router.navigate(['/login/parent']);
  }
}
