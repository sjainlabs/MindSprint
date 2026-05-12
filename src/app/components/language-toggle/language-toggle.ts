import { Component, inject } from '@angular/core';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-language-toggle',
  standalone: true,
  template: `
    <div class="inline-flex items-center rounded-full border border-gray-300 bg-white overflow-hidden text-xs font-bold select-none">
      <button
        type="button"
        class="px-3 py-1 transition-colors"
        [class.bg-primary]="!translationService.isHindi()"
        [class.text-white]="!translationService.isHindi()"
        [class.text-gray-500]="translationService.isHindi()"
        (click)="translationService.setLanguage('en')"
        aria-label="Switch to English"
      >
        EN
      </button>
      <button
        type="button"
        class="px-3 py-1 transition-colors"
        [class.bg-primary]="translationService.isHindi()"
        [class.text-white]="translationService.isHindi()"
        [class.text-gray-500]="!translationService.isHindi()"
        (click)="translationService.setLanguage('hi')"
        aria-label="हिंदी में बदलें"
      >
        HI
      </button>
    </div>
  `,
})
export class LanguageToggleComponent {
  readonly translationService = inject(TranslationService);
}
