import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
}

@Component({
  selector: 'app-question-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './question-card.component.html',
  styleUrls: ['./question-card.component.css']
})
export class QuestionCardComponent {
  @Input() question!: Question;
  @Input() currentQuestion: number = 1;
  @Input() totalQuestions: number = 10;
  @Output() answerSelected = new EventEmitter<number>();
  
  selectedOption: number | null = null;
  String = String; // Make String available in template
  
  selectOption(index: number) {
    this.selectedOption = index;
  }
  
  submitAnswer() {
    if (this.selectedOption !== null) {
      this.answerSelected.emit(this.selectedOption);
      this.selectedOption = null;
    }
  }
}
