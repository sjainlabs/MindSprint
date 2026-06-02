import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService, StudentProfile } from '../../services/auth.service';
import { InsightsService } from '../../services/insights.service';

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
  // recommendation UI state
  readonly recommendation = signal<any | null>(null);
  readonly recommendationLoading = signal(false);
  readonly recommendationError = signal('');
  readonly streakIndicator = signal(0);
  readonly progressPercent = signal(0);

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
      this.authService.setActiveStudentId(studentId);
      const student = await this.authService.getStudentProfile(studentId);
      if (!student) {
        throw new Error('Student profile not found.');
      }
      this.student.set(student);
      // load recommendation once student is set
      void this.loadRecommendation(student);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Unable to load student profile.');
    } finally {
      this.loading.set(false);
    }
  }

  async loadRecommendation(student: StudentProfile | null): Promise<void> {
    if (!student) return;
    this.recommendationLoading.set(true);
    this.recommendationError.set('');
    try {
      const insights = inject(InsightsService);
      // call recommendation endpoint (topic optional)
      const sub = await insights.getRecommendation(student.id ?? '').toPromise?.();
      // Some environments may not have toPromise; fall back to subscribe
      if (sub === undefined) {
        insights.getRecommendation(student.id ?? '').subscribe({
          next: (res) => {
            this.recommendation.set(res);
            this.recommendationLoading.set(false);
            // map UI fields if present
            this.streakIndicator.set(res?.streak ?? this.streakIndicator());
            this.progressPercent.set(res?.progressPercent ?? this.progressPercent());
          },
          error: (err) => {
            this.recommendationError.set(err?.message ?? 'Unable to load recommendation');
            this.recommendationLoading.set(false);
          },
        });
      } else {
        this.recommendation.set(sub);
        this.recommendationLoading.set(false);
        this.streakIndicator.set((sub as any)?.streak ?? this.streakIndicator());
        this.progressPercent.set((sub as any)?.progressPercent ?? this.progressPercent());
      }
    } catch (err: any) {
      this.recommendationError.set(err?.message ?? 'Unable to load recommendation');
      this.recommendationLoading.set(false);
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

  async goToPracticeHub(): Promise<void> {
    const studentId = this.student()?.id;
    await this.router.navigate(['/practice-hub'], {
      queryParams: studentId ? { studentId } : undefined,
    });
  }

  hasMasteryEntries(student: StudentProfile): boolean {
    return Object.keys(student.masteryMap).length > 0;
  }

  // Template helper used to detect array rationale
  isArray(v: any): boolean {
    return Array.isArray(v);
  }
}
