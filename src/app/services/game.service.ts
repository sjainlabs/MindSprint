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

export interface FallingNumbersPayload {
  target: number;
  stream: number[];
  combosEnabled: boolean;
  powerUps: string[];
  prompt?: string;
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

interface BaseGameChallenge {
  challengeId: string;
  studentId: string;
  timeLimitSeconds: number;
  difficulty: number;
  recommendedLevel?: LearningLevel;
  rewards: ChallengeRewards;
  dailyQuest: DailyQuestState;
  bossBattle: BossBattleState;
  playerState: PlayerState;
}

export interface FallingNumbersChallenge extends BaseGameChallenge {
  mode: 'falling-numbers';
  prompt?: string;
  gamePayload: FallingNumbersPayload;
}

export interface AbacusFlashChallenge extends BaseGameChallenge {
  mode: 'abacus-flash';
  gamePayload: AbacusFlashPayload;
}

export interface ArithmeticChallenge extends BaseGameChallenge {
  mode: 'arithmetic' | 'boss-battle' | 'ai-puzzle';
  prompt: string;
  operation: MathOperation;
  options: ChallengeOption[];
  answer: ChallengeOption;
  gamePayload?: Record<string, unknown>;
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
  rewards: ChallengeRewards;
  mode: 'map' | 'map-challenge';
}

export type GameChallenge =
  | FallingNumbersChallenge
  | AbacusFlashChallenge
  | ArithmeticChallenge
  | MapChallenge;

export type LegacyChallenge = FallingNumbersChallenge | AbacusFlashChallenge | ArithmeticChallenge;

function normalizeGameMode(mode?: string): string | undefined {
  if (!mode) {
    return undefined;
  }
  const normalized = mode.trim().toLowerCase();
  if (normalized === 'flash-abacus') {
    return 'abacus-flash';
  }
  if (normalized === 'map-challenge') {
    return 'map';
  }
  return normalized;
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
      params.set('mode', normalizeGameMode(payload.mode) ?? payload.mode);
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
  }): Observable<AbacusFlashChallenge> {
    const params = new URLSearchParams({
      studentId: payload.studentId,
      mode: 'abacus-flash',
    });

    if (payload.difficulty !== undefined) {
      params.set('difficulty', String(payload.difficulty));
    }

    if (payload.streak !== undefined) {
      params.set('streak', String(payload.streak));
    }

    return this.http.get<AbacusFlashChallenge>(`${this.apiRoot}/game/challenge?${params.toString()}`);
  }

  submitAbacusFlash(payload: {
    studentId: string;
    mode: 'abacus-flash';
    score: number;
    accuracy: number;
    streak: number;
  }): Observable<AbacusFlashSubmitResponse> {
    const normalizedPayload = {
      ...payload,
      score: Math.max(0, Math.min(100, payload.score)),
      accuracy: Math.max(0, Math.min(100, payload.accuracy)),
      streak: Math.max(0, Math.floor(payload.streak)),
    };
    return this.http.post<AbacusFlashSubmitResponse>(`${this.apiRoot}/game/submit`, normalizedPayload);
  }
}
