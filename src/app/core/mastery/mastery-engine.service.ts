import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
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

const MAX_ACCURACY_PERCENT = 100;
const MASTERY_MASTERED_THRESHOLD = 90;
const MASTERY_PROFICIENT_THRESHOLD = 75;
const MASTERY_DEVELOPING_THRESHOLD = 45;
const MASTERY_MASTERED_SPAN = MAX_ACCURACY_PERCENT - MASTERY_PROFICIENT_THRESHOLD;
const MASTERY_PROFICIENT_SPAN = MASTERY_PROFICIENT_THRESHOLD - MASTERY_DEVELOPING_THRESHOLD;
const MASTERY_DEVELOPING_SPAN = MASTERY_DEVELOPING_THRESHOLD;
const DEFAULT_SECONDS_SPENT = 20;

type BackendMasteryLevel = 'not_started' | 'developing' | 'proficient' | 'mastered';

interface BackendSkillMastery {
  level: BackendMasteryLevel;
  accuracy: number;
  attempts: number;
  lastPracticed?: string | Date;
}

interface BackendWeakSkillsResponse {
  studentId: string;
  weakSkills: string[];
}

interface BackendNextSkillResponse {
  studentId: string;
  nextSkill?: string;
}

interface BackendRecommendationsResponse {
  studentId: string;
  nextSkill?: string;
  nextAction?: string;
}

interface BackendSkillResponse {
  studentId: string;
  skillId: string;
  mastery: BackendSkillMastery;
}

interface BackendUpdateResponse {
  studentId: string;
  skillId: string;
  mastery: BackendSkillMastery;
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

    const weakSkillsRequest: Observable<BackendWeakSkillsResponse> = this.http
      .get<BackendWeakSkillsResponse>(`${this.masteryUrl}/${encodeURIComponent(studentId)}/weak-skills`)
      .pipe(catchError(() => of<BackendWeakSkillsResponse>({ studentId, weakSkills: [] })));

    const nextSkillRequest: Observable<BackendNextSkillResponse> = this.http
      .get<BackendNextSkillResponse>(`${this.masteryUrl}/${encodeURIComponent(studentId)}/next-skill`)
      .pipe(catchError(() => of<BackendNextSkillResponse>({ studentId, nextSkill: undefined })));

    const recommendationsRequest: Observable<BackendRecommendationsResponse> = this.http
      .get<BackendRecommendationsResponse>(`${this.masteryUrl}/${encodeURIComponent(studentId)}/recommendations`)
      .pipe(catchError(() => of<BackendRecommendationsResponse>({ studentId, nextSkill: undefined, nextAction: undefined })));

