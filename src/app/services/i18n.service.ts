import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';

export type AppLanguage = 'en' | 'hi';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly http = inject(HttpClient);

  readonly language = signal<AppLanguage>('en');
  private readonly dictionary = signal<Record<string, string>>({});

  constructor() {
    this.load('en');
  }

  setLanguage(language: AppLanguage): void {
    if (this.language() === language) {
      return;
    }

    this.language.set(language);
    this.load(language);
  }

  t(key: string): string {
    return this.dictionary()[key] ?? key;
  }

  format(key: string, params: Record<string, number | string>): string {
    return Object.entries(params).reduce(
      (acc, [paramKey, value]) => acc.replace(new RegExp(`{{\\s*${paramKey}\\s*}}`, 'g'), String(value)),
      this.t(key),
    );
  }

  private load(language: AppLanguage): void {
    this.http.get<Record<string, string>>(`/assets/i18n/${language}.json`).subscribe({
      next: (dictionary) => this.dictionary.set(dictionary),
      error: () => {
        if (language === 'en') {
          this.dictionary.set({});
          return;
        }

        console.warn(`Failed to load ${language} translations. Falling back to English.`);
        this.http.get<Record<string, string>>('/assets/i18n/en.json').subscribe({
          next: (dictionary) => this.dictionary.set(dictionary),
          error: () => this.dictionary.set({}),
        });
      },
    });
  }
}
