import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ParentReportComponent, AssessmentResult } from '../../components/parent-report/parent-report.component';
import { AvatarSelectorComponent } from '../../components/avatar-selector/avatar-selector.component';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule, ParentReportComponent, AvatarSelectorComponent],
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.css']
})
export class ResultsComponent {
  studentName = 'Super Student';
  totalXP = 95;
  
  results: AssessmentResult[] = [
    {
      subject: 'Math',
      score: 3,
      totalQuestions: 3,
      timeSpent: '2 min 15 sec',
      xpEarned: 30
    },
    {
      subject: 'English',
      score: 2,
      totalQuestions: 3,
      timeSpent: '1 min 45 sec',
      xpEarned: 20
    },
    {
      subject: 'Science',
      score: 3,
      totalQuestions: 3,
      timeSpent: '2 min 30 sec',
      xpEarned: 30
    }
  ];
  
  constructor(private router: Router) {}
  
  startOver() {
    this.router.navigate(['/welcome']);
  }
}
