import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-practice-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './app-practice-card.component.html',
  styleUrls: ['./app-practice-card.component.css'],
})
export class AppPracticeCardComponent {
  @Input() topic: any;
  @Input() selected = false;
  @Input() progress = 0; // 0-100
  /** Route to this topic's study guide; the button is hidden when not set. */
  @Input() guideLink: string | null = null;
  @Output() toggle = new EventEmitter<void>();
  @Output() start = new EventEmitter<void>();

  /** No icon, or a file path / URL, rather than an emoji. */
  get iconIsImage(): boolean {
    const icon: unknown = this.topic?.icon;
    return typeof icon !== 'string' || !icon.trim() || /[./]/.test(icon);
  }
}

