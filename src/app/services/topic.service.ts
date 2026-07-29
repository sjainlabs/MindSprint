import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { type GradeLevel } from './diagnostic.service';

export interface SubtopicModel {
  id: string;
  name: string;
  difficulty: { min: number; max: number };
  conceptualTags?: string[];
  cognitiveComplexity?: string;
  integrationSkills?: string[];
  realWorldCategories?: string[];
  stemCategories?: string[];
  aiDifficultyScore?: number;
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

export interface BrowseTopic {
  id: string;
  skillId?: string;
  title: string;
  sourceTopicId: string;
  subtopics: string[];
  difficultyTiers: Array<{ name: string; min: number; max: number }>;
  prerequisites: string[];
  masteryPercentage: number;
  recommendedNextSteps: string[];
}

export interface TopicBrowserResponse {
  studentId: string;
  browseTopics: BrowseTopic[];
}

export interface ExplorationRecommendation {
  studentId: string;
  requestedTopicId: string;
  recommendedTopicId: string;
  recommendedTopicName: string;
  recommendedDifficulty: number;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class TopicService {
  private readonly apiRoot = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  getTaxonomy(): Observable<TopicTaxonomyResponse> {
    return this.http.get<TopicTaxonomyResponse>(`${this.apiRoot}/topics/taxonomy`);
  }

  getTopicsByGrade(grade: GradeLevel): Observable<{ grade: GradeLevel; topics: TopicModel[] }> {
    return this.http.get<{ grade: GradeLevel; topics: TopicModel[] }>(
      `${this.apiRoot}/topics/by-grade?grade=${grade}`,
    );
  }

  getPersonalizedPath(
    studentId: string,
  ): Observable<{ studentId: string; personalizedPath: TopicModel[] }> {
    return this.http.get<{ studentId: string; personalizedPath: TopicModel[] }>(
      `${this.apiRoot}/topics/personalized-path?studentId=${encodeURIComponent(studentId)}`,
    );
  }

  getTopicBrowser(studentId: string): Observable<TopicBrowserResponse> {
    return this.http.get<TopicBrowserResponse>(
      `${this.apiRoot}/topics/browser?studentId=${encodeURIComponent(studentId)}`,
    );
  }

  getExplorationRecommendation(
    studentId: string,
    topicId: string,
  ): Observable<ExplorationRecommendation> {
    return this.http.get<ExplorationRecommendation>(
      `${this.apiRoot}/topics/explore?studentId=${encodeURIComponent(studentId)}&topicId=${encodeURIComponent(topicId)}`,
    );
  }
}
