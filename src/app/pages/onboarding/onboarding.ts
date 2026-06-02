import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { type GradeLevel } from '../../services/diagnostic.service';
import { OnboardingService, type ConfidenceLevel, type OnboardingGoal } from '../../services/onboarding.service';
import { LanguageToggleComponent } from '../../components/language-toggle/language-toggle';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LanguageToggleComponent, TranslatePipe],
  templateUrl: './onboarding.html',
  styleUrl: './onboarding.css',
})
export class OnboardingComponent {
  readonly t = inject(TranslationService);
  studentId = signal('student-demo');
  age = signal(9);
  grade = signal<GradeLevel>(5);
  confidenceLevel = signal<ConfidenceLevel>('medium');
  goals = signal<OnboardingGoal[]>(['explore']);
  placementScore = signal(60);
  avatar = signal('Nova');
  mathWorld = signal('Number Forest');
  loading = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  readonly goalOptions: OnboardingGoal[] = ['catch-up', 'get-ahead', 'exam-prep', 'explore'];
  readonly confidenceOptions: ConfidenceLevel[] = ['low', 'medium', 'high'];
  readonly gradeOptions: GradeLevel[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  readonly worlds = ['Number Forest', 'Fraction Galaxy', 'Algebra Arena', 'Calculus Citadel'];
  readonly avatars = ['Nova', 'Bolt', 'Iris', 'Zen'];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly authService: AuthService,
    private readonly onboardingService: OnboardingService,
    private readonly router: Router,
  ) {
    const requestedStudentId = this.route.snapshot.queryParamMap.get('studentId')?.trim() ?? '';
    const activeStudentId = requestedStudentId || this.authService.getStoredStudentId()?.trim() || '';
    if (activeStudentId) {
      this.studentId.set(activeStudentId);
      this.authService.setActiveStudentId(activeStudentId);
    }
  }

  toggleGoal(goal: OnboardingGoal): void {
    const next = new Set(this.goals());
    if (next.has(goal)) {
      next.delete(goal);
    } else {
      next.add(goal);
    }
    this.goals.set(next.size > 0 ? [...next] : ['explore']);
  }

  submit(): void {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');

    this.onboardingService
      .saveOnboarding({
        studentId: this.studentId(),
        age: this.age(),
        grade: this.grade(),
        goals: this.goals(),
        confidenceLevel: this.confidenceLevel(),
        placementScore: this.placementScore(),
        avatar: this.avatar(),
        mathWorld: this.mathWorld(),
      })
      .subscribe({
        next: () => {
          this.successMessage.set('Onboarding complete. Personalized learning path unlocked.');
          this.loading.set(false);
          this.authService.setActiveStudentId(this.studentId());
          void this.router.navigate(['/practice-hub'], {
            queryParams: { studentId: this.studentId() },
          });
        },
        error: () => {
          this.errorMessage.set('Unable to complete onboarding right now.');
          this.loading.set(false);
        },
      });
  }
}
