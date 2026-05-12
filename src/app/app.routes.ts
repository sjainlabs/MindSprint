import { Routes } from '@angular/router';
import { Welcome } from './pages/welcome/welcome';
import { AssessmentMath } from './pages/assessment-math/assessment-math';
import { AssessmentEnglish } from './pages/assessment-english/assessment-english';
import { AssessmentScience } from './pages/assessment-science/assessment-science';
import { Results } from './pages/results/results';
import { DiagnosticStartComponent } from './pages/diagnostic-start/diagnostic-start';
import { DiagnosticTestComponent } from './components/diagnostic-test/diagnostic-test';
import { WorksheetPageComponent } from './components/worksheet-page/worksheet-page';
import { GameModeComponent } from './pages/game-mode/game-mode';
import { OnboardingComponent } from './pages/onboarding/onboarding';
import { TopicBrowserComponent } from './pages/topic-browser/topic-browser';
import { MapPrepComponent } from './pages/map-prep/map-prep';
import { StudentProfileComponent } from './pages/student-profile/student-profile';
import { KidGuideComponent } from './pages/kid-guide/kid-guide';
import { ParentGuideComponent } from './pages/parent-guide/parent-guide';

export const routes: Routes = [
  { path: '', component: Welcome },
  { path: 'welcome', redirectTo: '/', pathMatch: 'full' },
  { path: 'assessment/math', component: AssessmentMath },
  { path: 'assessment/english', component: AssessmentEnglish },
  { path: 'assessment/science', component: AssessmentScience },
  { path: 'results', component: Results },
  { path: 'diagnostic', component: DiagnosticStartComponent },
  { path: 'diagnostic/test', component: DiagnosticTestComponent },
  { path: 'onboarding', component: OnboardingComponent },
  { path: 'guide/kids', component: KidGuideComponent },
  { path: 'guide/parents', component: ParentGuideComponent },
  { path: 'topics', component: TopicBrowserComponent },
  { path: 'map-prep', component: MapPrepComponent },
  { path: 'profile', component: StudentProfileComponent },
  { path: 'worksheet', redirectTo: '/worksheet/Beginner', pathMatch: 'full' },
  { path: 'worksheet/:level', component: WorksheetPageComponent },
  { path: 'game', component: GameModeComponent },
];
