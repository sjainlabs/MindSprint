import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of, switchMap } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import type { FullInsightsResponse } from './insights.types';
import type { TopicInsight } from './insights.types';
import { CurriculumApiService } from './curriculum-api.service';

@Injectable({ providedIn: 'root' })
export class InsightsService {
  private readonly apiRoot = environment.apiUrl;

  constructor(
    private readonly http: HttpClient,
    private readonly curriculumApi: CurriculumApiService,
  ) {}

  /**
   * Fetch full insights for a student and an optional topic.
   * GET /api/insights/full/:studentId/:topicId
   */
  getFullInsights(studentId: string, topicId?: string): Observable<FullInsightsResponse> {
    const tid = topicId ? `/${encodeURIComponent(topicId)}` : '';
    return this.http.get<FullInsightsResponse>(`${this.apiRoot}/insights/full/${encodeURIComponent(studentId)}${tid}`);
  }

  /**
   * Fetch topic-level insight for a student and topic id.
   * GET /api/insights/topic/:studentId/:topicId
   */
  getTopicInsight(studentId: string, topicId: string): Observable<TopicInsight> {
    return this.http.get<TopicInsight>(`${this.apiRoot}/insights/topic/${encodeURIComponent(studentId)}/${encodeURIComponent(topicId)}`);
  }

  /**
   * Fetch parent-facing summary for a student/topic
   * GET /api/insights/summary/:studentId/:topicId
   */
  getParentSummary(studentId: string, topicId: string): Observable<any> {
    return this.http.get<any>(`${this.apiRoot}/insights/summary/${encodeURIComponent(studentId)}/${encodeURIComponent(topicId)}`);
  }

  /**
   * Fetch recommendation for a student/topic
   * GET /api/insights/recommendation/:studentId/:topicId
   */
  getRecommendation(studentId: string, topicId?: string): Observable<any> {
    const tid = topicId ? `/${encodeURIComponent(topicId)}` : '';
    return this.http.get<any>(`${this.apiRoot}/insights/recommendation/${encodeURIComponent(studentId)}${tid}`);
  }

  /**
   * Submit worksheet results for processing and insights.
   * POST /api/insights/submit
   * payload example: { studentId, topicId, worksheetId, answers: [{questionId, answer, correct, timeMs}], metadata: {...} }
   */
  submitWorksheetResults(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiRoot}/insights/submit`, payload);
  }

  /**
   * Fetch topic insights for all curriculum topics from the backend.
   * First fetches all topics via CurriculumApiService, then queries insights for each.
   */
  getAllTopicInsights(studentId: string): Observable<TopicInsight[]> {
    if (!studentId) return of([]);

    return this.curriculumApi.getAllTopics().pipe(
      switchMap((topics) => {
        // Limit to avoid flooding the backend
        const topicIds = topics.map((t) => t.id).slice(0, 50);
        if (topicIds.length === 0) return of([]);
        const calls = topicIds.map((topicId) => this.getTopicInsight(studentId, topicId));
        return forkJoin(calls);
      }),
      map((arr) => arr ?? []),
    );
  }
}

