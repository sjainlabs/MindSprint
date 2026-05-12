import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface KidGuideSlide {
  title: string;
  message: string;
  icon: string;
  colorClass: string;
  illustrationClass: string;
  illustrationLabel: string;
}

@Component({
  selector: 'app-kid-guide',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './kid-guide.html',
  styleUrl: './kid-guide.css',
})
export class KidGuideComponent {
  readonly slides: KidGuideSlide[] = [
    {
      title: 'Welcome to MindSprint!',
      message: 'This is your place to get better at math every day!',
      icon: '👋',
      colorClass: 'from-fuchsia-200 via-pink-100 to-yellow-100',
      illustrationClass: 'bg-fuchsia-100',
      illustrationLabel: '🤖',
    },
    {
      title: 'MAP Prep Mode',
      message: 'Practice questions that help you grow your MAP score.',
      icon: '📈',
      colorClass: 'from-sky-200 via-cyan-100 to-blue-100',
      illustrationClass: 'bg-sky-100',
      illustrationLabel: '🧒',
    },
    {
      title: 'Skill Practice',
      message: 'Learn new math skills step by step.',
      icon: '🧩',
      colorClass: 'from-violet-200 via-purple-100 to-indigo-100',
      illustrationClass: 'bg-violet-100',
      illustrationLabel: '🧱',
    },
    {
      title: 'Daily Practice Sheets',
      message: 'Short daily sheets help you get faster and stronger at math. Keep going one level at a time!',
      icon: '📝',
      colorClass: 'from-amber-200 via-orange-100 to-yellow-100',
      illustrationClass: 'bg-amber-100',
      illustrationLabel: '✏️',
    },
    {
      title: 'Games',
      message: 'Play fun math games to get quicker with numbers!',
      icon: '🎮',
      colorClass: 'from-emerald-200 via-lime-100 to-green-100',
      illustrationClass: 'bg-emerald-100',
      illustrationLabel: '🕹️',
    },
    {
      title: 'AI Tutor',
      message: 'Ask questions anytime. Your math helper is always here!',
      icon: '🤖',
      colorClass: 'from-indigo-200 via-blue-100 to-cyan-100',
      illustrationClass: 'bg-indigo-100',
      illustrationLabel: '💡',
    },
    {
      title: 'Progress',
      message: 'See how much you’ve grown!',
      icon: '🚀',
      colorClass: 'from-rose-200 via-pink-100 to-purple-100',
      illustrationClass: 'bg-rose-100',
      illustrationLabel: '📊',
    },
  ];

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
}
