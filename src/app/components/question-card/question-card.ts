import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-question-card',
  imports: [],
  templateUrl: './question-card.html',
  styleUrl: './question-card.css',
})
export class QuestionCard {
  @Input() questionNumber: number = 1;
  @Input() totalQuestions: number = 10;
  @Input() question: string = 'What is 2 + 2?';
  @Input() points: number = 100;
  @Input() options: Array<{id: number, text: string}> = [
    { id: 1, text: '3' },
    { id: 2, text: '4' },
    { id: 3, text: '5' },
    { id: 4, text: '6' }
  ];
  
  selectedOption: number | null = null;

  selectOption(id: number) {
    this.selectedOption = id;
  }
}
