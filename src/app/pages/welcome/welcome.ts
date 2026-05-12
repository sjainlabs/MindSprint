import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService, type AppLanguage } from '../../services/i18n.service';

interface VisualGuideItem {
  titleKey: string;
  messageKey: string;
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
export class Welcome {
  private readonly i18n = inject(I18nService);

  readonly visualGuideItems: VisualGuideItem[] = [
    {
      titleKey: 'welcome.visual.diagnostic.title',
      messageKey: 'welcome.visual.diagnostic.message',
      icon: '🧪',
      illustration: 'diagnostic',
    },
    {
      titleKey: 'welcome.visual.adaptive.title',
      messageKey: 'welcome.visual.adaptive.message',
      icon: '📝',
      illustration: 'adaptive',
    },
    {
      titleKey: 'welcome.visual.mapPrep.title',
      messageKey: 'welcome.visual.mapPrep.message',
      icon: '📊',
      illustration: 'emoji',
    },
    {
      titleKey: 'welcome.visual.skillPractice.title',
      messageKey: 'welcome.visual.skillPractice.message',
      icon: '🧩',
      illustration: 'emoji',
    },
    {
      titleKey: 'welcome.visual.games.title',
      messageKey: 'welcome.visual.games.message',
      icon: '🎮',
      illustration: 'emoji',
    },
    {
      titleKey: 'welcome.visual.aiTutor.title',
      messageKey: 'welcome.visual.aiTutor.message',
      icon: '🤖',
      illustration: 'emoji',
    },
    {
      titleKey: 'welcome.visual.progress.title',
      messageKey: 'welcome.visual.progress.message',
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

  setLanguage(language: AppLanguage): void {
    this.i18n.setLanguage(language);
  }

  t(key: string): string {
    return this.i18n.t(key);
  }
}
