import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LanguageToggleComponent } from '../../components/language-toggle/language-toggle';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslationService } from '../../services/translation.service';

interface ParentGuideSectionDef {
  titleKey: string;
  icon: string;
  pointKeys: string[];
}

@Component({
  selector: 'app-parent-guide',
  standalone: true,
  imports: [CommonModule, RouterLink, LanguageToggleComponent, TranslatePipe],
  templateUrl: './parent-guide.html',
  styleUrl: './parent-guide.css',
})
export class ParentGuideComponent {
  private readonly t = inject(TranslationService);

  readonly sectionDefs: ParentGuideSectionDef[] = [
    { titleKey: 'parentGuide.section0.title', icon: '🧭', pointKeys: ['parentGuide.section0.point0', 'parentGuide.section0.point1'] },
    { titleKey: 'parentGuide.section1.title', icon: '📊', pointKeys: ['parentGuide.section1.point0', 'parentGuide.section1.point1'] },
    { titleKey: 'parentGuide.section2.title', icon: '📝', pointKeys: ['parentGuide.section2.point0', 'parentGuide.section2.point1'] },
    { titleKey: 'parentGuide.section3.title', icon: '🧩', pointKeys: ['parentGuide.section3.point0', 'parentGuide.section3.point1'] },
    { titleKey: 'parentGuide.section4.title', icon: '🤖', pointKeys: ['parentGuide.section4.point0', 'parentGuide.section4.point1'] },
    { titleKey: 'parentGuide.section5.title', icon: '📈', pointKeys: ['parentGuide.section5.point0', 'parentGuide.section5.point1'] },
    { titleKey: 'parentGuide.section6.title', icon: '💙', pointKeys: ['parentGuide.section6.point0', 'parentGuide.section6.point1'] },
  ];

  readonly sections = computed(() =>
    this.sectionDefs.map((def) => ({
      title: this.t.translate(def.titleKey),
      icon: def.icon,
      points: def.pointKeys.map((k) => this.t.translate(k)),
    })),
  );

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
}
