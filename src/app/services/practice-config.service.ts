import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PracticeTopicConfig {
  id: string;
  name: string;
  grades: number[];
  operation: string;
  levels: string[];
}

export interface PracticeLevelConfig {
  allowedOperations: string[];
}

export interface PracticeConfig {
  gradeToLevels: Record<number, string[]>;
  levels: Record<string, PracticeLevelConfig>;
  topics: Record<string, PracticeTopicConfig>;
  topicToOperation: Record<string, string>;
  allTopics: string[];
  allOperations: string[];
}

@Injectable({ providedIn: 'root' })
export class PracticeConfigService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiUrl.replace(/\/$/, '');

  /** GET /v1/practice/config */
  getConfig(): Observable<PracticeConfig> {
    return this.http.get<PracticeConfig>(`${this.apiBase}/v1/practice/config`);
  }
}

