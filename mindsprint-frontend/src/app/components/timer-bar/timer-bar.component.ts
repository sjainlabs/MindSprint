import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-timer-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './timer-bar.component.html',
  styleUrls: ['./timer-bar.component.css']
})
export class TimerBarComponent implements OnInit, OnDestroy {
  @Input() duration: number = 30; // seconds
  
  timeLeft: number = 30;
  percentage: number = 100;
  private interval: any;
  
  ngOnInit() {
    this.timeLeft = this.duration;
    this.startTimer();
  }
  
  ngOnDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
  
  startTimer() {
    this.interval = setInterval(() => {
      this.timeLeft--;
      this.percentage = (this.timeLeft / this.duration) * 100;
      
      if (this.timeLeft <= 0) {
        clearInterval(this.interval);
      }
    }, 1000);
  }
  
  resetTimer() {
    if (this.interval) {
      clearInterval(this.interval);
    }
    this.timeLeft = this.duration;
    this.percentage = 100;
    this.startTimer();
  }
}
