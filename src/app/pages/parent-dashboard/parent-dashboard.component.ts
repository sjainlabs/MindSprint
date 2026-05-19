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
    console.log('[ParentDashboard] Component initialized');
    void this.loadDashboard();
  }

  async loadDashboard(): Promise<void> {
    console.log('[ParentDashboard] Loading dashboard...');
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      console.log('[ParentDashboard] Current user:', this.authService.getCurrentUser()?.email);

      // Wait briefly for network to be ready
      console.log('[ParentDashboard] Ensuring network is ready...');
      await this.waitForNetworkReady();

      const profile = await this.authService.getParentProfile();
      console.log('[ParentDashboard] Parent profile result:', profile?.email ?? 'null');

      if (!profile) {
        console.error('[ParentDashboard] Parent profile is null');
        const errorMsg = 'Unable to load profile. Please check your internet connection and try again.';
        this.errorMessage.set(errorMsg);
        this.loading.set(false);
        return;
      }

      this.profile.set(profile);
      console.log('[ParentDashboard] Profile set, loading students...');
      const students = await this.authService.getStudentsForParent(profile.id);
      console.log('[ParentDashboard] Students loaded:', students.length);
      this.students.set(students);
      console.log('[ParentDashboard] Dashboard loaded successfully');
    } catch (error) {
      console.error('[ParentDashboard] Error loading dashboard:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unable to load parent dashboard.';

      // Check if it's an offline error
      if (errorMsg.includes('offline')) {
        this.errorMessage.set('You appear to be offline. Please check your internet connection.');
      } else {
        this.errorMessage.set(errorMsg);
      }
    } finally {
      this.loading.set(false);
    }
  }

  private async waitForNetworkReady(): Promise<void> {
    // Check if browser is online
    if (!navigator.onLine) {
      console.log('[ParentDashboard] Browser is offline, waiting for connection...');
      await new Promise<void>(resolve => {
        const handler = () => {
          console.log('[ParentDashboard] Browser came online');
          window.removeEventListener('online', handler);
          resolve();
        };
        window.addEventListener('online', handler);
        // Timeout after 5 seconds
        setTimeout(resolve, 5000);
      });
    }

    // Small delay to ensure Firestore is ready
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  async addStudent(): Promise<void> {
    console.log('[ParentDashboard] Add student clicked');
    if (!this.newStudentName().trim() || !this.newStudentGrade().trim()) {
      console.log('[ParentDashboard] Invalid input - name or grade missing');
      this.errorMessage.set('Please enter student name and grade.');
      return;
    }

    this.savingStudent.set(true);
    this.errorMessage.set('');

    try {
      console.log('[ParentDashboard] Creating student:', this.newStudentName(), this.newStudentGrade());
      const student = await this.authService.addStudentForParent({
        name: this.newStudentName(),
        grade: this.newStudentGrade(),
        avatar: this.newStudentAvatar(),
      });
      console.log('[ParentDashboard] Student created:', student.name, 'Code:', student.loginCode);
      this.students.update((list) => [...list, student]);
      this.newStudentName.set('');
      this.newStudentGrade.set('');
      this.newStudentAvatar.set('🧠');
    } catch (error) {
      console.error('[ParentDashboard] Error adding student:', error);
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
