import { Component, Input, OnInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-timer-bar',
  imports: [],
  templateUrl: './timer-bar.html',
  styleUrl: './timer-bar.css',
})
export class TimerBar implements OnInit, OnDestroy {
  @Input() totalTime: number = 60; // seconds
  timeLeft: number = 60;
  private intervalId: any;

  ngOnInit() {
    this.timeLeft = this.totalTime;
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  get progressPercentage(): number {
    return (this.timeLeft / this.totalTime) * 100;
  }

  startTimer() {
    this.intervalId = setInterval(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
      } else {
        clearInterval(this.intervalId);
      }
    }, 1000);
  }
}
