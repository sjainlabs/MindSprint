import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { QuestionCard } from '../../components/question-card/question-card';
import { TimerBar } from '../../components/timer-bar/timer-bar';
import { XpProgress } from '../../components/xp-progress/xp-progress';

@Component({
  selector: 'app-assessment-science',
  imports: [
    RouterLink,
    QuestionCard,
    TimerBar,
    XpProgress
  ],
  templateUrl: './assessment-science.html',
  styleUrl: './assessment-science.css',
})
export class AssessmentScience {

}
