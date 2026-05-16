import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export type MasteryLevel = 'not-started' | 'developing' | 'proficient' | 'mastered';
export type RecommendationReason = 'weak-skill' | 'next-progression' | 'review-needed' | 'general';

export interface MasterySkillState {
  skillId: string;
  skillName: string;
  level: MasteryLevel;
  accuracy: number;
  attempts: number;
  lastPracticed: string | null;
  progressToNextLevel: number;
  foundational?: boolean;
}

export interface MasteryRecommendation {
  skillId: string;
  skillName: string;
  reason: RecommendationReason;
  action: string;
}

export interface MasteryState {
  studentId: string;
  updatedAt: string;
  skills: MasterySkillState[];
  weakSkills: MasterySkillState[];
  recommendedNextSkill: MasteryRecommendation | null;
}

export interface MasteryUpdateEvent {
  studentId: string;
  skillId: string;
  skillName?: string;
  isCorrect: boolean;
  attemptedAt?: string;
}

@Injectable({
  providedIn: 'root',
})
export class MasteryEngineService {
  private readonly apiRoot = environment.apiUrl;
  private readonly masteryUrl = `${this.apiRoot}/mastery`;
  private readonly cache = new Map<string, MasteryState>();
  private readonly operationToSkill: Record<string, string> = {
    addition: 'addition',
    subtraction: 'subtraction',
    multiplication: 'multiplication',
    division: 'division',
  };

  constructor(private readonly http: HttpClient) {}

  fetchMasteryState(studentId: string): Observable<MasteryState> {
    if (this.cache.has(studentId)) {
      return of(this.cache.get(studentId)!);
    }

    return this.http
      .get<MasteryState>(`${this.masteryUrl}/state?studentId=${encodeURIComponent(studentId)}`)
      .pipe(
        map((state) => this.normalizeMasteryState(state, studentId)),
        tap((state) => this.cache.set(studentId, state)),
        catchError(() => {
          const fallback = this.createEmptyState(studentId);
          this.cache.set(studentId, fallback);
          return of(fallback);
        }),
      );
  }

  updateMastery(event: MasteryUpdateEvent): Observable<MasteryState> {
    const normalizedEvent = {
      ...event,
      attemptedAt: event.attemptedAt ?? new Date().toISOString(),
      skillId: this.normalizeSkillId(event.skillId),
    };

    this.applyLocalUpdate(normalizedEvent);

    return this.http.post<MasteryState>(`${this.masteryUrl}/update`, normalizedEvent).pipe(
      map((state) => this.normalizeMasteryState(state, event.studentId)),
      tap((state) => this.cache.set(event.studentId, state)),
      catchError(() => of(this.cache.get(event.studentId) ?? this.createEmptyState(event.studentId))),
    );
  }

  getMastery(skillId: string, studentId = 'student-demo'): MasterySkillState | null {
    const state = this.cache.get(studentId);
    if (!state) return null;
    const normalized = this.normalizeSkillId(skillId);
    return state.skills.find((skill) => this.normalizeSkillId(skill.skillId) === normalized) ?? null;
  }

  getMasteryLevel(skillId: string, studentId = 'student-demo'): MasteryLevel {
    return this.getMastery(skillId, studentId)?.level ?? 'not-started';
  }

  getWeakSkills(studentId = 'student-demo'): MasterySkillState[] {
    const state = this.cache.get(studentId);
    if (!state) return [];
    return [...state.weakSkills];
  }

  getRecommendedNextSkill(studentId = 'student-demo'): MasteryRecommendation | null {
    return this.cache.get(studentId)?.recommendedNextSkill ?? null;
  }

  getRecommendedNextAction(studentId = 'student-demo'): string {
    return this.getRecommendedNextSkill(studentId)?.action ?? 'Start practice on your current focus skill.';
  }

