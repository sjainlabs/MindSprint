import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { QuestionCardComponent, Question } from '../../components/question-card/question-card.component';
import { TimerBarComponent } from '../../components/timer-bar/timer-bar.component';
import { XPProgressComponent } from '../../components/xp-progress/xp-progress.component';

@Component({
  selector: 'app-assessment-math',
  standalone: true,
  imports: [CommonModule, QuestionCardComponent, TimerBarComponent, XPProgressComponent],
  templateUrl: './assessment-math.component.html',
  styleUrls: ['./assessment-math.component.css']
})
export class AssessmentMathComponent implements OnInit {
  currentQuestionIndex = 0;
  score = 0;
  xp = 45;
  level = 1;
  
  questions: Question[] = [
    {
      id: 1,
      question: '🍎 If you have 3 apples and get 2 more, how many do you have?',
      options: ['4', '5', '6', '3'],
      correctAnswer: 1
    },
    {
      id: 2,
      question: '⭐ What is 7 - 3?',
      options: ['3', '4', '5', '10'],
      correctAnswer: 1
    },
    {
      id: 3,
      question: '🐶 Count the dogs: 🐶🐶🐶🐶🐶',
      options: ['4', '5', '6', '3'],
      correctAnswer: 1
    }
  ];
  
  constructor(private router: Router) {}
  
  ngOnInit() {}
  
  get currentQuestion(): Question {
    return this.questions[this.currentQuestionIndex];
  }
  
  handleAnswer(answerIndex: number) {
    if (answerIndex === this.currentQuestion.correctAnswer) {
      this.score++;
      this.xp += 10;
    }
    
    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.currentQuestionIndex++;
    } else {
      // Assessment complete, navigate to next or results
      this.router.navigate(['/assessment/english']);
    }
  }
}
