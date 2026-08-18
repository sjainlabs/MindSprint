
import { Component, Input, Output, EventEmitter } from '@angular/core';
import {
  CommonModule,
  NgSwitch,
  NgSwitchCase,
  NgSwitchDefault,
  NgIf
} from '@angular/common';
import { PracticeWorksheetQuestion } from '../services/learning-api.service';
import { VerticalMultiplicationComponent } from '../vertical-multiplication-component/vertical-multiplication.component';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-question-renderer',
  imports: [
    CommonModule,
    FormsModule,

    // 🔥 REQUIRED FOR ngSwitch
    NgSwitch,
    NgSwitchCase,
    NgSwitchDefault,
    NgIf,
    VerticalMultiplicationComponent
  ],
  templateUrl: './question-renderer.component.html',
  styleUrl: './question-renderer.component.css',
})
export class QuestionRendererComponent {
  @Input() question!: PracticeWorksheetQuestion;
  @Input() answer!: string | number | string[];
  @Output() answerChange = new EventEmitter<string | number | string[]>();

  showHint = false;

  onTextChange(value: string) {
    this.answerChange.emit(value);
  }

  onMCQSelect(choice: string) {
    this.answerChange.emit(choice);
  }

  onInputEvent(e: Event) {
    const value = (e.target as HTMLInputElement)?.value ?? '';
    this.answerChange.emit(value);
  }

  protected readonly HTMLInputElement = HTMLInputElement;
}
