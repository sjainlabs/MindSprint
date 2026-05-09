import {CommonModule} from '@angular/common';
import {Component, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {PracticeService, type WorksheetResult} from '../../services/practice.service';

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

  submitting = false;
  submitError = '';
  result: WorksheetResult | null = null;

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
    this.result = null;
    this.hasCheckedAnswers = false;
    this.checkedAnswers = {};
    this.accuracyPercentage = null;
    this.answers = {};
    this.submitError = '';

    this.practiceService.getPractice(<"Beginner" | "Intermediate" | "Advanced">level).subscribe({
      next: (data) => {
        if (!data || !data.questions) {
          this.errorMessage = 'Received an empty or invalid worksheet response.';
          this.loading = false;
          return;
        }

        this.worksheet = {
          worksheetId: data.worksheetId,
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

  submitWorksheet() {
    if (!this.worksheet || this.submitting) return;

    this.submitting = true;
    this.submitError = '';

    const payload = {
      worksheetId: this.worksheet.worksheetId,
      level: this.currentLevel,
      submittedAt: new Date().toISOString(),
      answers: Object.entries(this.answers)
          .filter(([, ans]) => ans !== undefined && ans !== null)
          .map(([id, ans]) => ({
            questionId: id,
            answer: ans,
          })),
    };

    this.practiceService.submitWorksheet(payload).subscribe({
      next: (res) => {
        this.result = res;
        this.accuracyPercentage = res.accuracy;
        this.hasCheckedAnswers = true;
        this.checkedAnswers = {};
        for (const qr of res.questionResults) {
          this.checkedAnswers[qr.questionId] = qr.isCorrect;
        }
        this.submitting = false;
      },
      error: (err) => {
        console.error(err);
        this.submitError = 'Failed to submit worksheet. Please try again.';
        this.submitting = false;
      },
    });
  }

  regenerate(level: 'Beginner' | 'Intermediate' | 'Advanced') {
    this.router.navigate(['/worksheet', level]);
  }
}

