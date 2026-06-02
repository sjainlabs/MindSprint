import { of, throwError } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SyllabusService } from '../../services/syllabus.service';
import { MapPrepComponent } from './map-prep';
import { PracticeService } from '../../services/practice.service';

const mockRITSkills = {
  band: 220,
  bandLabel: 'RIT 220',
  gradeEquivalent: 'Grade 4–5',
  growthTargets: { currentBand: 220, targetBand: 230, monthsToTarget: 9 },
  skills: [
    {
      skillId: 'skill-1',
      name: 'Fractions',
      description: 'Compare and order fractions',
      difficulty: 55,
      ritBand: { min: 215, max: 225 },
      recommendedNextSteps: ['Decimals', 'Percents'],
      domain: 'map' as const,
      gradeRange: { min: 4, max: 5 },
      tags: ['fractions'],
    },
    {
      skillId: 'skill-2',
      name: 'Geometry Basics',
      description: 'Perimeter and area',
      difficulty: 58,
      ritBand: { min: 218, max: 228 },
      recommendedNextSteps: ['Volume', 'Coordinate plane'],
      domain: 'map' as const,
      gradeRange: { min: 4, max: 5 },
      tags: ['geometry'],
    },
  ],
};

const mockProjection = {
  studentId: 'student-demo',
  currentRIT: 220,
  projectedRIT: 228,
  projectedGrowth: 8,
  confidenceLevel: 'medium' as const,
  recommendedSkills: [],
  practiceSessionsNeeded: 12,
};

const mockSheet = {
  worksheetId: 'sheet-1',
  title: 'MAP Practice Sheet · RIT 220',
  generatedAt: '2026-01-01T00:00:00.000Z',
  questionCount: 10,
  domains: ['Numbers & Operations'],
  ritBand: 220,
  downloadUrl: 'https://example.com/sheet-1.pdf',
};

describe('MapPrepComponent', () => {
  const syllabusServiceMock = {
    getSkillsByRIT: vi.fn(() => of(mockRITSkills)),
    getMAPGrowthProjection: vi.fn(() => of(mockProjection)),
  };
  const practiceServiceMock = {
    generateMapPracticeSheet: vi.fn(() => of(mockSheet)),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [MapPrepComponent],
      providers: [
        provideRouter([]),
        { provide: SyllabusService, useValue: syllabusServiceMock },
        { provide: PracticeService, useValue: practiceServiceMock },
      ],
    }).compileComponents();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(MapPrepComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('loads RIT skills on init', () => {
    const fixture = TestBed.createComponent(MapPrepComponent);
    fixture.detectChanges();

    expect(syllabusServiceMock.getSkillsByRIT).toHaveBeenCalledWith(220);
    expect(fixture.componentInstance.ritSkills()).toBeTruthy();
    expect(fixture.componentInstance.ritSkills()!.skills.length).toBe(2);
  });

  it('loads MAP growth projection on init', () => {
    const fixture = TestBed.createComponent(MapPrepComponent);
    fixture.detectChanges();

    expect(syllabusServiceMock.getMAPGrowthProjection).toHaveBeenCalledWith('student-demo', 220);
    expect(fixture.componentInstance.projection()!.projectedGrowth).toBe(8);
  });

  it('falls back to mock data when API fails', () => {
    syllabusServiceMock.getSkillsByRIT.mockReturnValueOnce(throwError(() => new Error('Network error')));
    const fixture = TestBed.createComponent(MapPrepComponent);
    fixture.detectChanges();

    // Should still have skills via fallback mock data
    expect(fixture.componentInstance.ritSkills()).toBeTruthy();
  });

  it('starts a practice session after loading skills', () => {
    const fixture = TestBed.createComponent(MapPrepComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.practiceQuestion()).toBeTruthy();
    expect(comp.practiceIndex()).toBe(0);
    expect(comp.sessionComplete()).toBe(false);
  });

  it('advances to next skill on markCorrect', () => {
    const fixture = TestBed.createComponent(MapPrepComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    comp.markCorrect();

    expect(comp.practiceCorrect()).toBe(1);
    expect(comp.practiceTotal()).toBe(1);
    expect(comp.practiceIndex()).toBe(1);
  });

  it('advances to next skill on markIncorrect without incrementing correct count', () => {
    const fixture = TestBed.createComponent(MapPrepComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    comp.markIncorrect();

    expect(comp.practiceCorrect()).toBe(0);
    expect(comp.practiceTotal()).toBe(1);
  });

  it('marks session complete after last skill', () => {
    const fixture = TestBed.createComponent(MapPrepComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    comp.markCorrect();
    comp.markCorrect();

    expect(comp.sessionComplete()).toBe(true);
    expect(comp.practiceQuestion()).toBeNull();
  });

  it('calculates accuracy percent correctly', () => {
    const fixture = TestBed.createComponent(MapPrepComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    comp.markCorrect();
    comp.markIncorrect();

    expect(comp.accuracyPercent).toBe(50);
  });

  it('computes growthPercent from projection', () => {
    const fixture = TestBed.createComponent(MapPrepComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    // projectedGrowth = 8, max = 15, so 8/15*100 ≈ 53
    expect(comp.growthPercent()).toBeGreaterThan(0);
    expect(comp.growthPercent()).toBeLessThanOrEqual(100);
  });

  it('reloads data when RIT changes', () => {
    const fixture = TestBed.createComponent(MapPrepComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    comp.selectedRIT.set(230);
    comp.onRITChange();

    expect(syllabusServiceMock.getSkillsByRIT).toHaveBeenCalledWith(230);
    expect(syllabusServiceMock.getMAPGrowthProjection).toHaveBeenCalledWith('student-demo', 230);
  });

  it('renders RIT band selector with expected options', () => {
    const fixture = TestBed.createComponent(MapPrepComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.ritBands.length).toBeGreaterThanOrEqual(10);
    expect(fixture.componentInstance.ritBands[0].value).toBe(180);
  });

  it('generates a MAP practice sheet from selected configuration', () => {
    const fixture = TestBed.createComponent(MapPrepComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp.generatePracticeSheet();

    expect(practiceServiceMock.generateMapPracticeSheet).toHaveBeenCalledWith(
      expect.objectContaining({ ritBand: 220, questionCount: 10 }),
    );
    expect(comp.generatedSheet()?.worksheetId).toBe('sheet-1');
  });

  it('falls back to local generated sheet when generator API fails', () => {
    practiceServiceMock.generateMapPracticeSheet.mockReturnValueOnce(throwError(() => new Error('generator failed')));
    const fixture = TestBed.createComponent(MapPrepComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp.generatePracticeSheet();

    expect(comp.generatedSheet()).toBeTruthy();
    expect(comp.sheetError()).toContain('Backend unavailable');
  });
});
