import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { SyllabusService } from './syllabus.service';
import { environment } from '../../environments/environment';

const apiRoot = environment.apiUrl;

describe('SyllabusService', () => {
  let service: SyllabusService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SyllabusService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SyllabusService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getSyllabus calls GET /api/syllabus', () => {
    const mockSyllabus = {
      version: '1.0',
      domains: [],
      totalSkills: 0,
      gradeRange: { min: 0, max: 12 },
    };

    service.getSyllabus().subscribe((result) => {
      expect(result).toEqual(mockSyllabus);
    });

    const req = httpMock.expectOne(`${apiRoot}/syllabus`);
    expect(req.request.method).toBe('GET');
    req.flush(mockSyllabus);
  });

  it('getDomain calls GET /api/syllabus/:domainId', () => {
    const mockDomain = {
      domainId: 'fluency',
      name: 'Fluency & Speed',
      description: 'Speed drills',
      skills: [],
      totalSkills: 0,
    };

    service.getDomain('fluency').subscribe((result) => {
      expect(result.domainId).toBe('fluency');
    });

    const req = httpMock.expectOne(`${apiRoot}/syllabus/fluency`);
    expect(req.request.method).toBe('GET');
    req.flush(mockDomain);
  });

  it('getSkillsByRIT calls GET /api/syllabus/rit/:band', () => {
    const mockRIT = {
      band: 210,
      bandLabel: 'RIT 210',
      gradeEquivalent: 'Grade 3–4',
      growthTargets: { currentBand: 210, targetBand: 220, monthsToTarget: 9 },
      skills: [],
    };

    service.getSkillsByRIT(210).subscribe((result) => {
      expect(result.band).toBe(210);
    });

    const req = httpMock.expectOne(`${apiRoot}/syllabus/rit/210`);
    expect(req.request.method).toBe('GET');
    req.flush(mockRIT);
  });

  it('getSkill calls GET /api/syllabus/skill/:skillId', () => {
    const mockSkill = {
      skillId: 'skill-abc',
      name: 'Multiplication',
      description: 'Multiply within 100',
      difficulty: 40,
      recommendedNextSteps: ['Division'],
      domain: 'fluency',
      gradeRange: { min: 3, max: 4 },
      tags: ['multiplication'],
    };

    service.getSkill('skill-abc').subscribe((result) => {
      expect(result.skillId).toBe('skill-abc');
    });

    const req = httpMock.expectOne(`${apiRoot}/syllabus/skill/skill-abc`);
    expect(req.request.method).toBe('GET');
    req.flush(mockSkill);
  });

  it('getMAPGrowthProjection calls correct API endpoint', () => {
    const mockProjection = {
      studentId: 'student-demo',
      currentRIT: 220,
      projectedRIT: 228,
      projectedGrowth: 8,
      confidenceLevel: 'medium',
      recommendedSkills: [],
      practiceSessionsNeeded: 12,
    };

    service.getMAPGrowthProjection('student-demo', 220).subscribe((result) => {
      expect(result.currentRIT).toBe(220);
    });

    const req = httpMock.expectOne(
      `${apiRoot}/syllabus/map-projection?studentId=student-demo&rit=220`,
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockProjection);
  });

  it('getDomain supports all Super-Syllabus domain IDs', () => {
    const domains = [
      'fluency',
      'conceptual',
      'reasoning',
      'map',
      'competition',
    ] as const;

    for (const domain of domains) {
      service.getDomain(domain).subscribe();
      const req = httpMock.expectOne(`${apiRoot}/syllabus/${domain}`);
      req.flush({ domainId: domain, name: domain, description: '', skills: [], totalSkills: 0 });
    }
  });
});
