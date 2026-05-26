import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InsightsService } from '../../services/insights.service';

interface Question {
  questionId: string;
  prompt: string;
}

@Component({
  selector: 'app-worksheet',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './worksheet.component.html',
})
export class WorksheetComponent implements OnInit {
  private readonly insights = inject(InsightsService);

  // sample questions; in real app these come from backend
  questions: Question[] = [
    { questionId: 'q1', prompt: '5 + 3 = ?' },
    { questionId: 'q2', prompt: '7 - 2 = ?' },
    { questionId: 'q3', prompt: '4 × 2 = ?' },
  ];

  currentIndex = 0;
  answer = '';
  answers: Array<{ questionId: string; answer: string; correct?: boolean; timeMs?: number }> = [];
  loading = false;
  feedback = '';
  studentId = 'demo-student';
  topicId = 'addition';

  ngOnInit(): void {}

  next(): void {
    if (!this.answer) {
      this.feedback = 'Please enter an answer.';
      return;
    }
    const q = this.questions[this.currentIndex];
    this.answers.push({ questionId: q.questionId, answer: this.answer, timeMs: 0 });
    this.answer = '';
    this.feedback = '';
    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex += 1;
    }
  }

  submit(): void {
    // gather payload and POST to backend
    const payload = {
      studentId: this.studentId,
      topicId: this.topicId,
      worksheetId: `worksheet-${Date.now()}`,
      answers: this.answers,
      metadata: { submittedAt: new Date().toISOString() },
    };

    this.loading = true;
    this.feedback = '';
    this.insights.submitWorksheetResults(payload).subscribe({
      next: (res) => {
        this.loading = false;
        this.feedback = res?.message || 'Worksheet submitted successfully.';
      },
      error: (err) => {
        this.loading = false;
        this.feedback = err?.message || 'Failed to submit worksheet.';
      },
    });
  }

  percentComplete(): number {
    return Math.round((this.answers.length / this.questions.length) * 100);
  }
}

