import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { XpProgress } from '../../components/xp-progress/xp-progress';

@Component({
  selector: 'app-results',
  imports: [
    RouterLink,
    XpProgress
  ],
  templateUrl: './results.html',
  styleUrl: './results.css',
})
export class Results {

}
