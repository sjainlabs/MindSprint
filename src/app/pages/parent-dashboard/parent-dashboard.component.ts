import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, ParentProfile, StudentProfile } from '../../services/auth.service';
import { ParentAccessService } from '../../services/parent-access.service';
import { AddChildModalComponent, AddChildPayload } from './add-child-modal.component';
import { EditChildModalComponent, EditChildPayload } from './edit-child-modal.component';
import { StudentInsightsComponent } from '../student-profile/student-insights.component';
import { InsightsService } from '../../services/insights.service';
import type { TopicInsight } from '../../services/insights.types';

@Component({
  selector: 'app-parent-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AddChildModalComponent, EditChildModalComponent, StudentInsightsComponent],
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
  readonly statusMessage = signal('');
  readonly profile = signal<ParentProfile | null>(null);
  readonly students = signal<StudentProfile[]>([]);

  readonly addChildModalOpen = signal(false);
  readonly editChildModalOpen = signal(false);
  readonly selectedStudent = signal<StudentProfile | null>(null);
  // Insight modal state
  readonly insightOpen = signal(false);
  readonly insightStudent = signal<StudentProfile | null>(null);
  // Topic insight inline state
  readonly topicInsightLoading = signal(false);
  readonly topicInsightError = signal('');
  readonly topicInsightData = signal<TopicInsight | null>(null);
  readonly topicInsightStudentId = signal<string | null>(null);
  readonly topicInsightTopicId = signal<string | null>(null);

  private readonly insightsService = inject(InsightsService);

  readonly accessCode = signal('');
  readonly validatingAccessCode = signal(false);
  readonly accessCodeErrorMessage = signal('');
  readonly accessCodeSuccessMessage = signal('');

  ngOnInit(): void {
    console.log('[ParentDashboard] Component initialized');
    void this.loadDashboard();
  }

  openInsights(student: StudentProfile): void {
    this.insightStudent.set(student);
    this.insightOpen.set(true);
  }

  closeInsights(): void {
    this.insightOpen.set(false);
    this.insightStudent.set(null);
  }

  async openTopicInsight(studentId: string, topicId: string): Promise<void> {
    this.topicInsightLoading.set(true);
    this.topicInsightError.set('');
    this.topicInsightData.set(null);
    this.topicInsightStudentId.set(studentId);
    this.topicInsightTopicId.set(topicId);

    try {
      const obs = this.insightsService.getTopicInsight(studentId, topicId);
      // subscribe once
      obs.subscribe({
        next: (data) => {
          this.topicInsightData.set(data);
          this.topicInsightLoading.set(false);
        },
        error: (err) => {
          this.topicInsightError.set(err?.message ?? 'Unable to load topic insight.');
          this.topicInsightLoading.set(false);
        },
      });
    } catch (err) {
      this.topicInsightError.set(err instanceof Error ? err.message : 'Unable to load topic insight.');
      this.topicInsightLoading.set(false);
    }
  }

  closeTopicInsight(): void {
    this.topicInsightLoading.set(false);
    this.topicInsightError.set('');
    this.topicInsightData.set(null);
    this.topicInsightStudentId.set(null);
    this.topicInsightTopicId.set(null);
  }

  async loadDashboard(): Promise<void> {
    console.log('[ParentDashboard] Loading dashboard...');
    this.loading.set(true);
    this.errorMessage.set('');
    this.statusMessage.set('');

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

  openAddChildModal(): void {
    this.errorMessage.set('');
    this.statusMessage.set('');
    this.addChildModalOpen.set(true);
  }

  closeAddChildModal(): void {
    this.addChildModalOpen.set(false);
  }

  openEditChildModal(student: StudentProfile): void {
    this.errorMessage.set('');
    this.statusMessage.set('');
    this.selectedStudent.set(student);
    this.editChildModalOpen.set(true);
  }

  closeEditChildModal(): void {
    this.editChildModalOpen.set(false);
    this.selectedStudent.set(null);
  }

  async addStudent(payload: AddChildPayload): Promise<void> {
    if (!payload.name.trim() || !payload.grade.trim()) {
      this.errorMessage.set('Please enter child name and grade.');
      return;
    }

    this.savingStudent.set(true);
    this.errorMessage.set('');
    this.statusMessage.set('');

    try {
      const student = await this.authService.addStudentForParent({
        name: payload.name,
        grade: payload.grade,
        avatar: payload.avatar,
      });
      await this.loadDashboard();
      this.statusMessage.set(`Added ${student.name}. Login code: ${student.loginCode}`);
      this.addChildModalOpen.set(false);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Unable to add child. Please try again.');
    } finally {
      this.savingStudent.set(false);
    }
  }

  async saveStudentEdits(payload: EditChildPayload): Promise<void> {
    if (!payload.name.trim() || !payload.grade.trim()) {
      this.errorMessage.set('Please enter child name and grade.');
      return;
    }

    this.savingStudent.set(true);
    this.errorMessage.set('');
    this.statusMessage.set('');

    try {
      const updated = await this.authService.updateStudentForParent(payload.id, {
        name: payload.name,
        grade: payload.grade,
        avatar: payload.avatar,
      });

      await this.loadDashboard();
      this.statusMessage.set(`Saved updates for ${updated.name}.`);
      this.closeEditChildModal();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Unable to update child profile.');
    } finally {
      this.savingStudent.set(false);
    }
  }

  async deleteStudent(studentId: string): Promise<void> {
    this.savingStudent.set(true);
    this.errorMessage.set('');
    this.statusMessage.set('');

    try {
      const student = this.students().find((entry) => entry.id === studentId) ?? null;
      await this.authService.deleteStudentForParent(studentId);
      await this.loadDashboard();
      this.statusMessage.set(student ? `Removed ${student.name}.` : 'Child removed.');
      this.closeEditChildModal();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Unable to remove child.');
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

  startLearning(studentId: string): void {
    void this.router.navigate(['/student/home'], { queryParams: { studentId } });
  }

  getMasteryPercent(student: StudentProfile): number {
    const values = Object.values(student.masteryMap ?? {});
    if (values.length === 0) {
      return 0;
    }
    const total = values.reduce((sum, value) => sum + value, 0);
    return Math.round(total / values.length);
  }

  async logout(): Promise<void> {
    this.parentAccessService.clearAccess();
    await this.authService.logout();
    await this.router.navigate(['/login/parent']);
  }
}
