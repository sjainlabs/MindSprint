import {CommonModule} from '@angular/common';
import {Component, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {PracticeService} from '../../services/practice.service';

@Component({
  selector: 'app-worksheet-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './worksheet-page.html',
  styleUrl: './worksheet-page.css',
})

export class WorksheetPageComponent implements OnInit {
  worksheet: any = null;
  loading = true;
  errorMessage = '';
  currentLevel: 'Beginner' | 'Intermediate' | 'Advanced' = 'Beginner';

  answers: Record<string, number> = {};
  checkedAnswers: Record<string, boolean> = {};
  hasCheckedAnswers = false;
  accuracyPercentage: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private practiceService: PracticeService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const level = this.route.snapshot.paramMap.get('level') as
      | 'Beginner'
      | 'Intermediate'
      | 'Advanced';

    if (!level) {
      this.errorMessage = 'Invalid worksheet level.';
      this.loading = false;
      return;
    }

    this.currentLevel = level;
    this.loadWorksheet(level);
  }

  loadWorksheet(level: string) {
    this.loading = true;
    this.errorMessage = '';
    this.worksheet = null;

    this.practiceService.getPractice(<"Beginner" | "Intermediate" | "Advanced">level).subscribe({
      next: (data) => {
        this.worksheet = {
          title: `${level} Practice Worksheet`,
          level,
          instructions: 'Solve the following questions.',
          questions: data.questions,
        };

        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Failed to load worksheet.';
        this.loading = false;
      },
    });
  }

  get attemptedCount(): number {
    return Object.values(this.answers).filter((v) => v !== undefined && v !== null).length;
  }

  checkAnswers() {
    if (!this.worksheet) return;

    this.hasCheckedAnswers = true;
    this.checkedAnswers = {};

    let correct = 0;

    for (const q of this.worksheet.questions) {
      const userAnswer = this.answers[q.id];
      const isCorrect = Number(userAnswer) === q.answer;

      this.checkedAnswers[q.id] = isCorrect;
      if (isCorrect) correct++;
    }

    this.accuracyPercentage = Math.round((correct / this.worksheet.questions.length) * 100);
  }

  regenerate(level: 'Beginner' | 'Intermediate' | 'Advanced') {
    this.router.navigate(['/worksheet', level]);
  }
}

