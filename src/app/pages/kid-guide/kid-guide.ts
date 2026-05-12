import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService, type AppLanguage } from '../../services/i18n.service';

interface KidGuideSlide {
  titleKey: string;
  messageKey: string;
  icon: string;
  colorClass: string;
  illustrationClass: string;
  illustrationLabel: string;
  illustration: 'emoji' | 'diagnostic' | 'adaptive';
}

@Component({
  selector: 'app-kid-guide',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './kid-guide.html',
  styleUrl: './kid-guide.css',
})
export class KidGuideComponent {
  private readonly i18n = inject(I18nService);

  readonly slides: KidGuideSlide[] = [
    {
      titleKey: 'kidGuide.slide.welcome.title',
      messageKey: 'kidGuide.slide.welcome.message',
      icon: '👋',
      colorClass: 'from-fuchsia-200 via-pink-100 to-yellow-100',
      illustrationClass: 'bg-fuchsia-100',
      illustrationLabel: '🤖',
      illustration: 'emoji',
    },
    {
      titleKey: 'kidGuide.slide.diagnostic.title',
      messageKey: 'kidGuide.slide.diagnostic.message',
      icon: '🧪',
      colorClass: 'from-sky-200 via-blue-100 to-indigo-100',
      illustrationClass: 'bg-sky-100',
      illustrationLabel: '📋',
      illustration: 'diagnostic',
    },
    {
      titleKey: 'kidGuide.slide.adaptive.title',
      messageKey: 'kidGuide.slide.adaptive.message',
      icon: '📝',
      colorClass: 'from-amber-200 via-orange-100 to-yellow-100',
      illustrationClass: 'bg-amber-100',
      illustrationLabel: '📈',
      illustration: 'adaptive',
    },
    {
      titleKey: 'kidGuide.slide.mapPrep.title',
      messageKey: 'kidGuide.slide.mapPrep.message',
      icon: '📈',
      colorClass: 'from-sky-200 via-cyan-100 to-blue-100',
      illustrationClass: 'bg-sky-100',
      illustrationLabel: '🧒',
      illustration: 'emoji',
    },
    {
      titleKey: 'kidGuide.slide.skill.title',
      messageKey: 'kidGuide.slide.skill.message',
      icon: '🧩',
      colorClass: 'from-violet-200 via-purple-100 to-indigo-100',
      illustrationClass: 'bg-violet-100',
      illustrationLabel: '🧱',
      illustration: 'emoji',
    },
    {
      titleKey: 'kidGuide.slide.daily.title',
      messageKey: 'kidGuide.slide.daily.message',
      icon: '📝',
      colorClass: 'from-amber-200 via-orange-100 to-yellow-100',
      illustrationClass: 'bg-amber-100',
      illustrationLabel: '✏️',
      illustration: 'emoji',
    },
    {
      titleKey: 'kidGuide.slide.games.title',
      messageKey: 'kidGuide.slide.games.message',
      icon: '🎮',
      colorClass: 'from-emerald-200 via-lime-100 to-green-100',
      illustrationClass: 'bg-emerald-100',
      illustrationLabel: '🕹️',
      illustration: 'emoji',
    },
    {
      titleKey: 'kidGuide.slide.ai.title',
      messageKey: 'kidGuide.slide.ai.message',
      icon: '🤖',
      colorClass: 'from-indigo-200 via-blue-100 to-cyan-100',
      illustrationClass: 'bg-indigo-100',
      illustrationLabel: '💡',
      illustration: 'emoji',
    },
    {
      titleKey: 'kidGuide.slide.progress.title',
      messageKey: 'kidGuide.slide.progress.message',
      icon: '🚀',
      colorClass: 'from-rose-200 via-pink-100 to-purple-100',
      illustrationClass: 'bg-rose-100',
      illustrationLabel: '📊',
      illustration: 'emoji',
    },
  ];

  readonly language = this.i18n.language;
  readonly currentIndex = signal(0);
  readonly currentSlide = computed(() => this.slides[this.currentIndex()]);
  readonly isFirst = computed(() => this.currentIndex() === 0);
  readonly isLast = computed(() => this.currentIndex() === this.slides.length - 1);
  readonly progressPercent = computed(() =>
    Math.round(((this.currentIndex() + 1) / this.slides.length) * 100),
  );

  previous(): void {
    if (!this.isFirst()) {
      this.currentIndex.update((value) => value - 1);
    }
  }

  next(): void {
    if (!this.isLast()) {
      this.currentIndex.update((value) => value + 1);
    }
  }

  setLanguage(language: AppLanguage): void {
    this.i18n.setLanguage(language);
  }

  t(key: string): string {
    return this.i18n.t(key);
  }

  progressText(): string {
    return this.i18n.format('kidGuide.progress', {
      current: this.currentIndex() + 1,
      total: this.slides.length,
    });
  }
}
