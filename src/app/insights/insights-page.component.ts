import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import {FullInsightsResponse, LearningApiService, PracticeWorksheetV2Response} from '../services/learning-api.service';
import {firstValueFrom} from 'rxjs';

@Component({
  selector: 'app-simple-insights-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './insights-page.component.html',
  styleUrls: ['./insights-page.component.css'],
})
export class InsightsPageComponent implements OnInit {
  private readonly api = inject(LearningApiService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly insights = signal<FullInsightsResponse | null>(null);

  readonly worksheetHistory = signal<any[]>([]);
  readonly expandedRows = signal<Record<string, boolean>>({});
  readonly showCorrect = signal<Record<string, boolean>>({});
  readonly correctionMode = signal<Record<string, boolean>>({});
  readonly correctionAnswers = signal<Record<string, Record<string, string>>>({});
  readonly correctionAttemptCount = signal<Record<string, number>>({});
  readonly correctionMaxAttempts = signal<Record<string, number>>({});


  toggleRow(id: string) {
    this.expandedRows.update(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  }

  toggleCorrect(qid: string) {
    this.showCorrect.update(prev => ({
      ...prev,
      [qid]: !prev[qid]
    }));
  }

  async ngOnInit(): Promise<void> {
    const studentId = this.authService.getStoredStudentId();

    if (!studentId) {
      this.errorMessage.set('No active student.');
      this.loading.set(false);
      return;
    }

    try {
      const result = await this.api.getFullInsights(studentId);
      this.insights.set(result);
      const history = await this.api.getWorksheetHistory(studentId);

      // Sort newest → oldest
      history.sort((a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );

      const attemptMap: Record<string, number> = {};
      const maxMap: Record<string, number> = {};
      const answerMap: Record<string, Record<string, string>> = {};
      for (const w of history) {
        attemptMap[w.worksheetId] = w.attemptCount ?? 0;
        maxMap[w.worksheetId] = w.maxAttempts ?? 2;

        // Store answers for editing
        const ans: Record<string, string> = {};
        for (const q of w.details) {
          ans[q.questionId] = q.submittedAnswer;
        }
        answerMap[w.worksheetId] = ans;
      }

      this.correctionAttemptCount.set(attemptMap);
      this.correctionMaxAttempts.set(maxMap);
      this.correctionAnswers.set(answerMap);

      this.worksheetHistory.set(history);
    } catch {
      this.errorMessage.set('Unable to load insights right now.');
    } finally {
      this.loading.set(false);
    }
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }

  startCorrection(worksheetId: string) {
    const attempts = this.correctionAttemptCount()[worksheetId];
    const max = this.correctionMaxAttempts()[worksheetId];

    if (attempts >= max) return; // locked

    this.correctionMode.update(prev => ({
      ...prev,
      [worksheetId]: true
    }));
  }

  exitCorrection(worksheetId: string) {
    this.correctionMode.update(prev => ({
      ...prev,
      [worksheetId]: false
    }));
  }

  updateCorrectionAnswer(worksheetId: string, questionId: string, value: string) {
    const current = this.correctionAnswers()[worksheetId];

    this.correctionAnswers.update(prev => ({
      ...prev,
      [worksheetId]: {
        ...current,
        [questionId]: value
      }
    }));
  }

  async submitCorrection(worksheetId: string) {
    const studentId = this.authService.getStoredStudentId();
    if (!studentId) return;

    const answers = this.correctionAnswers()[worksheetId];

    const payload = {
      worksheetId,
      studentId,
      answers,
      submittedAt: new Date().toISOString()
    };

    const idempotencyKey = crypto.randomUUID();

    try {
      // ⭐ FIX: remove double await + correct typing
      const response: any = await firstValueFrom(
        await this.api.submitPracticeWorksheetV1(payload, idempotencyKey)
      );



      this.correctionAttemptCount.update(prev => ({
        ...prev,
        [worksheetId]: response.attemptCount
      }));

      const updatedHistory = this.worksheetHistory().map(w =>
        w.worksheetId === worksheetId ? { ...w, details: response.results } : w
      );

      this.worksheetHistory.set(updatedHistory);

      this.exitCorrection(worksheetId);

    } catch (err) {
      console.error(err);
      alert("Unable to submit corrections.");
    }
  }



}
