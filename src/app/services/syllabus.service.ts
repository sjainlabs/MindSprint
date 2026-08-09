import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type SyllabusDomain =
  | 'fluency'
  | 'conceptual'
  | 'reasoning'
  | 'map'
  | 'competition';

export interface SyllabusSkill {
  skillId: string;
  name: string;
  description: string;
  difficulty: number;
  ritBand?: { min: number; max: number };
  recommendedNextSteps: string[];
  domain: SyllabusDomain;
  gradeRange: { min: number; max: number };
  competitionLevel?: 'AMC-8' | 'AMC-10' | 'MATHCOUNTS' | 'AIME';
  reasoningLevel?: 'basic' | 'intermediate' | 'advanced';
  tags: string[];
}

export interface SyllabusDomainDetail {
  domainId: SyllabusDomain;
  name: string;
  description: string;
  skills: SyllabusSkill[];
  totalSkills: number;
}

export interface SuperSyllabus {
  version: string;
  domains: SyllabusDomainDetail[];
  totalSkills: number;
  gradeRange: { min: number; max: number };
}

export interface RITBandSkills {
  band: number;
  bandLabel: string;
  skills: SyllabusSkill[];
  gradeEquivalent: string;
  growthTargets: { currentBand: number; targetBand: number; monthsToTarget: number };
}

export interface MAPGrowthProjection {
  studentId: string;
  currentRIT: number;
  projectedRIT: number;
  projectedGrowth: number;
  confidenceLevel: 'low' | 'medium' | 'high';
  recommendedSkills: SyllabusSkill[];
  practiceSessionsNeeded: number;
}

@Injectable({
  providedIn: 'root',
})
export class SyllabusService {
  private readonly apiRoot = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  getSyllabus(): Observable<SuperSyllabus> {
    // Use modular syllabus endpoints - fetch domains/topics collection
    return this.http.get<SuperSyllabus>(`${this.apiRoot}/syllabus/topics`);
  }

  getDomain(domainId: SyllabusDomain): Observable<SyllabusDomainDetail> {
    return this.http.get<SyllabusDomainDetail>(`${this.apiRoot}/syllabus/domains/${domainId}`);
  }

  getSkillsByRIT(band: number): Observable<RITBandSkills> {
    return this.http.get<RITBandSkills>(`${this.apiRoot}/syllabus/rit/${band}`);
  }

  getSkill(skillId: string): Observable<SyllabusSkill> {
    return this.http.get<SyllabusSkill>(`${this.apiRoot}/syllabus/skills/${skillId}`);
  }

  getMAPGrowthProjection(studentId: string, currentRIT: number): Observable<MAPGrowthProjection> {
    return this.http.get<MAPGrowthProjection>(
      `${this.apiRoot}/syllabus/map-projection?studentId=${encodeURIComponent(studentId)}&rit=${currentRIT}`,
    );
  }
}
