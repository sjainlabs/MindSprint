import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { type GradeLevel } from './diagnostic.service';

export type OnboardingGoal = 'catch-up' | 'get-ahead' | 'exam-prep' | 'explore';
export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface OnboardingProfile {
  studentId: string;
  age: number;
  grade: GradeLevel;
  goals: OnboardingGoal[];
  confidenceLevel: ConfidenceLevel;
  placementScore: number;
  personalizedPath: string[];
  avatar: string;
  mathWorld: string;
  completedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class OnboardingService {
  private readonly apiRoot = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  saveOnboarding(payload: {
    studentId: string;
    age: number;
    grade: GradeLevel;
    goals: OnboardingGoal[];
    confidenceLevel: ConfidenceLevel;
    placementScore: number;
    avatar: string;
    mathWorld: string;
  }): Observable<OnboardingProfile> {
    return this.http.post<OnboardingProfile>(`${this.apiRoot}/onboarding`, payload);
  }

  getOnboarding(studentId: string): Observable<OnboardingProfile> {
    return this.http.get<OnboardingProfile>(`${this.apiRoot}/onboarding?studentId=${encodeURIComponent(studentId)}`);
  }
}
