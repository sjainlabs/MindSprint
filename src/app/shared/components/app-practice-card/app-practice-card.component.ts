import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-practice-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-practice-card.component.html',
  styleUrls: ['./app-practice-card.component.css'],
})
export class AppPracticeCardComponent {
  @Input() topic: any;
  @Input() selected = false;
  @Input() progress = 0; // 0-100
  @Output() toggle = new EventEmitter<void>();
  @Output() start = new EventEmitter<void>();
}

