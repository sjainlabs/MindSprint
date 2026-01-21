import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AvatarSelector } from '../../components/avatar-selector/avatar-selector';
import { XpProgress } from '../../components/xp-progress/xp-progress';
import { ParentReport } from '../../components/parent-report/parent-report';

@Component({
  selector: 'app-welcome',
  imports: [
    RouterLink,
    AvatarSelector,
    XpProgress,
    ParentReport
  ],
  templateUrl: './welcome.html',
  styleUrl: './welcome.css',
})
export class Welcome {

}
