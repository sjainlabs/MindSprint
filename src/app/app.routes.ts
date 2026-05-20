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
import { parentAuthGuard } from './guards/parent-auth.guard';
import { parentMaterialsGuard } from './guards/parent-materials.guard';
import { studentAuthGuard } from './guards/student-auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'welcome', component: Welcome },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login-selection/login-selection.component').then((module) => module.LoginSelectionComponent),
  },
  {
    path: 'login/parent',
    loadComponent: () => import('./pages/parent-login/parent-login.component').then((module) => module.ParentLoginComponent),
  },
  {
    path: 'login/student',
    loadComponent: () =>
      import('./pages/student-login/student-login.component').then((module) => module.StudentLoginComponent),
  },
  {
    path: 'parent/dashboard',
    canActivate: [parentAuthGuard],
    loadComponent: () =>
      import('./pages/parent-dashboard/parent-dashboard.component').then((module) => module.ParentDashboardComponent),
  },
  {
    path: 'parent/materials',
    canActivate: [parentAuthGuard, parentMaterialsGuard],
    loadComponent: () =>
      import('./pages/parent-materials/parent-materials.component').then((module) => module.ParentMaterialsComponent),
  },
  {
    path: 'student/home',
    canActivate: [studentAuthGuard],
    loadComponent: () => import('./pages/student-home/student-home.component').then((module) => module.StudentHomeComponent),
  },
  { path: 'assessment/math', component: AssessmentMath },
  { path: 'assessment/english', component: AssessmentEnglish },
  { path: 'assessment/science', component: AssessmentScience },
  { path: 'results', component: Results },
  { path: 'diagnostic', component: DiagnosticStartComponent },
  { path: 'diagnostic/test', component: DiagnosticTestComponent },
  { path: 'onboarding', component: OnboardingComponent },
  {
    path: 'guide/kids',
    loadComponent: () =>
      import('./pages/kid-guide/kid-guide').then((module) => module.KidGuideComponent),
  },
  {
    path: 'guide/parents',
    loadComponent: () =>
      import('./pages/parent-guide/parent-guide').then((module) => module.ParentGuideComponent),
  },
  { path: 'topics', component: TopicBrowserComponent },
  { path: 'map-prep', component: MapPrepComponent },
  { path: 'profile', component: StudentProfileComponent },
  { path: 'worksheet', redirectTo: '/worksheet/Beginner', pathMatch: 'full' },
  { path: 'worksheet/:level', component: WorksheetPageComponent },
  {
    path: 'operations',
    loadChildren: () =>
      import('./modules/basic-operations/basic-operations.module').then(
        (module) => module.basicOperationsRoutes,
      ),
  },
  { path: 'game', component: GameModeComponent },
];
