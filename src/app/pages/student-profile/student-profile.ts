import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RouterLink } from '@angular/router';
import {
  DEFAULT_STUDENT_ID,
  StudentIntelligenceService,
  type StudentProfile,
} from '../../services/student-intelligence.service';
import { OnboardingService, type OnboardingProfile } from '../../services/onboarding.service';
import { LanguageToggleComponent } from '../../components/language-toggle/language-toggle';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-student-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    LanguageToggleComponent,
  ],
  templateUrl: './student-profile.html',
  styleUrl: './student-profile.css',
})
export class StudentProfileComponent implements OnInit {
  studentId = signal(DEFAULT_STUDENT_ID);
  studentName = signal('');
  profile = signal<StudentProfile | null>(null);
  onboarding = signal<OnboardingProfile | null>(null);
  loading = signal(false);
  onboardingLoading = signal(false);
  errorMessage = signal('');
  onboardingErrorMessage = signal('');

  constructor(
    private readonly route: ActivatedRoute,
    private readonly authService: AuthService,
    private readonly studentIntelligenceService: StudentIntelligenceService,
    private readonly onboardingService: OnboardingService,
  ) {}

  ngOnInit(): void {
    const requestedStudentId = this.route.snapshot.queryParamMap.get('studentId')?.trim() ?? '';
    const activeStudentId = requestedStudentId || this.authService.getStoredStudentId()?.trim() || '';
    if (activeStudentId) {
      this.studentId.set(activeStudentId);
      this.authService.setActiveStudentId(activeStudentId);
      void this.resolveStudentName(activeStudentId);
    }

    this.loadProfile();
  }

  loadProfile(): void {
    const activeStudentId = this.studentId().trim() || this.authService.getStoredStudentId()?.trim() || '';
    if (!activeStudentId || activeStudentId === DEFAULT_STUDENT_ID) {
      this.errorMessage.set('Student not found. Select a child from the parent dashboard first.');
      this.onboarding.set(null);
      this.profile.set(null);
      this.loading.set(false);
      this.onboardingLoading.set(false);
      return;
    }

    this.studentId.set(activeStudentId);
    this.authService.setActiveStudentId(activeStudentId);
    void this.resolveStudentName(activeStudentId);
    this.loading.set(true);
    this.onboardingLoading.set(true);
    this.errorMessage.set('');
    this.onboardingErrorMessage.set('');

    this.studentIntelligenceService.getStudentProfile(this.studentId()).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.loading.set(false);
      },
      error: () => {
        this.profile.set(null);
        this.errorMessage.set('Unable to load student profile.');
        this.loading.set(false);
      },
    });

    this.onboardingService.getOnboarding(this.studentId()).subscribe({
      next: (onboarding) => {
        this.onboarding.set(onboarding);
        this.onboardingLoading.set(false);
      },
      error: () => {
        this.onboarding.set(null);
        this.onboardingErrorMessage.set('Onboarding details are not available yet.');
        this.onboardingLoading.set(false);
      },
    });
  }

  private async resolveStudentName(studentId: string): Promise<void> {
    try {
      const student = await this.authService.getStudentProfile(studentId);
      this.studentName.set(student?.name?.trim() || 'Student');
    } catch {
      this.studentName.set('Student');
    }
  }
}
