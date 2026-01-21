import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { QuestionCard } from '../../components/question-card/question-card';
import { TimerBar } from '../../components/timer-bar/timer-bar';
import { XpProgress } from '../../components/xp-progress/xp-progress';

@Component({
  selector: 'app-assessment-math',
  imports: [
    RouterLink,
    QuestionCard,
    TimerBar,
    XpProgress
  ],
  templateUrl: './assessment-math.html',
  styleUrl: './assessment-math.css',
})
export class AssessmentMath {

}
