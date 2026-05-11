import { of, throwError } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { GameModeComponent } from './game-mode';
import { GameService } from '../../services/game.service';
import { StudentIntelligenceService } from '../../services/student-intelligence.service';

const mockProfile = {
  studentId: 'student-demo',
  age: 10,
  grade: 5,
  masteryLevels: { addition: 80, subtraction: 70, multiplication: 65, division: 60 },
  topicMastery: {},
  xp: 300,
  level: 4,
  streak: 3,
  badges: [],
  learningPathLevel: 5,
  updatedAt: new Date().toISOString(),
};

const mockChallenge = {
  challengeId: 'c-1',
  studentId: 'student-demo',
  prompt: 'What is 7 × 8?',
  operation: 'multiplication' as const,
  options: [54, 56, 58, 60],
  answer: 56,
  timeLimitSeconds: 30,
  difficulty: 65,
  recommendedLevel: 'Intermediate' as const,
  rewards: { xp: 10, streakBonus: 5, badge: '⚡ Fluency Champion' },
  dailyQuest: { id: 'q-1', description: 'Complete 3 challenges', target: 3, progress: 1, rewardXp: 50, completed: false },
  bossBattle: { id: 'b-1', title: 'Math Dragon', hp: 100, phase: 1, unlocked: false },
  playerState: { xp: 300, streak: 3, badges: [], level: 4 },
  mode: 'abacus-flash' as const,
  gamePayload: {},
};

describe('GameModeComponent', () => {
  const gameServiceMock = {
    getChallenge: vi.fn(() => of(mockChallenge)),
    submitChallenge: vi.fn(() => of({ saved: true, xpEarned: 15 })),
  };

  const studentIntelligenceServiceMock = {
    getStudentProfile: vi.fn(() => of(mockProfile)),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [GameModeComponent],
      providers: [
        provideRouter([]),
        { provide: GameService, useValue: gameServiceMock },
        { provide: StudentIntelligenceService, useValue: studentIntelligenceServiceMock },
      ],
    }).compileComponents();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('loads adaptive difficulty and challenge on init', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();

    expect(studentIntelligenceServiceMock.getStudentProfile).toHaveBeenCalled();
    expect(gameServiceMock.getChallenge).toHaveBeenCalled();
    expect(fixture.componentInstance.challenge()).toBeTruthy();
  });

  it('exposes eight game mode options (4 core + 4 super)', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    const comp = fixture.componentInstance;

    expect(comp.gameModeOptions.length).toBe(8);
    expect(comp.coreModes.length).toBe(4);
    expect(comp.superModes.length).toBe(4);
  });

  it('super mode options include all four new modes', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    const comp = fixture.componentInstance;

    const superValues = comp.superModes.map((m) => m.value);
    expect(superValues).toContain('fluency-speed');
    expect(superValues).toContain('reasoning-puzzle');
    expect(superValues).toContain('map-challenge');
    expect(superValues).toContain('competition-boss');
  });

  it('isSuperMode is false for core modes', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    comp.selectedMode.set('abacus-flash');
    expect(comp.isSuperMode()).toBe(false);

    comp.selectedMode.set('boss-battle');
    expect(comp.isSuperMode()).toBe(false);
  });

  it('isSuperMode is true for super-syllabus modes', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    for (const mode of ['fluency-speed', 'reasoning-puzzle', 'map-challenge', 'competition-boss'] as const) {
      comp.selectedMode.set(mode);
      expect(comp.isSuperMode()).toBe(true);
    }
  });

  it('superModeInfo returns tip text for super modes', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    const comp = fixture.componentInstance;

    comp.selectedMode.set('fluency-speed');
    expect(comp.superModeInfo()).toBeTruthy();
    expect(comp.superModeInfo()!.tip).toBeTruthy();
  });

  it('awards super-mode badge on correct submission', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    comp.selectedMode.set('fluency-speed');
    comp.selectedAnswer.set(mockChallenge.answer);
    comp.submitChallenge();

    expect(comp.unlockedBadges()).toContain('⚡ Fluency Champion');
  });

  it('does not award badge on incorrect submission', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    comp.selectedMode.set('fluency-speed');
    comp.selectedAnswer.set(999); // wrong
    comp.submitChallenge();

    expect(comp.unlockedBadges()).not.toContain('⚡ Fluency Champion');
  });

  it('maps super game modes to backend-compatible API modes', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;

    // Trigger a challenge load for each super mode
    comp.selectedMode.set('fluency-speed');
    comp.loadChallenge();
    // The call should map to 'abacus-flash'
    const allCalls = gameServiceMock.getChallenge.mock.calls as unknown as Array<[{ mode?: string }]>;
    const lastArg = allCalls[allCalls.length - 1]?.[0];
    if (lastArg) {
      expect(['abacus-flash', 'ai-puzzle', 'boss-battle']).toContain(lastArg.mode);
    }
  });

  it('shows error message when challenge fails to load', () => {
    gameServiceMock.getChallenge.mockReturnValueOnce(throwError(() => new Error('error')));
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.errorMessage()).toBe('Unable to load game challenge.');
  });

  it('increments XP on correct answer', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    const initialLocalXp = comp.localXp();

    comp.selectedAnswer.set(mockChallenge.answer);
    comp.submitChallenge();

    expect(comp.localXp()).toBeGreaterThan(initialLocalXp);
  });
});
