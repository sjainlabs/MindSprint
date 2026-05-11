import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { type LearningLevel } from './diagnostic.service';
import { type GameMode, type MathOperation } from './student-intelligence.service';

export interface AbacusFlashPayload {
  flashSequence: number[];
  speedMs: number;
}

export interface AbacusFlashSubmitResponse {
  correct: boolean;
  xpEarned: number;
  newDifficulty: number;
  newStreak: number;
  dailyQuestProgress: number;
}

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
  private readonly apiRoot = environment.apiUrl;

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

  getAbacusFlashChallenge(payload: {
    studentId: string;
    difficulty?: number;
    streak?: number;
  }) {
    const params = new URLSearchParams({
      studentId: payload.studentId,
      mode: 'abacus-flash'
    });

    if (payload.difficulty !== undefined) {
      params.set('difficulty', String(payload.difficulty));
    }

    if (payload.streak !== undefined) {
      params.set('streak', String(payload.streak));
    }

    return this.http.get<GameChallenge>(
      `${this.apiRoot}/game/challenge?${params.toString()}`
    );
  }

  submitAbacusFlash(payload: {
    studentId: string;
    challengeId: string;
    answer: number;
    timeTakenMs?: number;
  }): Observable<AbacusFlashSubmitResponse> {
    return this.http.post<AbacusFlashSubmitResponse>(
      `${this.apiRoot}/game/submit`,
      payload,
    );
  }
}
