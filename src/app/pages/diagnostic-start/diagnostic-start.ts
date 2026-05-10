import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DiagnosticService, type GradeLevel } from '../../services/diagnostic.service';

@Component({
  selector: 'app-diagnostic-start',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './diagnostic-start.html',
  styleUrl: './diagnostic-start.css',
})
export class DiagnosticStartComponent {
  loading = false;
  errorMessage = '';
  age = 8;
  grade: GradeLevel = 4;
  studentId = 'student-demo';
  eligibilityLoading = false;
  nextGradeLoading = false;
  validationMessage = '';
  readonly gradeOptions: GradeLevel[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  constructor(
    readonly diagnosticService: DiagnosticService,
    private readonly router: Router,
  ) {}

  refreshEligibility(): void {
    this.eligibilityLoading = true;
    this.nextGradeLoading = true;
    this.errorMessage = '';
    this.validationMessage = '';
    this.diagnosticService.getEligibility(this.age, this.grade, this.studentId).subscribe({
      next: (eligibility) => {
        this.diagnosticService.eligibility = eligibility;
        this.eligibilityLoading = false;
        this.validationMessage = eligibility.canAttemptCurrentGrade
          ? `Eligible to attempt ${this.gradeLabel(this.grade)}.`
          : `Locked: age suggests up to ${this.gradeLabel(eligibility.ageSuggestedGrade)} (${eligibility.ageSuggestedTrack}).`;
        this.refreshNextGrade();
      },
      error: () => {
        this.eligibilityLoading = false;
        this.nextGradeLoading = false;
        this.errorMessage = 'Unable to load diagnostic eligibility right now.';
      },
    });
  }

  refreshNextGrade(): void {
    this.nextGradeLoading = true;
    this.diagnosticService.getNextGrade(this.age, this.grade, this.studentId).subscribe({
      next: (nextGrade) => {
        this.diagnosticService.nextGrade = nextGrade;
        this.nextGradeLoading = false;
      },
      error: () => {
        this.nextGradeLoading = false;
      },
    });
  }

  startDiagnostic(): void {
    if (!this.diagnosticService.eligibility?.canAttemptCurrentGrade) {
      this.errorMessage = 'This grade diagnostic is currently locked for your profile.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.diagnosticService.startDiagnostic().subscribe({
      next: (test) => {
        this.diagnosticService.currentTest = test;
        this.diagnosticService.startedAt = new Date();
        this.diagnosticService.lastResult = null;
        this.diagnosticService.eligibility = {
          ...this.diagnosticService.eligibility!,
          age: this.age,
          enrolledGrade: this.grade,
          studentId: this.studentId,
        };
        this.loading = false;
        void this.router.navigate(['/diagnostic/test']);
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Unable to start diagnostic. Please try again.';
      },
    });
  }

  ngOnInit(): void {
    this.refreshEligibility();
  }

  gradeLabel(grade: GradeLevel): string {
    return grade === 0 ? 'Kindergarten' : `Grade ${grade}`;
  }
}
