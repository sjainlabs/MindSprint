import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { QuestionCardComponent, Question } from '../../components/question-card/question-card.component';
import { TimerBarComponent } from '../../components/timer-bar/timer-bar.component';
import { XPProgressComponent } from '../../components/xp-progress/xp-progress.component';

@Component({
  selector: 'app-assessment-english',
  standalone: true,
  imports: [CommonModule, QuestionCardComponent, TimerBarComponent, XPProgressComponent],
  templateUrl: './assessment-english.component.html',
  styleUrls: ['./assessment-english.component.css']
})
export class AssessmentEnglishComponent implements OnInit {
  currentQuestionIndex = 0;
  score = 0;
  xp = 55;
  level = 1;
  
  questions: Question[] = [
    {
      id: 1,
      question: '📚 Which word rhymes with "cat"?',
      options: ['dog', 'hat', 'fish', 'bird'],
      correctAnswer: 1
    },
    {
      id: 2,
      question: '✏️ What is the first letter of "Apple"?',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 0
    },
    {
      id: 3,
      question: '📖 How many letters are in the word "sun"?',
      options: ['2', '3', '4', '5'],
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
      this.router.navigate(['/assessment/science']);
    }
  }
}
