import { of, throwError } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { StudentProfileComponent } from './student-profile';
import { StudentIntelligenceService } from '../../services/student-intelligence.service';

const mockProfile = {
  studentId: 'student-demo',
  age: 12,
  grade: 6,
  masteryLevels: { addition: 90, subtraction: 85, multiplication: 75, division: 70 },
  topicMastery: {},
  xp: 1200,
  level: 8,
  streak: 5,
  badges: ['Math Star', 'Speed Demon'],
  goals: ['Master fractions', 'Reach AMC-8 level'],
  learningPathLevel: 7,
  updatedAt: new Date().toISOString(),
};

describe('StudentProfileComponent', () => {
  const studentIntelligenceServiceMock = {
    getStudentProfile: vi.fn(() => of(mockProfile)),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [StudentProfileComponent],
      providers: [
        provideRouter([]),
        { provide: StudentIntelligenceService, useValue: studentIntelligenceServiceMock },
      ],
    }).compileComponents();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(StudentProfileComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('loads student profile on init', () => {
    const fixture = TestBed.createComponent(StudentProfileComponent);
    fixture.detectChanges();

    expect(studentIntelligenceServiceMock.getStudentProfile).toHaveBeenCalledWith('student-demo');
    expect(fixture.componentInstance.profile()).toBeTruthy();
  });

  it('shows error message when profile fails to load', () => {
    studentIntelligenceServiceMock.getStudentProfile.mockReturnValueOnce(
      throwError(() => new Error('Network error')),
    );
    const fixture = TestBed.createComponent(StudentProfileComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.errorMessage()).toBe('Unable to load student profile.');
    expect(fixture.componentInstance.scores()).toBeNull();
  });

  it('derives fluency score from addition and subtraction mastery', () => {
    const fixture = TestBed.createComponent(StudentProfileComponent);
    fixture.detectChanges();

    const scores = fixture.componentInstance.scores()!;
    // fluency = (addition + subtraction) / 2 = (90 + 85) / 2 = 87.5 → rounds to 88
    expect(scores.fluencyScore).toBe(88);
  });

  it('derives conceptual mastery score from multiplication and division', () => {
    const fixture = TestBed.createComponent(StudentProfileComponent);
    fixture.detectChanges();

    const scores = fixture.componentInstance.scores()!;
    // conceptual = (multiplication + division) / 2 = (75 + 70) / 2 = 72.5 → rounds to 73
    expect(scores.conceptualMasteryScore).toBe(73);
  });

  it('derives a reasoning score', () => {
    const fixture = TestBed.createComponent(StudentProfileComponent);
    fixture.detectChanges();

    const scores = fixture.componentInstance.scores()!;
    expect(scores.reasoningScore).toBeGreaterThan(0);
    expect(scores.reasoningScore).toBeLessThanOrEqual(100);
  });

  it('derives MAP RIT estimate within expected range', () => {
    const fixture = TestBed.createComponent(StudentProfileComponent);
    fixture.detectChanges();

    const scores = fixture.componentInstance.scores()!;
    // mapRIT = 180 + avg(90,85,75,70)*0.9 = 180 + 80*0.9 = 252
    expect(scores.mapRITEstimate).toBeGreaterThanOrEqual(180);
    expect(scores.mapRITEstimate).toBeLessThanOrEqual(280);
  });

  it('assigns competition level based on mastery average', () => {
    const fixture = TestBed.createComponent(StudentProfileComponent);
    fixture.detectChanges();

    const scores = fixture.componentInstance.scores()!;
    // avg = 80, which should map to MATHCOUNTS (>= 80)
    expect(['AMC-8', 'AMC-10', 'MATHCOUNTS', 'AIME']).toContain(scores.competitionLevel);
  });

  it('assigns AIME for very high mastery', async () => {
    studentIntelligenceServiceMock.getStudentProfile.mockReturnValueOnce(
      of({
        ...mockProfile,
        masteryLevels: { addition: 95, subtraction: 95, multiplication: 92, division: 90 },
      }),
    );
    const fixture = TestBed.createComponent(StudentProfileComponent);
    fixture.detectChanges();

    // avg = 93 → AIME
    expect(fixture.componentInstance.scores()!.competitionLevel).toBe('AIME');
  });

  it('assigns None for low mastery', async () => {
    studentIntelligenceServiceMock.getStudentProfile.mockReturnValueOnce(
      of({
        ...mockProfile,
        masteryLevels: { addition: 30, subtraction: 25, multiplication: 20, division: 15 },
      }),
    );
    const fixture = TestBed.createComponent(StudentProfileComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.scores()!.competitionLevel).toBe('None');
  });

  it('scoreColor returns correct class for different values', () => {
    const fixture = TestBed.createComponent(StudentProfileComponent);
    const comp = fixture.componentInstance;

    expect(comp.scoreColor(85)).toBe('text-emerald-600');
    expect(comp.scoreColor(60)).toBe('text-amber-600');
    expect(comp.scoreColor(30)).toBe('text-red-500');
  });

  it('barColor returns correct class for different values', () => {
    const fixture = TestBed.createComponent(StudentProfileComponent);
    const comp = fixture.componentInstance;

    expect(comp.barColor(85)).toBe('bg-emerald-500');
    expect(comp.barColor(60)).toBe('bg-amber-500');
    expect(comp.barColor(30)).toBe('bg-red-400');
  });

  it('reloads profile when loadProfile is called', () => {
    const fixture = TestBed.createComponent(StudentProfileComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    comp.studentId.set('another-student');
    comp.loadProfile();

    expect(studentIntelligenceServiceMock.getStudentProfile).toHaveBeenCalledWith('another-student');
  });
});
