import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService, type AppLanguage } from '../../services/i18n.service';

interface ParentGuideSection {
  titleKey: string;
  icon: string;
  pointKeys: string[];
}

@Component({
  selector: 'app-parent-guide',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './parent-guide.html',
  styleUrl: './parent-guide.css',
})
export class ParentGuideComponent {
  private readonly i18n = inject(I18nService);

  readonly sections: ParentGuideSection[] = [
    {
      titleKey: 'parentGuide.section.overview.title',
      icon: '🧭',
      pointKeys: [
        'parentGuide.section.overview.point1',
        'parentGuide.section.overview.point2',
      ],
    },
    {
      titleKey: 'parentGuide.section.diagnostic.title',
      icon: '🧪',
      pointKeys: [
        'parentGuide.section.diagnostic.point1',
        'parentGuide.section.diagnostic.point2',
      ],
    },
    {
      titleKey: 'parentGuide.section.adaptive.title',
      icon: '📝',
      pointKeys: [
        'parentGuide.section.adaptive.point1',
        'parentGuide.section.adaptive.point2',
      ],
    },
    {
      titleKey: 'parentGuide.section.mapPrep.title',
      icon: '📊',
      pointKeys: [
        'parentGuide.section.mapPrep.point1',
        'parentGuide.section.mapPrep.point2',
      ],
    },
    {
      titleKey: 'parentGuide.section.skill.title',
      icon: '🧩',
      pointKeys: [
        'parentGuide.section.skill.point1',
        'parentGuide.section.skill.point2',
      ],
    },
    {
      titleKey: 'parentGuide.section.ai.title',
      icon: '🤖',
      pointKeys: [
        'parentGuide.section.ai.point1',
        'parentGuide.section.ai.point2',
      ],
    },
    {
      titleKey: 'parentGuide.section.progress.title',
      icon: '📈',
      pointKeys: [
        'parentGuide.section.progress.point1',
        'parentGuide.section.progress.point2',
      ],
    },
    {
      titleKey: 'parentGuide.section.different.title',
      icon: '⚖️',
      pointKeys: [
        'parentGuide.section.different.point1',
        'parentGuide.section.different.point2',
        'parentGuide.section.different.point3',
      ],
    },
    {
      titleKey: 'parentGuide.section.support.title',
      icon: '💙',
      pointKeys: [
        'parentGuide.section.support.point1',
        'parentGuide.section.support.point2',
      ],
    },
  ];

  readonly language = this.i18n.language;
  readonly expanded = signal<Set<number>>(new Set([0]));

  toggle(index: number): void {
    this.expanded.update((current) => {
      const next = new Set(current);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  isExpanded(index: number): boolean {
    return this.expanded().has(index);
  }

  setLanguage(language: AppLanguage): void {
    this.i18n.setLanguage(language);
  }

  t(key: string): string {
    return this.i18n.t(key);
  }
}
