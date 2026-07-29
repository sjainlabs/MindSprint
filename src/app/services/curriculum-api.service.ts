import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CurriculumApiTopic {
  id: string;
  name: string;
  description?: string;
  stage?: string;
  grades: string[];
  conceptualFocus?: string;
  subtopics: string[];
  difficultyTiers?: Record<string, string>;
}

export interface CurriculumApiSubtopic {
  id: string;
  name: string;
  difficulty?: { min: number; max: number };
}

@Injectable({ providedIn: 'root' })
export class CurriculumApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiUrl.replace(/\/$/, '');

  /** GET /api/curriculum/topics */
  getAllTopics(): Observable<CurriculumApiTopic[]> {
    return this.http.get<CurriculumApiTopic[]>(`${this.apiBase}/curriculum/topics`);
  }

  /** GET /api/curriculum/topics?grade=X */
  getTopicsByGrade(grade: number | string): Observable<CurriculumApiTopic[]> {
    return this.http.get<CurriculumApiTopic[]>(
      `${this.apiBase}/curriculum/topics?grade=${encodeURIComponent(String(grade))}`,
    );
  }

  /** GET /api/curriculum/topic/:id */
  getTopicById(id: string): Observable<CurriculumApiTopic> {
    return this.http.get<CurriculumApiTopic>(
      `${this.apiBase}/curriculum/topic/${encodeURIComponent(id)}`,
    );
  }

  /** GET /api/curriculum/subtopics/:topicId */
  getSubtopics(topicId: string): Observable<CurriculumApiSubtopic[]> {
    return this.http.get<CurriculumApiSubtopic[]>(
      `${this.apiBase}/curriculum/subtopics/${encodeURIComponent(topicId)}`,
    );
  }

  /** GET /api/curriculum/grades */
  getAllGrades(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiBase}/curriculum/grades`);
  }

  /** GET /api/curriculum/stages */
  getAllStages(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiBase}/curriculum/stages`);
  }
}

