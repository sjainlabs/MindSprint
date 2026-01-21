import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface AssessmentResult {
  subject: string;
  score: number;
  totalQuestions: number;
  timeSpent: string;
  xpEarned: number;
}

@Component({
  selector: 'app-parent-report',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './parent-report.component.html',
  styleUrls: ['./parent-report.component.css']
})
export class ParentReportComponent {
  @Input() studentName: string = 'Student';
  @Input() results: AssessmentResult[] = [];
  
  get totalXP(): number {
    return this.results.reduce((sum, result) => sum + result.xpEarned, 0);
  }
  
  get averageScore(): number {
    if (this.results.length === 0) return 0;
    const total = this.results.reduce((sum, result) => sum + (result.score / result.totalQuestions * 100), 0);
    return total / this.results.length;
  }
}
