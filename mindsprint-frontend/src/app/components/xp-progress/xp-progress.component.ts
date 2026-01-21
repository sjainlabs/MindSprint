import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-xp-progress',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './xp-progress.component.html',
  styleUrls: ['./xp-progress.component.css']
})
export class XPProgressComponent {
  @Input() currentXP: number = 0;
  @Input() maxXP: number = 100;
  @Input() level: number = 1;
  
  get percentage(): number {
    return (this.currentXP / this.maxXP) * 100;
  }
}
