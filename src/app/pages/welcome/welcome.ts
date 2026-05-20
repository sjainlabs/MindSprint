import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { I18nService, type AppLanguage } from '../../services/i18n.service';
import { AuthService } from '../../services/auth.service';

interface VisualGuideItem {
  titleKey: string;
  messageKey: string;
  ariaKey: string;
  icon: string;
  illustration: 'diagnostic' | 'adaptive' | 'emoji';
}

interface DifferenceItem {
  titleKey: string;
  traditionalKey: string;
  mindsprintKey: string;
  icon: string;
}

interface FeatureItem {
  labelKey: string;
  icon: string;
}

@Component({
  selector: 'app-welcome',
  imports: [RouterLink],
  templateUrl: './welcome.html',
  styleUrl: './welcome.css',
})
export class Welcome implements OnInit, OnDestroy {
  private readonly i18n = inject(I18nService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private authStateUnsubscribe: (() => void) | null = null;

  readonly studentLoggedIn = signal(false);
  readonly studentDisplayName = signal('');
  readonly parentLoggedIn = signal(false);
  readonly parentEmail = signal('');

  readonly visualGuideItems: VisualGuideItem[] = [
    {
      titleKey: 'welcome.visual.diagnostic.title',
      messageKey: 'welcome.visual.diagnostic.message',
      ariaKey: 'welcome.visual.diagnostic.aria',
      icon: '🧪',
      illustration: 'diagnostic',
    },
    {
      titleKey: 'welcome.visual.adaptive.title',
      messageKey: 'welcome.visual.adaptive.message',
      ariaKey: 'welcome.visual.adaptive.aria',
      icon: '📝',
      illustration: 'adaptive',
    },
    {
      titleKey: 'welcome.visual.mapPrep.title',
      messageKey: 'welcome.visual.mapPrep.message',
      ariaKey: 'welcome.visual.mapPrep.aria',
      icon: '📊',
      illustration: 'emoji',
    },
    {
      titleKey: 'welcome.visual.skillPractice.title',
      messageKey: 'welcome.visual.skillPractice.message',
      ariaKey: 'welcome.visual.skillPractice.aria',
      icon: '🧩',
      illustration: 'emoji',
    },
    {
      titleKey: 'welcome.visual.games.title',
      messageKey: 'welcome.visual.games.message',
      ariaKey: 'welcome.visual.games.aria',
      icon: '🎮',
      illustration: 'emoji',
    },
    {
      titleKey: 'welcome.visual.aiTutor.title',
      messageKey: 'welcome.visual.aiTutor.message',
      ariaKey: 'welcome.visual.aiTutor.aria',
      icon: '🤖',
      illustration: 'emoji',
    },
    {
      titleKey: 'welcome.visual.progress.title',
      messageKey: 'welcome.visual.progress.message',
      ariaKey: 'welcome.visual.progress.aria',
      icon: '📈',
      illustration: 'emoji',
    },
  ];

  readonly differences: DifferenceItem[] = [
    {
      titleKey: 'welcome.different.fixed.title',
      traditionalKey: 'welcome.different.fixed.traditional',
      mindsprintKey: 'welcome.different.fixed.mindsprint',
      icon: '🧾',
    },
    {
      titleKey: 'welcome.different.feedback.title',
      traditionalKey: 'welcome.different.feedback.traditional',
      mindsprintKey: 'welcome.different.feedback.mindsprint',
      icon: '⚡',
    },
    {
      titleKey: 'welcome.different.path.title',
      traditionalKey: 'welcome.different.path.traditional',
      mindsprintKey: 'welcome.different.path.mindsprint',
      icon: '🧠',
    },
  ];

  readonly combinedFeatures: FeatureItem[] = [
    { labelKey: 'welcome.feature.diagnostics', icon: '🧪' },
    { labelKey: 'welcome.feature.adaptiveSheets', icon: '📝' },
    { labelKey: 'welcome.feature.mapPrep', icon: '📊' },
    { labelKey: 'welcome.feature.skillPractice', icon: '🧩' },
    { labelKey: 'welcome.feature.games', icon: '🎮' },
    { labelKey: 'welcome.feature.aiTutor', icon: '🤖' },
    { labelKey: 'welcome.feature.progressTracking', icon: '📈' },
  ];

  readonly language = this.i18n.language;

  ngOnInit(): void {
    void this.syncLoggedInState();
    this.authStateUnsubscribe = this.authService.onAuthStateChanged((user) => {
      this.parentLoggedIn.set(!!user);
      this.parentEmail.set(user?.email ?? '');
      if (user) {
        this.studentLoggedIn.set(false);
        this.studentDisplayName.set('');
      }
    });
  }

  ngOnDestroy(): void {
    this.authStateUnsubscribe?.();
    this.authStateUnsubscribe = null;
  }

  setLanguage(language: AppLanguage): void {
    this.i18n.setLanguage(language);
  }

  t(key: string): string {
    return this.i18n.t(key);
  }

  private async syncLoggedInState(): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.parentLoggedIn.set(true);
      this.parentEmail.set(user.email ?? 'Parent');
      this.studentLoggedIn.set(false);
      this.studentDisplayName.set('');
      return;
    }

    this.parentLoggedIn.set(false);
    this.parentEmail.set('');

    const studentId = this.authService.getStoredStudentId();
    if (!studentId) {
      this.studentLoggedIn.set(false);
      this.studentDisplayName.set('');
      return;
    }

    this.studentLoggedIn.set(true);
    const student = await this.authService.getStudentProfile(studentId);
    this.studentDisplayName.set(student?.name ?? 'Student');
  }

  async returnToStudentHome(): Promise<void> {
    await this.router.navigate(['/student/home']);
  }

  async returnToParentDashboard(): Promise<void> {
    await this.router.navigate(['/parent/dashboard']);
  }

  async logoutStudent(): Promise<void> {
    this.authService.logoutStudent();
    this.studentLoggedIn.set(false);
    this.studentDisplayName.set('');
    await this.router.navigate(['/login/student']);
  }
}
