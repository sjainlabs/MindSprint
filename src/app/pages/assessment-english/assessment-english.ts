import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { QuestionCard } from '../../components/question-card/question-card';
import { TimerBar } from '../../components/timer-bar/timer-bar';
import { XpProgress } from '../../components/xp-progress/xp-progress';
import { QuestionsService, Question } from '../../services/questions.service';

@Component({
  selector: 'app-assessment-english',
  imports: [
    CommonModule,
    RouterLink,
    QuestionCard,
    TimerBar,
    XpProgress
  ],
  templateUrl: './assessment-english.html',
  styleUrl: './assessment-english.css',
})
export class AssessmentEnglish implements OnInit {
  questions: Question[] = [];
  currentQuestionIndex: number = 0;
  currentQuestion?: Question;

  constructor(private questionsService: QuestionsService) {}

  ngOnInit() {
    this.questions = this.questionsService.getEnglishQuestions();
    this.loadQuestion();
  }

  loadQuestion() {
    if (this.currentQuestionIndex < this.questions.length) {
      this.currentQuestion = this.questions[this.currentQuestionIndex];
    }
  }

  nextQuestion() {
    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.currentQuestionIndex++;
      this.loadQuestion();
    }
  }

  previousQuestion() {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      this.loadQuestion();
    }
  }
}
