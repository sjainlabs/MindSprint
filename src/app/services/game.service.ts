import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { type LearningLevel } from './diagnostic.service';
import { type GameMode, type MathOperation } from './student-intelligence.service';

export interface GameChallenge {
  challengeId: string;
  studentId: string;
  prompt: string;
  operation: MathOperation;
  options: number[];
  answer: number;
  timeLimitSeconds: number;
  difficulty: number;
  recommendedLevel: LearningLevel;
  rewards: {
    xp: number;
    streakBonus: number;
    badge?: string;
  };
  dailyQuest: {
    id: string;
    description: string;
    target: number;
    progress: number;
    rewardXp: number;
    completed: boolean;
  };
  bossBattle: {
    id: string;
    title: string;
    hp: number;
    phase: number;
    unlocked: boolean;
  };
  playerState: {
    xp: number;
    streak: number;
    badges: string[];
    level: number;
  };
  mode?: GameMode;
  gamePayload?: Record<string, unknown>;
}

@Injectable({
  providedIn: 'root',
})
export class GameService {
  private readonly isLocalhost =
    typeof window !== 'undefined' && ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  private readonly apiRoot = this.isLocalhost ? 'http://localhost:3001/api' : '/api';

  constructor(private readonly http: HttpClient) {}

  getChallenge(payload: {
    studentId: string;
    mode?: GameMode;
    difficulty?: number;
    streak?: number;
    completedDailyQuestCount?: number;
  }): Observable<GameChallenge> {
    const params = new URLSearchParams({ studentId: payload.studentId });
    if (payload.mode) {
      params.set('mode', payload.mode);
    }
    if (typeof payload.difficulty === 'number') {
      params.set('difficulty', String(payload.difficulty));
    }
    if (typeof payload.streak === 'number') {
      params.set('streak', String(payload.streak));
    }
    if (typeof payload.completedDailyQuestCount === 'number') {
      params.set('completedDailyQuestCount', String(payload.completedDailyQuestCount));
    }
    return this.http.get<GameChallenge>(`${this.apiRoot}/game/challenge?${params.toString()}`);
  }

  submitChallenge(payload: {
    studentId: string;
    mode: GameMode;
    score: number;
    accuracy: number;
    streak: number;
  }): Observable<{ saved: boolean; xpEarned: number }> {
    return this.http.post<{ saved: boolean; xpEarned: number }>(`${this.apiRoot}/game/submit`, payload);
  }
}
