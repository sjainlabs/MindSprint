import { Routes } from '@angular/router';
import { WelcomeComponent } from './pages/welcome/welcome.component';
import { AssessmentMathComponent } from './pages/assessment-math/assessment-math.component';
import { AssessmentEnglishComponent } from './pages/assessment-english/assessment-english.component';
import { AssessmentScienceComponent } from './pages/assessment-science/assessment-science.component';
import { ResultsComponent } from './pages/results/results.component';

export const routes: Routes = [
  { path: '', redirectTo: '/welcome', pathMatch: 'full' },
  { path: 'welcome', component: WelcomeComponent },
  { path: 'assessment/math', component: AssessmentMathComponent },
  { path: 'assessment/english', component: AssessmentEnglishComponent },
  { path: 'assessment/science', component: AssessmentScienceComponent },
  { path: 'results', component: ResultsComponent },
  { path: '**', redirectTo: '/welcome' }
];
