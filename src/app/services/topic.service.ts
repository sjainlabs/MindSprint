import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { type GradeLevel } from './diagnostic.service';

export interface SubtopicModel {
  id: string;
  name: string;
  difficulty: { min: number; max: number };
}

export interface TopicModel {
  id: string;
  name: string;
  stage: string;
  grades: GradeLevel[];
  supportsAiWorksheet: boolean;
  subtopics: SubtopicModel[];
}

export interface TopicTaxonomyResponse {
  topics: TopicModel[];
  difficultyMapping: Array<{
    topicId: string;
    subtopicId: string;
    minDifficulty: number;
    maxDifficulty: number;
  }>;
}

@Injectable({
  providedIn: 'root',
})
export class TopicService {
  private readonly isLocalhost =
    typeof window !== 'undefined' && ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  private readonly apiRoot = this.isLocalhost ? 'http://localhost:3001/api' : '/api';

  constructor(private readonly http: HttpClient) {}

  getTaxonomy(): Observable<TopicTaxonomyResponse> {
    return this.http.get<TopicTaxonomyResponse>(`${this.apiRoot}/topics/taxonomy`);
  }

  getTopicsByGrade(grade: GradeLevel): Observable<{ grade: GradeLevel; topics: TopicModel[] }> {
    return this.http.get<{ grade: GradeLevel; topics: TopicModel[] }>(`${this.apiRoot}/topics/by-grade?grade=${grade}`);
  }

  getPersonalizedPath(studentId: string): Observable<{ studentId: string; personalizedPath: TopicModel[] }> {
    return this.http.get<{ studentId: string; personalizedPath: TopicModel[] }>(
      `${this.apiRoot}/topics/personalized-path?studentId=${encodeURIComponent(studentId)}`,
    );
  }
}
