import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {map, Observable} from 'rxjs';
import { environment } from '../../environments/environment';

/** EnhancedTopic from new backend syllabus system */
export interface EnhancedTopic {
  id: string;
  name: string;
  cbseGrade: number;
  kumonBand: string;
  practiceLevel: string;
  skills: { id: string; difficultyScore: number }[];
}

export interface EnhancedSyllabusResponse {
  topics: EnhancedTopic[];
}

@Injectable({ providedIn: 'root' })
export class PracticeConfigService {
  private readonly http = inject(HttpClient);
  // private readonly apiBase = environment.apiUrl.replace(/\/$/, '');
  private readonly apiRoot = environment.apiUrl;
  private readonly apiBase = `${this.apiRoot}`;
  /** Fetch EnhancedSyllabus with difficulty-aware topics */
  getSyllabus(): Observable<EnhancedSyllabusResponse> {
    return this.http.get<EnhancedSyllabusResponse>(`${this.apiBase}/syllabus`);
  }

  /** Get all topics from syllabus */
  getTopics() {
    return this.http.get<{ topics: EnhancedTopic[] }>(`${this.apiBase}/syllabus/topics`)
      .pipe(map(res => res.topics));
  }


  /** Get topics filtered by grade (topics where cbseGrade <= grade) */
  getTopicsForGrade(grade: number): Observable<EnhancedTopic[]> {
    return this.http.get<EnhancedTopic[]>(
      `${this.apiBase}/syllabus/topics?grade=${encodeURIComponent(String(grade))}`
    );
  }
}