    return forkJoin([weakSkillsRequest, nextSkillRequest, recommendationsRequest])
      .pipe(
        switchMap(([weakRaw, nextRaw, recommendationsRaw]) => {
          const weak = weakRaw as BackendWeakSkillsResponse;
          const safeNext = nextRaw as BackendNextSkillResponse;
          const safeRecommendations = recommendationsRaw as BackendRecommendationsResponse;
          const candidateSkillIds = Array.from(
            new Set(
              [...(weak.weakSkills ?? []), safeNext.nextSkill, safeRecommendations.nextSkill]
                .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
                .map((value) => value.trim()),
            ),
          );

          if (candidateSkillIds.length === 0) {
            return of({
              weak,
              nextSkill: safeNext.nextSkill,
              recommendationSkill: safeRecommendations.nextSkill,
              nextAction: safeRecommendations.nextAction,
              skillResponses: [] as Array<BackendSkillResponse | null>,
            });
          }

          return forkJoin(
            candidateSkillIds.map((skillId) =>
              this.http
                .get<BackendSkillResponse>(
                  `${this.masteryUrl}/${encodeURIComponent(studentId)}/skill/${encodeURIComponent(skillId)}`,
                )
                .pipe(catchError(() => of(null))),
            ),
          ).pipe(map((skillResponses) => ({
            weak,
            nextSkill: safeNext.nextSkill,
            recommendationSkill: safeRecommendations.nextSkill,
            nextAction: safeRecommendations.nextAction,
            skillResponses,
          })));
        }),
        map(({ weak, nextSkill, recommendationSkill, nextAction, skillResponses }) =>
          this.normalizeBackendMasteryState(
            studentId,
            weak.weakSkills ?? [],
            nextSkill ?? recommendationSkill,
            nextAction,
            skillResponses,
          ),
        ),
        tap((state) => this.cache.set(studentId, state)),
        catchError(() => {
          const fallback = this.createEmptyState(studentId);
          this.cache.set(studentId, fallback);
          return of(fallback);
        }),
      );
  }

  updateMastery(event: MasteryUpdateEvent): Observable<MasteryState> {
    const normalizedEvent: MasteryUpdateEvent = {
      ...event,
      attemptedAt: event.attemptedAt ?? new Date().toISOString(),
      skillId: this.normalizeSkillId(event.skillId),
    };

    this.applyLocalUpdate(normalizedEvent);

    const payload = {
      skillId: normalizedEvent.skillId,
      isCorrect: normalizedEvent.isCorrect,
      secondsSpent: DEFAULT_SECONDS_SPENT,
      timestamp: normalizedEvent.attemptedAt,
    };

    return this.http
      .post<BackendUpdateResponse>(`${this.masteryUrl}/${encodeURIComponent(event.studentId)}/update`, payload)
      .pipe(
      switchMap(() => this.fetchMasteryState(event.studentId)),
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
      const accuracy = event.isCorrect ? MAX_ACCURACY_PERCENT : 0;
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
        ((existing.accuracy * existing.attempts)
          + (event.isCorrect ? MAX_ACCURACY_PERCENT : 0))
        / attempts;
      existing.attempts = attempts;
      existing.accuracy = Math.round(weightedAccuracy);
      existing.lastPracticed = now;
      existing.level = this.toLevelFromAccuracy(existing.accuracy);
      existing.progressToNextLevel = this.toProgress(existing.accuracy, existing.level);
    }

    const normalized: MasteryState = {
      ...current,
      studentId: event.studentId,
      updatedAt: new Date().toISOString(),
    };
    this.cache.set(event.studentId, normalized);
  }

  private normalizeBackendMasteryState(
    studentId: string,
    weakSkillIds: string[],
    nextSkillId: string | undefined,
    nextAction: string | undefined,
    skillResponses: Array<BackendSkillResponse | null>,
  ): MasteryState {
    const skills = skillResponses
      .filter((entry): entry is BackendSkillResponse => !!entry && !!entry.mastery)
      .map((entry) => {
        const skillId = this.normalizeSkillId(entry.skillId);
        const accuracy = this.clampPercent(entry.mastery.accuracy ?? 0);
        const level = this.fromBackendLevel(entry.mastery.level, accuracy);
        return {
          skillId,
          skillName: this.toSkillDisplayName(skillId),
          level,
          accuracy,
          attempts: Math.max(0, Math.floor(entry.mastery.attempts ?? 0)),
          lastPracticed: this.normalizeLastPracticed(entry.mastery.lastPracticed),
          progressToNextLevel: this.toProgress(accuracy, level),
        } satisfies MasterySkillState;
      });

    const skillsById = new Map(skills.map((skill) => [skill.skillId, skill]));
    const weakSkills = weakSkillIds
      .map((id) => skillsById.get(this.normalizeSkillId(id)))
      .filter((skill): skill is MasterySkillState => !!skill);

    const recommendedSkillId = this.normalizeSkillId(nextSkillId ?? weakSkillIds[0] ?? '');
    const recommendedSkill = skillsById.get(recommendedSkillId);

    return {
      studentId,
      updatedAt: new Date().toISOString(),
      skills,
      weakSkills,
      recommendedNextSkill: recommendedSkill
        ? {
            skillId: recommendedSkill.skillId,
            skillName: recommendedSkill.skillName,
            reason: weakSkills.some((skill) => skill.skillId === recommendedSkill.skillId)
              ? 'weak-skill'
              : 'next-progression',
            action: nextAction?.trim() || `Practice ${recommendedSkill.skillName}`,
          }
        : null,
    };
  }

  private fromBackendLevel(level: BackendMasteryLevel | undefined, accuracy: number): MasteryLevel {
    if (level === 'mastered') return 'mastered';
    if (level === 'proficient') return 'proficient';
    if (level === 'developing') return 'developing';
    if (level === 'not_started') return 'not-started';
    return this.toLevelFromAccuracy(accuracy);
  }

  private normalizeLastPracticed(value: string | Date | undefined): string | null {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }


  private normalizeMasteryState(state: MasteryState, studentId: string): MasteryState {
    const skills = (state.skills ?? []).map((skill) => {
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
        progressToNextLevel: this.clampPercent(skill.progressToNextLevel ?? this.toProgress(accuracy, level)),
        lastPracticed: skill.lastPracticed ?? null,
      };
    });

    const weakSkills = (state.weakSkills ?? [])
      .map((skill) => skills.find((entry) => entry.skillId === this.normalizeSkillId(skill.skillId)) ?? null)
      .filter((skill): skill is MasterySkillState => !!skill);

    return {
      studentId,
      updatedAt: state.updatedAt ?? new Date().toISOString(),
      skills,
      weakSkills,
      recommendedNextSkill: state.recommendedNextSkill
        ? {
            ...state.recommendedNextSkill,
            skillId: this.normalizeSkillId(state.recommendedNextSkill.skillId),
            reason: state.recommendedNextSkill.reason ?? 'general',
            action: state.recommendedNextSkill.action?.trim() || `Practice ${state.recommendedNextSkill.skillName}`,
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
    return (this.operationToSkill[raw] ?? raw) || 'general-skill';
  }

  private toSkillDisplayName(skillId: string): string {
    return this.normalizeSkillId(skillId)
      .split(/[-_]+/g)
      .filter(Boolean)
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join(' ');
  }

  private toLevelFromAccuracy(accuracy: number): MasteryLevel {
    if (accuracy >= MASTERY_MASTERED_THRESHOLD) return 'mastered';
    if (accuracy >= MASTERY_PROFICIENT_THRESHOLD) return 'proficient';
    if (accuracy >= MASTERY_DEVELOPING_THRESHOLD) return 'developing';
    return 'not-started';
  }

  private toProgress(accuracy: number, level: MasteryLevel): number {
    if (level === 'mastered') return 100;
    if (level === 'proficient') {
      return Math.round(
        ((accuracy - MASTERY_PROFICIENT_THRESHOLD) / MASTERY_MASTERED_SPAN) * MAX_ACCURACY_PERCENT,
      );
    }
    if (level === 'developing') {
      return Math.round(
        ((accuracy - MASTERY_DEVELOPING_THRESHOLD) / MASTERY_PROFICIENT_SPAN)
          * MAX_ACCURACY_PERCENT,
      );
    }
    return Math.round((accuracy / MASTERY_DEVELOPING_SPAN) * MAX_ACCURACY_PERCENT);
  }

  private clampPercent(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, Math.round(value)));
  }
}
