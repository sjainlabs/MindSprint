import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { QuestionCardComponent, Question } from '../../components/question-card/question-card.component';
import { TimerBarComponent } from '../../components/timer-bar/timer-bar.component';
import { XPProgressComponent } from '../../components/xp-progress/xp-progress.component';

@Component({
  selector: 'app-assessment-science',
  standalone: true,
  imports: [CommonModule, QuestionCardComponent, TimerBarComponent, XPProgressComponent],
  templateUrl: './assessment-science.component.html',
  styleUrls: ['./assessment-science.component.css']
})
export class AssessmentScienceComponent implements OnInit {
  currentQuestionIndex = 0;
  score = 0;
  xp = 65;
  level = 1;
  
  questions: Question[] = [
    {
      id: 1,
      question: '🔬 What do plants need to grow?',
      options: ['Only water', 'Only sunlight', 'Water and sunlight', 'Nothing'],
      correctAnswer: 2
    },
    {
      id: 2,
      question: '🌍 What is the biggest planet?',
      options: ['Earth', 'Mars', 'Jupiter', 'Saturn'],
      correctAnswer: 2
    },
    {
      id: 3,
      question: '🦋 What does a caterpillar become?',
      options: ['Bee', 'Butterfly', 'Bird', 'Ant'],
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
      // Assessment complete, navigate to results
      this.router.navigate(['/results']);
    }
  }
}
