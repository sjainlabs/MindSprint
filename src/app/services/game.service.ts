import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError } from 'rxjs';
import { environment } from '../../environments/environment';
import { type LearningLevel } from './diagnostic.service';
import { type GameMode, type MathOperation } from './student-intelligence.service';

export interface AbacusFlashPayload {
  flashSequence?: number[];
  sequence?: number[];
  numbers?: number[];
  speedMs?: number;
  flashSpeedMs?: number;
  intervalMs?: number;
}

export interface FallingNumbersPayload {
  prompt?: string;
  target?: number;
  operation?: MathOperation;
  numbers?: number[];
  speedMs?: number;
  lives?: number;
  comboTarget?: number;
}

export interface ChallengeRewards {
  xp: number;
  streakBonus: number;
  badge?: string;
}

export interface DailyQuestState {
  id: string;
  description: string;
  target: number;
  progress: number;
  rewardXp: number;
  completed: boolean;
}

export interface BossBattleState {
  id: string;
  title: string;
  hp: number;
  phase: number;
  unlocked: boolean;
}

export interface PlayerState {
  xp: number;
  streak: number;
  badges: string[];
  level: number;
}

export interface AbacusFlashSubmitResponse {
  correct: boolean;
  xpEarned: number;
  newDifficulty: number;
  newStreak: number;
  dailyQuestProgress: number;
}

export type ChallengeOption = number | string;
export type MapAnswerType = 'single' | 'multi';

export interface MapStep {
  id?: string;
  prompt: string;
  options?: ChallengeOption[];
  answerType?: MapAnswerType;
  correctAnswers?: ChallengeOption[];
}

export interface MapGraphPayload {
  type: 'bar' | 'line' | 'picture';
  title?: string;
  labels: string[];
  values: number[];
  icons?: string[];
}

export interface MapTablePayload {
  title?: string;
  headers: string[];
  rows: Array<Array<string | number>>;
}

export interface GameChallenge {
  challengeId: string;
  studentId: string;
  prompt: string;
  operation?: MathOperation;
  options?: ChallengeOption[];
  answer?: ChallengeOption;
  timeLimitSeconds: number;
  difficulty: number;
  recommendedLevel: LearningLevel;
  rewards: ChallengeRewards;
  dailyQuest: DailyQuestState;
  bossBattle: BossBattleState;
  playerState: PlayerState;
  mode?: GameMode;
  gamePayload?: Record<string, unknown> | AbacusFlashPayload | FallingNumbersPayload;
}

export interface MapChallenge {
  challengeId: string;
  studentId: string;
  gradeLevel: number;
  domain: string;
  difficulty: number;
  prompt: string;
  steps: MapStep[];
  options: ChallengeOption[];
  answerType: MapAnswerType;
  correctAnswers: ChallengeOption[];
  graphPayload?: MapGraphPayload | null;
  tablePayload?: MapTablePayload | null;
  hints: string[];
  explanation: string;
  rewards: {
    xp: number;
    streakBonus: number;
    badge?: string;
  };
  mode?: GameMode;
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
  }): Observable<GameChallenge> {
    const normalizedPayload = {
      ...payload,
      mode: 'abacus-flash' as const,
    };

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

    return this.http
      .post<GameChallenge>(`${this.apiRoot}/game/abacus-flash/challenge`, normalizedPayload)
      .pipe(
        catchError(() =>
          this.http.get<GameChallenge>(`${this.apiRoot}/game/challenge?${params.toString()}`),
        ),
      );
  }

  submitAbacusFlash(payload: {
    studentId: string;
    challengeId: string;
    answer: number;
    timeTakenMs?: number;
  }): Observable<AbacusFlashSubmitResponse> {
    const normalizedPayload = {
      ...payload,
      mode: 'abacus-flash' as const,
    };
    return this.http
      .post<AbacusFlashSubmitResponse>(
        `${this.apiRoot}/game/abacus-flash/submit`,
        normalizedPayload,
      )
      .pipe(
        catchError(() =>
          this.http.post<AbacusFlashSubmitResponse>(`${this.apiRoot}/game/submit`, normalizedPayload),
        ),
      );
  }
}
