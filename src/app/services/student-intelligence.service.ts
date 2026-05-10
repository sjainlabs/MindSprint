import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { type LearningLevel } from './diagnostic.service';
import { type GradeLevel } from './diagnostic.service';
import { type AdvancedQuestionType } from './ai-worksheet.service';

export type MathOperation = 'addition' | 'subtraction' | 'multiplication' | 'division';
export type GameMode = 'abacus-flash' | 'falling-numbers' | 'boss-battle' | 'ai-puzzle';

export const DEFAULT_STUDENT_ID = 'student-demo';

export interface StudentProfile {
  studentId: string;
  age: number;
  grade: GradeLevel;
  masteryLevels: Record<MathOperation, number>;
  topicMastery: Record<string, number>;
  xp: number;
  level: number;
  streak: number;
  badges: string[];
  powerUps?: string[];
  dailyQuestsCompleted?: number;
  weeklyTournamentPoints?: number;
  milestones?: string[];
  unlockedGameModes?: GameMode[];
  onboardingCompleted?: boolean;
  avatar?: string;
  mathWorld?: string;
  goals?: string[];
  confidenceLevel?: 'low' | 'medium' | 'high';
  learningPathLevel: number;
  updatedAt: string;
}

export interface DifficultyScore {
  overallScore: number;
  operationScores: Record<MathOperation, number>;
  weakOperationWeight: number;
  recommendedLevel: LearningLevel;
}

export interface WorksheetRecommendation {
  studentId: string;
  targetDifficulty: number;
  recommendedLevel: LearningLevel;
  focusOperations: MathOperation[];
  rationale: string[];
  difficultyScore: DifficultyScore;
  recommendedTopicId?: string;
  recommendedSubtopicId?: string;
  recommendedGameMode?: GameMode;
  recommendedWorksheetType?: AdvancedQuestionType;
  confidenceAdjustment?: number;
  diagnosticsWeight?: number;
}

export interface SkillBreakdown {
  operation: MathOperation;
  mastery: number;
  averageAccuracy: number;
  attempts: number;
  totalTimeSeconds: number;
}

export interface StudentAnalytics {
  studentId: string;
  accuracyOverTime: Array<{
    worksheetId: string;
    accuracy: number;
    createdAt: string;
  }>;
  operationMastery: SkillBreakdown[];
  topicAnalytics: Array<{
    topicId: string;
    averageAccuracy: number;
    attempts: number;
  }>;
  gameAnalytics?: {
    totalSessions: number;
    averageScore: number;
    averageAccuracy: number;
    byMode: Array<{
      mode: GameMode;
      sessions: number;
      averageScore: number;
      averageAccuracy: number;
    }>;
  };
  averageTimePerWorksheet: number;
  totalWorksheets: number;
  recommendedNextSteps: string[];
}

@Injectable({
  providedIn: 'root',
})
export class StudentIntelligenceService {
  private readonly isLocalhost =
    typeof window !== 'undefined' && ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  private readonly apiRoot = this.isLocalhost ? 'http://localhost:3001/api' : '/api';

  constructor(private readonly http: HttpClient) {}

  getStudentProfile(studentId: string): Observable<StudentProfile> {
    return this.http.get<StudentProfile>(`${this.apiRoot}/students/${studentId}/profile`);
  }

  getStudentAnalytics(studentId: string): Observable<StudentAnalytics> {
    return this.http.get<StudentAnalytics>(`${this.apiRoot}/analytics/student/${studentId}`);
  }

  getAdaptiveRecommendation(payload: {
    studentId: string;
    currentLevel: LearningLevel;
    recentAccuracy: number;
    operationAccuracy: Partial<Record<MathOperation, number>>;
    confidence?: number;
    averageSecondsPerQuestion?: number;
    diagnosticAccuracy?: number;
    latestGameScore?: number;
  }): Observable<WorksheetRecommendation> {
    return this.http.post<WorksheetRecommendation>(`${this.apiRoot}/adaptive/next-worksheet`, payload);
  }
}
