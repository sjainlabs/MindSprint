import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PracticeService, type Worksheet } from '../../services/practice.service';
import { type LearningLevel } from '../../services/diagnostic.service';

@Component({
  selector: 'app-worksheet-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './worksheet-page.html',
  styleUrl: './worksheet-page.css',
})
export class WorksheetPageComponent implements OnInit {
  worksheet: Worksheet | null = null;
  answers: Record<string, number | null> = {};
  currentLevel: LearningLevel = 'Beginner';
  loading = false;
  errorMessage = '';

  constructor(
    private readonly practiceService: PracticeService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const level = this.resolveLevel(params.get('level'));
      this.loadWorksheet(level);
    });
  }

  regenerate(level: LearningLevel): void {
    this.router.navigate(['/worksheet', level]);
  }

  get attemptedCount(): number {
    return Object.values(this.answers).filter((answer) => answer !== null).length;
  }

  get accuracyPercentage(): number | null {
    if (!this.worksheet) {
      return null;
    }

    const scoredQuestions = this.worksheet.questions
      .map((question) => {
        const answer = this.answers[question.id];

        if (answer == null) {
          return null;
        }

        const expectedAnswer = this.solvePrompt(question.prompt);
        return Number.isFinite(expectedAnswer) ? answer === expectedAnswer : null;
      })
      .filter((result): result is boolean => result !== null);

    if (!scoredQuestions.length) {
      return null;
    }

    const correct = scoredQuestions.filter(Boolean).length;
    return Math.round((correct / scoredQuestions.length) * 100);
  }

  private resolveLevel(levelParam: string | null): LearningLevel {
    return levelParam === 'Beginner' || levelParam === 'Intermediate' || levelParam === 'Advanced'
      ? levelParam
      : 'Beginner';
  }

  private loadWorksheet(level: LearningLevel): void {
    this.currentLevel = level;
    this.loading = true;
    this.errorMessage = '';
    this.worksheet = null;

    this.practiceService.getWorksheet(level).subscribe({
      next: (worksheet) => {
        this.worksheet = {
          ...worksheet,
          questions: worksheet.questions.slice(0, 10),
        };
        this.answers = Object.fromEntries(this.worksheet.questions.map((question) => [question.id, null]));
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Unable to generate worksheet. Please try again.';
      },
    });
  }

  private solvePrompt(prompt: string): number {
    const expression = prompt.replace('= ?', '').trim();
    const tokens = expression.split(' ');
    if (tokens.length !== 3) {
      return Number.NaN;
    }

    const leftOperand = Number(tokens[0]);
    const operator = tokens[1];
    const rightOperand = Number(tokens[2]);
    if (!Number.isFinite(leftOperand) || !Number.isFinite(rightOperand)) {
      return Number.NaN;
    }

    if (operator === '+') {
      return leftOperand + rightOperand;
    }

    if (operator === '-') {
      return leftOperand - rightOperand;
    }

    if (operator === '×') {
      return leftOperand * rightOperand;
    }

    if (operator === '÷') {
      return rightOperand === 0 ? Number.NaN : leftOperand / rightOperand;
    }

    return Number.NaN;
  }
}
