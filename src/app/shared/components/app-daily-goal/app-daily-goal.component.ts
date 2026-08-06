import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-daily-goal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-daily-goal.component.html',
  styleUrls: ['./app-daily-goal.component.css'],
})
export class AppDailyGoalComponent {
  @Input() goal: any;
}

