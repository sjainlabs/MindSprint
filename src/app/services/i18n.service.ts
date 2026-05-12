import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, effect, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { TranslationService } from './translation.service';

export type AppLanguage = 'en' | 'hi';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly http = inject(HttpClient);
  private readonly translationService = inject(TranslationService);
  private readonly doc = inject(DOCUMENT);

  /**
   * Language signal is driven by TranslationService so that language toggles
   * on any page stay in sync across the entire app.
   */
  readonly language = this.translationService.currentLanguage;

  private readonly dictionary = signal<Record<string, string>>({});
  private loadSubscription?: Subscription;

  constructor() {
    // React to language changes from TranslationService and reload the JSON
    // translation file.  The effect runs once immediately with the current
    // language and again whenever the language signal changes.
    effect(() => {
      const lang = this.translationService.currentLanguage() as AppLanguage;
      this.load(lang);
    });
  }

  setLanguage(language: AppLanguage): void {
    // Delegate to TranslationService so the language signal stays in sync.
    this.translationService.setLanguage(language);
  }

  t(key: string): string {
    return this.dictionary()[key] ?? key;
  }

  format(key: string, params: Record<string, number | string>): string {
    let content = this.t(key);
    for (const [paramKey, value] of Object.entries(params)) {
      const paramValue = String(value);
      content = content.replaceAll(`{{${paramKey}}}`, paramValue).replaceAll(`{{ ${paramKey} }}`, paramValue);
    }
    return content;
  }

  private load(language: AppLanguage): void {
    this.loadSubscription?.unsubscribe();

    // Build the URL relative to document.baseURI so the correct path is used
    // regardless of the configured base href (e.g. /MindSprint/ on GitHub Pages).
    const baseUri = this.doc.baseURI;
    const url = new URL(`assets/i18n/${language}.json`, baseUri).href;
    const enUrl = new URL('assets/i18n/en.json', baseUri).href;

    this.loadSubscription = this.http.get<Record<string, string>>(url).subscribe({
      next: (dictionary) => this.dictionary.set(dictionary),
      error: () => {
        if (language === 'en') {
          console.warn('Failed to load English translations. UI labels may show raw keys.');
          this.dictionary.set({});
          return;
        }

        console.warn(`Failed to load ${language} translations. Falling back to English.`);
        this.loadSubscription?.unsubscribe();
        this.loadSubscription = this.http.get<Record<string, string>>(enUrl).subscribe({
          next: (dictionary) => this.dictionary.set(dictionary),
          error: () => this.dictionary.set({}),
        });
      },
    });
  }
}
