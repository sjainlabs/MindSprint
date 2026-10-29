import { Routes } from '@angular/router';
import { LandingPageComponent } from './landing/landing-page.component';
import { ParentLoginPageComponent } from './auth/parent-login-page.component';
import { AccessCodePageComponent } from './auth/access-code-page.component';
import { ParentDashboardPageComponent } from './parent/parent-dashboard-page.component';
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
import { TopicTestPageComponent } from './tests/topic-test-page.component';
import { TestsHubPageComponent } from './tests/tests-hub-page.component';
import { CustomTestBuilderPageComponent } from './tests/custom-test-builder-page.component';
import { CustomTestTakePageComponent } from './tests/custom-test-take-page.component';
import { StudyGuidePageComponent } from './study-guides/study-guide-page.component';
import { StudyGuideIndexPageComponent } from './study-guides/study-guide-index-page.component';
import { parentAuthGuard } from './guards/parent-auth.guard';
import { studentAuthGuard } from './guards/student-auth.guard';
import {PracticeHubComponent} from './pages/practice-hub/practice-hub.component';
import {TopicProgressPageComponent} from './pages/topic-progress-page/topic-progress-page.component';

export const routes: Routes = [
  { path: '', component: LandingPageComponent },
  { path: 'auth/parent-login', component: ParentLoginPageComponent },
  { path: 'auth/access-code', component: AccessCodePageComponent },
  { path: 'parent/dashboard', canActivate: [parentAuthGuard], component: ParentDashboardPageComponent },
  // The learning plan. Parents open it from their dashboard with ?studentId=…, which the guard allows.
  { path: 'student/dashboard', canActivate: [studentAuthGuard], loadComponent: () => import('./student/student-dashboard-page.component').then((m) => m.StudentDashboardPageComponent) },
  { path: 'student/topics', canActivate: [studentAuthGuard], loadComponent: () => import('./student/plan-topics-page.component').then((m) => m.PlanTopicsPageComponent) },
  { path: 'onboarding/grade-selection', canActivate: [studentAuthGuard], component: GradeSelectionPageComponent },
  { path: 'onboarding/topic-selection', canActivate: [studentAuthGuard], component: TopicSelectionPageComponent },
  { path: 'diagnostic/start', canActivate: [studentAuthGuard], component: DiagnosticPageComponent },
  { path: 'diagnostic/result', canActivate: [studentAuthGuard], component: DiagnosticResultPageComponent },
  { path: 'practice/hub', canActivate: [studentAuthGuard], component: PracticeHubComponent },
  { path: 'practice/topic/:topicId', canActivate: [studentAuthGuard], component: TopicDetailPageComponent },
  { path: 'practice/worksheet', canActivate: [studentAuthGuard], component: WorksheetPageComponent },
  { path: 'insights', canActivate: [studentAuthGuard], component: InsightsPageComponent },
  { path: 'tests', canActivate: [studentAuthGuard], component: TestsHubPageComponent },
  { path: 'tests/custom', canActivate: [studentAuthGuard], component: CustomTestBuilderPageComponent },
  { path: 'tests/custom/take', canActivate: [studentAuthGuard], component: CustomTestTakePageComponent },
  { path: 'tests/review/take', canActivate: [studentAuthGuard], component: CustomTestTakePageComponent, data: { review: true } },
  { path: 'tests/scheduled', canActivate: [studentAuthGuard], component: ScheduledTestsPageComponent },
  { path: 'tests/surprise', canActivate: [studentAuthGuard], component: SurpriseTestPageComponent },
  { path: 'tests/topic/:topicId', canActivate: [studentAuthGuard], component: TopicTestPageComponent },
  { path: 'daily', canActivate: [studentAuthGuard], loadComponent: () => import('./daily/daily-home-page.component').then((m) => m.DailyHomePageComponent) },
  { path: 'daily/play', canActivate: [studentAuthGuard], loadComponent: () => import('./daily/daily-play-page.component').then((m) => m.DailyPlayPageComponent) },
  // Parents open these from their dashboard with ?studentId=…, which the guard allows.
  { path: 'daily/progress', canActivate: [studentAuthGuard], loadComponent: () => import('./daily/daily-progress-page.component').then((m) => m.DailyProgressPageComponent) },
  { path: 'daily/chart', canActivate: [studentAuthGuard], loadComponent: () => import('./daily/daily-chart-page.component').then((m) => m.DailyChartPageComponent) },
  // New sections load on first visit to keep the initial download small.
  // Tables, facts and flash cards work without a login (flash cards then aren't saved); games need one.
  {
    path: 'math-brain',
    loadComponent: () => import('./components/section-shell/section-shell.component').then((m) => m.SectionShellComponent),
    data: {
      title: '🧠 Math Brain',
      tabs: [
        { path: 'facts', label: '📚 Tables & Facts' },
        { path: 'cards', label: '🃏 Flash Cards' },
      ],
    },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'facts' },
      { path: 'facts', loadComponent: () => import('./math-brain/facts.component').then((m) => m.MathBrainFactsComponent) },
      { path: 'cards', loadComponent: () => import('./math-brain/flash-cards.component').then((m) => m.FlashCardsComponent) },
      // The abacus moved to Math Games; keep old links working.
      { path: 'abacus', pathMatch: 'full', redirectTo: '/math-games/abacus' },
      { path: 'abacus/parent', pathMatch: 'full', redirectTo: '/math-games/abacus/parent' },
    ],
  },
  {
    path: 'math-games',
    loadComponent: () => import('./components/section-shell/section-shell.component').then((m) => m.SectionShellComponent),
    data: {
      title: '🎮 Math Games',
      tabs: [{ path: 'abacus', label: '🧮 Abacus' }],
    },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'abacus' },
      // Parents open abacus/parent from their dashboard with ?studentId=…, which the guard allows.
      { path: 'abacus', canActivate: [studentAuthGuard], loadComponent: () => import('./math-games/abacus.component').then((m) => m.AbacusComponent) },
      { path: 'abacus/parent', canActivate: [studentAuthGuard], loadComponent: () => import('./math-games/abacus-parent.component').then((m) => m.AbacusParentComponent) },
    ],
  },
  // Parents open this from their dashboard with ?studentId=…; it sits outside the kid's tabs.
  { path: 'rewards/parent', canActivate: [parentAuthGuard], loadComponent: () => import('./rewards/reward-shop-parent-page.component').then((m) => m.RewardShopParentPageComponent) },
  {
    path: 'rewards',
    loadComponent: () => import('./components/section-shell/section-shell.component').then((m) => m.SectionShellComponent),
    data: {
      title: '⭐ Rewards',
      tabs: [
        { path: 'me', label: '🏅 My rewards' },
        { path: 'shop', label: '🛍️ Reward shop' },
      ],
    },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'me' },
      { path: 'me', canActivate: [studentAuthGuard], loadComponent: () => import('./rewards/rewards-page.component').then((m) => m.RewardsPageComponent) },
      { path: 'shop', canActivate: [studentAuthGuard], loadComponent: () => import('./rewards/reward-shop-page.component').then((m) => m.RewardShopPageComponent) },
    ],
  },
  // Study guides are for children and parents reading together, so no student login is required.
  { path: 'study-guides', component: StudyGuideIndexPageComponent },
  { path: 'study-guides/topic/:topicId', component: StudyGuidePageComponent },
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
