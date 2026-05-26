import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import type { FullInsightsResponse } from './insights.types';
import type { TopicInsight } from './insights.types';
import { PRACTICE_TOPIC_CATALOG } from './practice-topic-catalog';

@Injectable({ providedIn: 'root' })
export class InsightsService {
  private readonly apiRoot = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  /**
   * Fetch full insights for a student and an optional topic.
   * GET /api/insights/full/:studentId/:topicId
   */
  getFullInsights(studentId: string, topicId?: string): Observable<FullInsightsResponse> {
    const tid = topicId ? `/${encodeURIComponent(topicId)}` : '';
    return this.http.get<FullInsightsResponse>(`${this.apiRoot}/api/insights/full/${encodeURIComponent(studentId)}${tid}`);
  }

  /**
   * Fetch topic-level insight for a student and topic id.
   * GET /api/insights/topic/:studentId/:topicId
   */
  getTopicInsight(studentId: string, topicId: string): Observable<TopicInsight> {
    return this.http.get<TopicInsight>(`${this.apiRoot}/api/insights/topic/${encodeURIComponent(studentId)}/${encodeURIComponent(topicId)}`);
  }

  /**
   * Fetch parent-facing summary for a student/topic
   * GET /api/insights/summary/:studentId/:topicId
   */
  getParentSummary(studentId: string, topicId: string): Observable<any> {
    return this.http.get<any>(`${this.apiRoot}/api/insights/summary/${encodeURIComponent(studentId)}/${encodeURIComponent(topicId)}`);
  }

  /**
   * Fetch recommendation for a student/topic
   * GET /api/insights/recommendation/:studentId/:topicId
   */
  getRecommendation(studentId: string, topicId?: string): Observable<any> {
    const tid = topicId ? `/${encodeURIComponent(topicId)}` : '';
    return this.http.get<any>(`${this.apiRoot}/api/insights/recommendation/${encodeURIComponent(studentId)}${tid}`);
  }

  /**
   * Submit worksheet results for processing and insights.
   * POST /api/insights/submit
   * payload example: { studentId, topicId, worksheetId, answers: [{questionId, answer, correct, timeMs}], metadata: {...} }
   */
  submitWorksheetResults(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiRoot}/api/insights/submit`, payload);
  }

  /**
   * Fetch topic insights for all known practice topics.
   * This will call GET /api/insights/topic/:studentId/:topicId for each topic in the local catalog
   * and return an array of TopicInsight objects.
   */
  getAllTopicInsights(studentId: string): Observable<TopicInsight[]> {
    if (!studentId) return of([]);

    // limit to a reasonable number to avoid flooding the backend in UIs
    const topicIds = PRACTICE_TOPIC_CATALOG.map((t) => t.id).slice(0, 50);

    const calls = topicIds.map((topicId) => this.getTopicInsight(studentId, topicId));

    return forkJoin(calls).pipe(
      // ensure result is always an array
      map((arr) => arr ?? []),
    );
  }
}

