import { Routes } from '@angular/router';
import { LandingPageComponent } from './landing/landing-page.component';
import { ParentLoginPageComponent } from './auth/parent-login-page.component';
import { AccessCodePageComponent } from './auth/access-code-page.component';
import { ParentDashboardPageComponent } from './parent/parent-dashboard-page.component';
import { StudentDashboardPageComponent } from './student/student-dashboard-page.component';
import { GradeSelectionPageComponent } from './onboarding/grade-selection-page.component';
import { TopicSelectionPageComponent } from './onboarding/topic-selection-page.component';
import { DiagnosticPageComponent } from './diagnostic/diagnostic-page.component';
import { DiagnosticResultPageComponent } from './diagnostic/diagnostic-result-page.component';
import { PracticeHubPageComponent } from './practice/practice-hub-page.component';
import { TopicDetailPageComponent } from './topic/topic-detail-page.component';
import { WorksheetPageComponent } from './worksheet/worksheet-page.component';
import { InsightsPageComponent } from './insights/insights-page.component';
import { ScheduledTestsPageComponent } from './tests/scheduled-tests-page.component';
import { SurpriseTestPageComponent } from './tests/surprise-test-page.component';
import { parentAuthGuard } from './guards/parent-auth.guard';
import { studentAuthGuard } from './guards/student-auth.guard';
import {PracticeHubComponent} from './pages/practice-hub/practice-hub.component';
import {TopicProgressPageComponent} from './pages/topic-progress-page/topic-progress-page.component';

export const routes: Routes = [
  { path: '', component: LandingPageComponent },
  { path: 'auth/parent-login', component: ParentLoginPageComponent },
  { path: 'auth/access-code', component: AccessCodePageComponent },
  { path: 'parent/dashboard', canActivate: [parentAuthGuard], component: ParentDashboardPageComponent },
  { path: 'student/dashboard', canActivate: [studentAuthGuard], component: StudentDashboardPageComponent },
  { path: 'onboarding/grade-selection', canActivate: [studentAuthGuard], component: GradeSelectionPageComponent },
  { path: 'onboarding/topic-selection', canActivate: [studentAuthGuard], component: TopicSelectionPageComponent },
  { path: 'diagnostic/start', canActivate: [studentAuthGuard], component: DiagnosticPageComponent },
  { path: 'diagnostic/result', canActivate: [studentAuthGuard], component: DiagnosticResultPageComponent },
  { path: 'practice/hub', canActivate: [studentAuthGuard], component: PracticeHubComponent },
  { path: 'practice/topic/:topicId', canActivate: [studentAuthGuard], component: TopicDetailPageComponent },
  { path: 'practice/worksheet', canActivate: [studentAuthGuard], component: WorksheetPageComponent },
  { path: 'insights', canActivate: [studentAuthGuard], component: InsightsPageComponent },
  { path: 'tests/scheduled', canActivate: [studentAuthGuard], component: ScheduledTestsPageComponent },
  { path: 'tests/surprise', canActivate: [studentAuthGuard], component: SurpriseTestPageComponent },
  { path: 'progression/overview', canActivate: [studentAuthGuard], component: TopicProgressPageComponent },


  // Legacy aliases.
  { path: 'parent-login', redirectTo: '/auth/parent-login', pathMatch: 'full' },
  { path: 'access-code', redirectTo: '/auth/access-code', pathMatch: 'full' },
  { path: 'onboarding/grade', redirectTo: '/onboarding/grade-selection', pathMatch: 'full' },
  { path: 'onboarding/topics', redirectTo: '/onboarding/topic-selection', pathMatch: 'full' },
  { path: 'diagnostic', redirectTo: '/diagnostic/start', pathMatch: 'full' },
  { path: 'practice-hub', redirectTo: '/practice/hub', pathMatch: 'full' },
  { path: 'topic/:topicId', redirectTo: '/practice/topic/:topicId', pathMatch: 'full' },
  { path: 'worksheet', redirectTo: '/practice/worksheet', pathMatch: 'full' },
  { path: 'login/parent', redirectTo: '/auth/parent-login', pathMatch: 'full' },
  { path: 'login/student', redirectTo: '/auth/access-code', pathMatch: 'full' },
  { path: 'student/home', redirectTo: '/student/dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: '' },
];
