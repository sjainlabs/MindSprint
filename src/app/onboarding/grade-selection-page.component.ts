import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CurriculumApiService } from '../services/curriculum-api.service';
import { OnboardingFlowService } from '../services/onboarding-flow.service';

@Component({
  selector: 'app-grade-selection-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="page">
      <section class="card">
        <h1>Choose Your Grade</h1>
        <div class="grid">
          <button
            *ngFor="let grade of grades()"
            (click)="selectedGrade.set(grade)"
            [class.active]="selectedGrade() === grade"
          >
            {{ grade }}
          </button>
        </div>
        <button class="primary" (click)="continue()" [disabled]="!selectedGrade()">Continue</button>
      </section>
    </main>
  `,
  styles: [
    `
      .page { max-width: 700px; margin: 0 auto; padding: 16px; }
      .card { background: #fff; border-radius: 16px; padding: 16px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08); display: grid; gap: 12px; }
      .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
      button { border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px; font-weight: 700; background: #fff; }
      button.active { border-color: #2563eb; background: #dbeafe; color: #1e3a8a; }
      .primary { border: 0; background: #2563eb; color: #fff; }
      .primary:disabled { opacity: 0.6; }
      h1 { margin: 0; }
    `,
  ],
})
export class GradeSelectionPageComponent implements OnInit {
  private readonly curriculumApi = inject(CurriculumApiService);
  private readonly onboarding = inject(OnboardingFlowService);
  private readonly router = inject(Router);

  readonly grades = signal<string[]>(['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']);
  readonly selectedGrade = signal(this.onboarding.getState().grade);

  ngOnInit(): void {
    this.curriculumApi.getAllGrades().subscribe({
      next: (grades) => this.grades.set(grades),
      error: () => { /* keep default grade list */ },
    });
  }

  async continue(): Promise<void> {
    if (!this.selectedGrade()) {
      return;
    }

    this.onboarding.setState({
      grade: this.selectedGrade(),
      topics: [],
    });
    await this.router.navigate(['/onboarding/topic-selection']);
  }
}
