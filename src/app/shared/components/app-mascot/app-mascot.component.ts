import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-mascot',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-mascot.component.html',
  styleUrls: ['./app-mascot.component.css'],
})
export class AppMascotComponent {
  @Input() character: string | null = 'penguin';
}