  private applyLocalUpdate(event: MasteryUpdateEvent): void {
    const current = this.cache.get(event.studentId) ?? this.createEmptyState(event.studentId);
    const skillId = this.normalizeSkillId(event.skillId);
    const existing = current.skills.find((entry) => this.normalizeSkillId(entry.skillId) === skillId);
    const now = event.attemptedAt ?? new Date().toISOString();

    if (!existing) {
      const accuracy = event.isCorrect ? 100 : 0;
      const created: MasterySkillState = {
        skillId,
        skillName: event.skillName ?? this.toSkillDisplayName(skillId),
        level: this.toLevelFromAccuracy(accuracy),
        accuracy,
        attempts: 1,
        lastPracticed: now,
        progressToNextLevel: accuracy,
      };
      current.skills = [...current.skills, created];
    } else {
      const attempts = existing.attempts + 1;
      const weightedAccuracy =
        ((existing.accuracy * existing.attempts) + (event.isCorrect ? 100 : 0)) / attempts;
      existing.attempts = attempts;
      existing.accuracy = Math.round(weightedAccuracy);
      existing.lastPracticed = now;
      existing.level = this.toLevelFromAccuracy(existing.accuracy);
      existing.progressToNextLevel = this.toProgress(existing.accuracy, existing.level);
    }

    const normalized = this.normalizeMasteryState(current, event.studentId);
    this.cache.set(event.studentId, normalized);
  }

  private normalizeMasteryState(state: MasteryState, studentId: string): MasteryState {
    const safeSkills = (state.skills ?? []).map((skill) => {
      const normalizedSkillId = this.normalizeSkillId(skill.skillId);
      const accuracy = this.clampPercent(skill.accuracy ?? 0);
      const level = skill.level ?? this.toLevelFromAccuracy(accuracy);
      return {
        ...skill,
        skillId: normalizedSkillId,
        skillName: skill.skillName?.trim() || this.toSkillDisplayName(normalizedSkillId),
        accuracy,
        attempts: Math.max(0, Math.floor(skill.attempts ?? 0)),
        level,
        progressToNextLevel: this.clampPercent(
          skill.progressToNextLevel ?? this.toProgress(accuracy, level),
        ),
        lastPracticed: skill.lastPracticed ?? null,
      };
    });

    const weakSkills =
      state.weakSkills?.length
        ? state.weakSkills
        : safeSkills.filter((skill) => skill.level === 'not-started' || skill.level === 'developing');

    const recommended =
      state.recommendedNextSkill ??
      (weakSkills[0]
        ? {
            skillId: weakSkills[0].skillId,
            skillName: weakSkills[0].skillName,
            reason: 'weak-skill' as const,
            action: `Practice ${weakSkills[0].skillName}`,
          }
        : null);

    return {
      studentId,
      updatedAt: state.updatedAt ?? new Date().toISOString(),
      skills: safeSkills,
      weakSkills: weakSkills.map((skill) => ({
        ...skill,
        skillId: this.normalizeSkillId(skill.skillId),
        skillName: skill.skillName?.trim() || this.toSkillDisplayName(skill.skillId),
        level: skill.level ?? this.toLevelFromAccuracy(skill.accuracy ?? 0),
        accuracy: this.clampPercent(skill.accuracy ?? 0),
        attempts: Math.max(0, Math.floor(skill.attempts ?? 0)),
        progressToNextLevel: this.clampPercent(skill.progressToNextLevel ?? 0),
        lastPracticed: skill.lastPracticed ?? null,
      })),
      recommendedNextSkill: recommended
        ? {
            ...recommended,
            skillId: this.normalizeSkillId(recommended.skillId),
            reason: recommended.reason ?? 'general',
            action: recommended.action?.trim() || `Practice ${recommended.skillName}`,
          }
        : null,
    };
  }

  private createEmptyState(studentId: string): MasteryState {
    return {
      studentId,
      updatedAt: new Date().toISOString(),
      skills: [],
      weakSkills: [],
      recommendedNextSkill: null,
    };
  }

  private normalizeSkillId(skillId: string): string {
    const raw = String(skillId ?? '').trim().toLowerCase();
    return this.operationToSkill[raw] ?? raw || 'general-skill';
  }

  private toSkillDisplayName(skillId: string): string {
    return this.normalizeSkillId(skillId)
      .split(/[-_]+/g)
      .filter(Boolean)
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join(' ');
  }

  private toLevelFromAccuracy(accuracy: number): MasteryLevel {
    if (accuracy >= 90) return 'mastered';
    if (accuracy >= 75) return 'proficient';
    if (accuracy >= 45) return 'developing';
    return 'not-started';
  }

  private toProgress(accuracy: number, level: MasteryLevel): number {
    if (level === 'mastered') return 100;
    if (level === 'proficient') return Math.round(((accuracy - 75) / 15) * 100);
    if (level === 'developing') return Math.round(((accuracy - 45) / 30) * 100);
    return Math.round((accuracy / 45) * 100);
  }

  private clampPercent(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, Math.round(value)));
  }
}
