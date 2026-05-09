import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PracticeService, WorksheetResult } from '../../services/practice.service';

@Component({
  selector: 'app-worksheet-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './worksheet-page.html',
  styleUrl: './worksheet-page.css',
})
export class WorksheetPageComponent implements OnInit {
  // ⭐ Signals replace all mutable state
  worksheet = signal<any | null>(null);
  loading = signal(true);
  ready = signal(false);
  errorMessage = signal('');

  currentLevel = signal<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');

  answers = signal<Record<string, number | null>>({});
  checkedAnswers = signal<Record<string, boolean>>({});
  hasCheckedAnswers = signal(false);
  accuracyPercentage = signal<number | null>(null);

  submitting = signal(false);
  submitError = signal('');
  result = signal<WorksheetResult | null>(null);

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
      this.errorMessage.set('Invalid worksheet level.');
      this.loading.set(false);
      return;
    }

    this.currentLevel.set(level);
    this.loadWorksheet(level);
  }

  loadWorksheet(level: string) {
    this.loading.set(true);
    this.ready.set(false);
    this.errorMessage.set('');
    this.worksheet.set(null);
    this.result.set(null);
    this.hasCheckedAnswers.set(false);
    this.checkedAnswers.set({});
    this.accuracyPercentage.set(null);
    this.submitError.set('');

    // answers must exist before template binds
    this.answers.set({});

    this.practiceService.getPractice(level as any).subscribe({
      next: (data) => {
        if (!data || !data.questions) {
          this.errorMessage.set('Invalid worksheet data received.');
          this.loading.set(false);
          return;
        }

        this.worksheet.set(data);

        // Fill answers reactively
        const answerMap: Record<string, number | null> = {};
        for (const q of data.questions) {
          answerMap[q.id] = null;
        }
        this.answers.set(answerMap);

        this.loading.set(false);
        this.ready.set(true);
      },
      error: (err) => {
        console.error('Worksheet load error:', err);
        this.errorMessage.set('Failed to load worksheet.');
        this.loading.set(false);
      },
    });
  }

  attemptedCount = computed(() =>
    Object.values(this.answers()).filter((v) => v !== null).length
  );

  checkAnswers() {
    const ws = this.worksheet();
    if (!ws) return;

    const results: Record<string, boolean> = {};
    let correct = 0;

    for (const q of ws.questions) {
      const userAnswer = this.answers()[q.id];
      const isCorrect = Number(userAnswer) === q.answer;
      results[q.id] = isCorrect;
      if (isCorrect) correct++;
    }

    this.checkedAnswers.set(results);
    this.hasCheckedAnswers.set(true);
    this.accuracyPercentage.set(
      Math.round((correct / ws.questions.length) * 100)
    );
  }

  submitWorksheet() {
    const ws = this.worksheet();
    if (!ws || this.submitting()) return;

    this.submitting.set(true);
    this.submitError.set('');

    const payload = {
      worksheetId: ws.worksheetId,
      level: this.currentLevel(),
      submittedAt: new Date().toISOString(),
      answers: Object.entries(this.answers())
        .filter(([, ans]) => ans !== null)
        .map(([id, ans]) => ({
          questionId: id,
          answer: ans,
        })),
    };

    this.practiceService.submitWorksheet(payload).subscribe({
      next: (res) => {
        this.result.set(res);
        this.accuracyPercentage.set(res.accuracy);
        this.hasCheckedAnswers.set(true);

        const map: Record<string, boolean> = {};
        for (const qr of res.questionResults) {
          map[qr.questionId] = qr.isCorrect;
        }
        this.checkedAnswers.set(map);

        this.submitting.set(false);
      },
      error: (err) => {
        console.error('Submit error:', err);
        this.submitError.set('Failed to submit worksheet.');
        this.submitting.set(false);
      },
    });
  }

  regenerate(level: 'Beginner' | 'Intermediate' | 'Advanced') {
    this.router.navigate(['/worksheet', level]);
  }

  updateAnswer(questionId: string, value: number | null) {
    this.answers.update(a => ({ ...a, [questionId]: value }));
  }

}
