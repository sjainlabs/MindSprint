import { Routes } from '@angular/router';
import { Welcome } from './pages/welcome/welcome';
import { AssessmentMath } from './pages/assessment-math/assessment-math';
import { AssessmentEnglish } from './pages/assessment-english/assessment-english';
import { AssessmentScience } from './pages/assessment-science/assessment-science';
import { Results } from './pages/results/results';
import { DiagnosticStartComponent } from './pages/diagnostic-start/diagnostic-start';
import { DiagnosticTestComponent } from './components/diagnostic-test/diagnostic-test';
import { WorksheetPageComponent } from './components/worksheet-page/worksheet-page';

export const routes: Routes = [
  { path: '', redirectTo: '/welcome', pathMatch: 'full' },
  { path: 'welcome', component: Welcome },
  { path: 'assessment/math', component: AssessmentMath },
  { path: 'assessment/english', component: AssessmentEnglish },
  { path: 'assessment/science', component: AssessmentScience },
  { path: 'results', component: Results },
  { path: 'diagnostic', component: DiagnosticStartComponent },
  { path: 'diagnostic/test', component: DiagnosticTestComponent },
  { path: 'worksheet', redirectTo: '/worksheet/Beginner', pathMatch: 'full' },
  { path: 'worksheet/:level', component: WorksheetPageComponent },
];
