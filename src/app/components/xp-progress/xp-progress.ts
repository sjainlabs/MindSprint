import { Component } from '@angular/core';

@Component({
  selector: 'app-xp-progress',
  imports: [],
  templateUrl: './xp-progress.html',
  styleUrl: './xp-progress.css',
})
export class XpProgress {
  level: number = 1;
  currentXP: number = 350;
  nextLevelXP: number = 1000;

  get progressPercentage(): number {
    return (this.currentXP / this.nextLevelXP) * 100;
  }
}
