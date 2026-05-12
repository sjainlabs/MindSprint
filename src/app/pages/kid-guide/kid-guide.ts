import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LanguageToggleComponent } from '../../components/language-toggle/language-toggle';
import { TranslationService } from '../../services/translation.service';

interface KidGuideSlide {
  titleKey: string;
  messageKey: string;
  icon: string;
  colorClass: string;
  illustrationClass: string;
  illustrationLabel: string;
}

@Component({
  selector: 'app-kid-guide',
  standalone: true,
  imports: [CommonModule, RouterLink, LanguageToggleComponent],
  templateUrl: './kid-guide.html',
  styleUrl: './kid-guide.css',
})
export class KidGuideComponent {
  private readonly t = inject(TranslationService);

  readonly slideData: KidGuideSlide[] = [
    {
      titleKey: 'kidGuide.slide0.title',
      messageKey: 'kidGuide.slide0.message',
      icon: '👋',
      colorClass: 'from-fuchsia-200 via-pink-100 to-yellow-100',
      illustrationClass: 'bg-fuchsia-100',
      illustrationLabel: '🤖',
    },
    {
      titleKey: 'kidGuide.slide1.title',
      messageKey: 'kidGuide.slide1.message',
      icon: '📈',
      colorClass: 'from-sky-200 via-cyan-100 to-blue-100',
      illustrationClass: 'bg-sky-100',
      illustrationLabel: '🧒',
    },
    {
      titleKey: 'kidGuide.slide2.title',
      messageKey: 'kidGuide.slide2.message',
      icon: '🧩',
      colorClass: 'from-violet-200 via-purple-100 to-indigo-100',
      illustrationClass: 'bg-violet-100',
      illustrationLabel: '🧱',
    },
    {
      titleKey: 'kidGuide.slide3.title',
      messageKey: 'kidGuide.slide3.message',
      icon: '📝',
      colorClass: 'from-amber-200 via-orange-100 to-yellow-100',
      illustrationClass: 'bg-amber-100',
      illustrationLabel: '✏️',
    },
    {
      titleKey: 'kidGuide.slide4.title',
      messageKey: 'kidGuide.slide4.message',
      icon: '🎮',
      colorClass: 'from-emerald-200 via-lime-100 to-green-100',
      illustrationClass: 'bg-emerald-100',
      illustrationLabel: '🕹️',
    },
    {
      titleKey: 'kidGuide.slide5.title',
      messageKey: 'kidGuide.slide5.message',
      icon: '🤖',
      colorClass: 'from-indigo-200 via-blue-100 to-cyan-100',
      illustrationClass: 'bg-indigo-100',
      illustrationLabel: '💡',
    },
    {
      titleKey: 'kidGuide.slide6.title',
      messageKey: 'kidGuide.slide6.message',
      icon: '🚀',
      colorClass: 'from-rose-200 via-pink-100 to-purple-100',
      illustrationClass: 'bg-rose-100',
      illustrationLabel: '📊',
    },
  ];

  readonly currentIndex = signal(0);

  readonly currentSlide = computed(() => {
    const data = this.slideData[this.currentIndex()];
    return {
      ...data,
      title: this.t.translate(data.titleKey),
      message: this.t.translate(data.messageKey),
    };
  });

  readonly isFirst = computed(() => this.currentIndex() === 0);
  readonly isLast = computed(() => this.currentIndex() === this.slideData.length - 1);
  readonly progressPercent = computed(() =>
    Math.round(((this.currentIndex() + 1) / this.slideData.length) * 100),
  );
  readonly stepLabel = computed(() =>
    this.t.translate('kidGuide.stepOf', {
      current: this.currentIndex() + 1,
      total: this.slideData.length,
    }),
  );
  readonly backLabel = computed(() => this.t.translate('kidGuide.back'));
  readonly nextLabel = computed(() => this.t.translate('kidGuide.next'));
  readonly startLabel = computed(() => this.t.translate('kidGuide.letsStart'));

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
}
