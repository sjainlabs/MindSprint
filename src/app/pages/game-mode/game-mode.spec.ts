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

const mockFlashPayload = { flashSequence: [3, 7, 2], speedMs: 200 };
const mockAbacusAnswer = mockFlashPayload.flashSequence.reduce((sum, value) => sum + value, 0);

const mockChallenge = {
  challengeId: 'c-1',
  studentId: 'student-demo',
  timeLimitSeconds: 30,
  difficulty: 65,
  recommendedLevel: 'Intermediate' as const,
  rewards: { xp: 10, streakBonus: 5, badge: '⚡ Fluency Champion' },
  dailyQuest: { id: 'q-1', description: 'Complete 3 challenges', target: 3, progress: 1, rewardXp: 50, completed: false },
  bossBattle: { id: 'b-1', title: 'Math Dragon', hp: 100, phase: 1, unlocked: false },
  playerState: { xp: 300, streak: 3, badges: [], level: 4 },
  mode: 'abacus-flash' as const,
  gamePayload: mockFlashPayload,
};

const mockMapChallenge = {
  challengeId: 'map-1',
  studentId: 'student-demo',
  gradeLevel: 3,
  domain: 'Data & Graphs',
  difficulty: 62,
  prompt: 'Use the graph and table to answer each step.',
  steps: [
    {
      id: 's1',
      prompt: 'How many apples are shown?',
      options: [2, 3, 4, 5],
      answerType: 'single' as const,
      correctAnswers: [4],
    },
    {
      id: 's2',
      prompt: 'Select all true statements.',
      options: ['A', 'B', 'C', 'D'],
      answerType: 'multi' as const,
      correctAnswers: ['A', 'C'],
    },
  ],
  options: ['A', 'B', 'C', 'D'],
  answerType: 'multi' as const,
  correctAnswers: ['A', 'C'],
  graphPayload: {
    type: 'bar' as const,
    labels: ['Mon', 'Tue'],
    values: [3, 4],
  },
  tablePayload: {
    headers: ['Day', 'Value'],
    rows: [['Mon', 3], ['Tue', 4]],
  },
  hints: ['Look at each bar carefully.'],
  explanation: 'A and C are true based on the data.',
  rewards: { xp: 12, streakBonus: 3, badge: '📊 MAP Achiever' },
  mode: 'map' as const,
};

const mockAiPuzzleChallenge = {
  challengeId: 'ai-1',
  studentId: 'student-demo',
  timeLimitSeconds: 45,
  difficulty: 68,
  recommendedLevel: 'Intermediate' as const,
  rewards: { xp: 15, streakBonus: 4, badge: '🤖 Puzzle Solver' },
  dailyQuest: { id: 'q-2', description: 'Complete 3 challenges', target: 3, progress: 1, rewardXp: 50, completed: false },
  bossBattle: { id: 'b-1', title: 'Math Dragon', hp: 100, phase: 1, unlocked: false },
  playerState: { xp: 300, streak: 3, badges: [], level: 4 },
  mode: 'ai-puzzle' as const,
  prompt: 'Which number comes next: 2, 4, 8, 16, ?',
  operation: 'addition' as const,
  options: ['24', '32', '30', '18'],
  answer: '32',
  gamePayload: {
    puzzleId: 'p-321',
    prompt: 'Which number comes next: 2, 4, 8, 16, ?',
    options: ['24', '32', '30', '18'],
    answer: '32',
    difficulty: 68,
  },
};

const mockReasoningPuzzleChallenge = {
  ...mockAiPuzzleChallenge,
  challengeId: 'rp-1',
  gamePayload: {
    puzzleId: 'rp-001',
    prompt: 'Find the missing letter: A, C, F, J, ?',
    options: ['K', 'M', 'O', 'P'],
    answer: 'O',
    difficulty: 72,
  },
};

const mockAbacusFlashSubmitResponse = {
  correct: true,
  xpEarned: 15,
  newDifficulty: 70,
  newStreak: 4,
  dailyQuestProgress: 2,
};

describe('GameModeComponent', () => {
  const gameServiceMock = {
    getChallenge: vi.fn((payload?: { mode?: string }) =>
      of(payload?.mode === 'map' ? mockMapChallenge : mockChallenge),
    ),
    submitChallenge: vi.fn(() => of({ saved: true, xpEarned: 15 })),
    getAbacusFlashChallenge: vi.fn(() => of(mockChallenge)),
    submitAbacusFlash: vi.fn(() => of(mockAbacusFlashSubmitResponse)),
  };

  const studentIntelligenceServiceMock = {
    getStudentProfile: vi.fn(() => of(mockProfile)),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [GameModeComponent],
      providers: [
        provideRouter([]),
        { provide: GameService, useValue: gameServiceMock },
        { provide: StudentIntelligenceService, useValue: studentIntelligenceServiceMock },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('loads adaptive difficulty and challenge on init', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();

    expect(studentIntelligenceServiceMock.getStudentProfile).toHaveBeenCalled();
    expect(gameServiceMock.getAbacusFlashChallenge).toHaveBeenCalled();
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
    expect(superValues).toContain('fluency');
    expect(superValues).toContain('reasoning-puzzle');
    expect(superValues).toContain('map');
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
    for (const mode of ['fluency', 'reasoning-puzzle', 'map', 'competition-boss'] as const) {
      comp.selectedMode.set(mode);
      expect(comp.isSuperMode()).toBe(true);
    }
  });

  it('superModeInfo returns tip text for super modes', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    const comp = fixture.componentInstance;

    comp.selectedMode.set('fluency');
    expect(comp.superModeInfo()).toBeTruthy();
    expect(comp.superModeInfo()!.tip).toBeTruthy();
  });

  it('awards super-mode badge on correct submission', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    comp.selectedMode.set('fluency');
    comp.selectedAnswer.set(mockAbacusAnswer);
    comp.submitChallenge();

    expect(comp.unlockedBadges()).toContain('⚡ Fluency Champion');
  });

  it('does not award badge on incorrect submission', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    comp.selectedMode.set('fluency');
    comp.selectedAnswer.set(999); // wrong
    comp.submitChallenge();

    expect(comp.unlockedBadges()).not.toContain('⚡ Fluency Champion');
  });

  it('maps super game modes to backend-compatible API modes', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;

    // Trigger a challenge load for fluency mode
    comp.selectedMode.set('fluency');
    comp.loadChallenge();

    expect(gameServiceMock.getChallenge).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'ai-puzzle' }),
    );
  });

  it('loads MAP challenge payload when map mode is selected', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp.selectedMode.set('map');
    comp.loadChallenge();

    expect(gameServiceMock.getChallenge).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'map' }),
    );
    expect(comp.isMapActive()).toBe(true);
    expect(comp.totalMapSteps()).toBe(2);
  });

  it('advances MAP step on single-select answer', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp.selectedMode.set('map');
    comp.loadChallenge();
    expect(comp.currentStepIndex()).toBe(0);

    comp.toggleMapOption(4);
    vi.advanceTimersByTime(250);

    expect(comp.currentStepIndex()).toBe(1);
  });

  it('handles MAP multi-select answers and computes partial credit', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp.selectedMode.set('map');
    comp.loadChallenge();
    comp.toggleMapOption(4);
    vi.advanceTimersByTime(250);

    comp.toggleMapOption('A');
    comp.toggleMapOption('B'); // one correct, one incorrect
    comp.submitChallenge();

    // Credit formula: (matched - 0.5 * extras) / correctCount = (1 - 0.5) / 2 = 0.25
    expect(comp.mapPartialCreditPercent()).toBe(25);
    expect(comp.isCorrect()).toBe(false);
  });

  it('exposes MAP graph and table render flags', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp.selectedMode.set('map');
    comp.loadChallenge();

    expect(comp.mapShowGraph()).toBe(true);
    expect(comp.mapShowTable()).toBe(true);
  });

  it('supports MAP hint toggle and explanation after submit', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp.selectedMode.set('map');
    comp.loadChallenge();
    comp.mapHintsOpen.set(true);
    comp.toggleMapOption(4);
    vi.advanceTimersByTime(250);
    comp.toggleMapOption('A');
    comp.toggleMapOption('C');
    comp.submitChallenge();

    expect(comp.mapHintsOpen()).toBe(true);
    expect(comp.challengeSubmitted()).toBe(true);
    expect(comp.isCorrect()).toBe(true);
  });

  it('computes MAP grade and difficulty labels', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp.selectedMode.set('map');
    comp.loadChallenge();

    expect(comp.mapGradeLabel()).toBe('Grade 3');
    expect(comp.mapDifficultyLabel()).toContain('Ready');
    expect(comp.mapDomainBadge()).toContain('📊');
  });

  it('initializes MAP state model with tiles, nodes, and regions', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp.selectedMode.set('map');
    comp.loadChallenge();

    expect(comp.mapState()).toBeTruthy();
    expect(comp.mapState()!.tiles.length).toBeGreaterThan(0);
    expect(comp.mapState()!.nodes.length).toBe(2);
    expect(comp.mapState()!.regions.length).toBeGreaterThan(0);
  });

  it('stores and restores MAP state from localStorage', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp.selectedMode.set('map');
    comp.loadChallenge();
    comp.toggleMapOption(4);
    vi.advanceTimersByTime(250);
    comp.toggleMapOption('A');
    comp.submitChallenge();

    const savedState = comp.mapState();
    expect(savedState).toBeTruthy();

    comp.loadChallenge();
    expect(comp.mapState()?.stepCredits[1]).toBe(savedState?.stepCredits[1]);
  });

  it('prevents selecting locked MAP nodes and reports validation errors', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp.selectedMode.set('map');
    comp.loadChallenge();
    comp.selectMapNode(10);

    expect(comp.mapLastValidationError()).toContain('Illegal move');
  });

  it('applies MAP penalties on failed deterministic submissions', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp.selectedMode.set('map');
    comp.loadChallenge();
    comp.toggleMapOption(2);
    comp.submitChallenge();

    expect(comp.mapPenaltyTotal()).toBeGreaterThan(0);
    expect(comp.mapScore()).toBeLessThanOrEqual(0);
  });

  it('shows error message when challenge fails to load', () => {
    gameServiceMock.getAbacusFlashChallenge.mockReturnValueOnce(throwError(() => new Error('error')));
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.errorMessage()).toBe('Unable to load game challenge.');
  });

  it('shows MAP error state when map challenge fails to load', () => {
    gameServiceMock.getChallenge.mockReturnValueOnce(throwError(() => new Error('error')));
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp.selectedMode.set('map');
    comp.loadChallenge();

    expect(comp.errorMessage()).toBe('Unable to load game challenge.');
  });

  it('increments XP on correct answer', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    const initialLocalXp = comp.localXp();

    comp.selectedAnswer.set(mockAbacusAnswer);
    comp.submitChallenge();

    expect(comp.localXp()).toBeGreaterThan(initialLocalXp);
  });

  // ── Abacus Flash specific tests ────────────────────────────────────────────

  it('uses getAbacusFlashChallenge for abacus-flash mode', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();

    expect(gameServiceMock.getAbacusFlashChallenge).toHaveBeenCalled();
    expect(gameServiceMock.getChallenge).not.toHaveBeenCalled();
  });

  it('does not treat fluency as abacus-flash active mode', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    comp.selectedMode.set('fluency');
    comp.loadChallenge();

    expect(comp.isAbacusFlashActive()).toBe(false);
    expect(comp.isFlashing()).toBe(false);
  });

  it('does not render abacus answer input for fluency mode', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    comp.selectedMode.set('fluency');
    comp.loadChallenge();
    fixture.detectChanges();

    const input: HTMLInputElement | null = fixture.nativeElement.querySelector('#abacus-answer');
    expect(input).toBeFalsy();
  });

  it('starts with showQuestion=false and isFlashing=true for abacus-flash', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.showQuestion()).toBe(false);
    expect(comp.isFlashing()).toBe(true);
  });

  it('showQuestion becomes true after flash sequence completes', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    // Advance timers past the full sequence: 3 numbers × 200 ms each
    vi.advanceTimersByTime(mockFlashPayload.speedMs * mockFlashPayload.flashSequence.length + 50);

    expect(comp.isFlashing()).toBe(false);
    expect(comp.showQuestion()).toBe(true);
    expect(comp.currentFlashNumber()).toBeNull();
  });

  it('flash sequence shows first number immediately', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    // First number is set synchronously at the start of startFlashSequence
    expect(comp.currentFlashNumber()).toBe(mockFlashPayload.flashSequence[0]);
  });

  it('flash sequence cycles through all numbers', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    const seen: (number | null)[] = [comp.currentFlashNumber()];

    for (let i = 0; i < mockFlashPayload.flashSequence.length; i++) {
      vi.advanceTimersByTime(mockFlashPayload.speedMs);
      seen.push(comp.currentFlashNumber());
    }

    // All numbers in the sequence should have been shown
    for (const n of mockFlashPayload.flashSequence) {
      expect(seen).toContain(n);
    }
  });

  it('startFlashSequence loads flashSequence from backend payload', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    expect(comp.flashSequence()).toEqual(mockFlashPayload.flashSequence);
    expect(comp.currentFlashNumber()).toBe(mockFlashPayload.flashSequence[0]);
  });

  it('runFlash advances currentFlashNumber on each timeout and reveals question only at end', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    expect(comp.currentFlashNumber()).toBe(mockFlashPayload.flashSequence[0]);
    expect(comp.showQuestion()).toBe(false);
    expect(comp.isFlashing()).toBe(true);

    vi.advanceTimersByTime(mockFlashPayload.speedMs);
    expect(comp.currentFlashNumber()).toBe(mockFlashPayload.flashSequence[1]);
    expect(comp.showQuestion()).toBe(false);
    expect(comp.isFlashing()).toBe(true);

    vi.advanceTimersByTime(mockFlashPayload.speedMs);
    expect(comp.currentFlashNumber()).toBe(mockFlashPayload.flashSequence[2]);
    expect(comp.showQuestion()).toBe(false);
    expect(comp.isFlashing()).toBe(true);

    vi.advanceTimersByTime(mockFlashPayload.speedMs);
    expect(comp.currentFlashNumber()).toBeNull();
    expect(comp.isFlashing()).toBe(false);
    expect(comp.showQuestion()).toBe(true);
  });

  it('submits via submitAbacusFlash for abacus-flash mode', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    // Skip flash
    vi.advanceTimersByTime(mockFlashPayload.speedMs * mockFlashPayload.flashSequence.length + 50);

    comp.selectedAnswer.set(mockAbacusAnswer);
    comp.submitChallenge();

    expect(gameServiceMock.submitAbacusFlash).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'abacus-flash',
        score: 100,
        accuracy: 100,
      }),
    );
  });

  it('updates adaptive difficulty from submitAbacusFlash response', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    vi.advanceTimersByTime(mockFlashPayload.speedMs * mockFlashPayload.flashSequence.length + 50);
    comp.selectedAnswer.set(mockAbacusAnswer);
    comp.submitChallenge();

    expect(comp.adaptiveDifficulty()).toBe(mockAbacusFlashSubmitResponse.newDifficulty);
  });

  it('updates streak from submitAbacusFlash response', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    vi.advanceTimersByTime(mockFlashPayload.speedMs * mockFlashPayload.flashSequence.length + 50);
    comp.selectedAnswer.set(mockAbacusAnswer);
    comp.submitChallenge();

    expect(comp.localStreak()).toBe(mockAbacusFlashSubmitResponse.newStreak);
  });

  it('auto-advances to next challenge after 1.5 s following abacus-flash submission', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    vi.advanceTimersByTime(mockFlashPayload.speedMs * mockFlashPayload.flashSequence.length + 50);

    const callsBefore = gameServiceMock.getAbacusFlashChallenge.mock.calls.length;
    comp.selectedAnswer.set(mockAbacusAnswer);
    comp.submitChallenge();

    // Before 1.5 s timeout fires, no new challenge loaded
    vi.advanceTimersByTime(1400);
    expect(gameServiceMock.getAbacusFlashChallenge.mock.calls.length).toBe(callsBefore);

    // After 1.5 s, a new challenge is requested
    vi.advanceTimersByTime(200);
    expect(gameServiceMock.getAbacusFlashChallenge.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('resets flash state when loading new challenge', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    // Let sequence complete
    vi.advanceTimersByTime(mockFlashPayload.speedMs * mockFlashPayload.flashSequence.length + 50);
    expect(comp.showQuestion()).toBe(true);

    // Load new challenge resets state
    comp.loadChallenge();
    expect(comp.showQuestion()).toBe(false);
    expect(comp.isFlashing()).toBe(true);
  });

  it('shows question immediately if flashSequence is empty', () => {
    gameServiceMock.getAbacusFlashChallenge.mockReturnValueOnce(
      of({ ...mockChallenge, gamePayload: { flashSequence: [], speedMs: 200 } }),
    );
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.isFlashing()).toBe(false);
    expect(comp.showQuestion()).toBe(true);
  });

  it('falls back to default speed when canonical speedMs is missing', () => {
    gameServiceMock.getAbacusFlashChallenge.mockReturnValueOnce(
      of({
        ...mockChallenge,
        gamePayload: { flashSequence: [1, 2, 3] },
      } as any),
    );
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    expect(comp.currentFlashNumber()).toBe(1);
    vi.advanceTimersByTime(600);
    expect(comp.currentFlashNumber()).toBe(2);
    vi.advanceTimersByTime(600);
    expect(comp.currentFlashNumber()).toBe(3);
    vi.advanceTimersByTime(600);
    expect(comp.showQuestion()).toBe(true);
  });

  it('does not expose arithmetic options for falling mode payload-only challenges', () => {
    gameServiceMock.getChallenge.mockReturnValueOnce(
      of({
        challengeId: 'falling-1',
        studentId: 'student-demo',
        mode: 'falling-numbers' as const,
        timeLimitSeconds: 25,
        difficulty: 60,
        rewards: { xp: 10, streakBonus: 2 },
        dailyQuest: { id: 'q-1', description: 'Complete 3 challenges', target: 3, progress: 1, rewardXp: 50, completed: false },
        bossBattle: { id: 'b-1', title: 'Math Dragon', hp: 100, phase: 1, unlocked: false },
        playerState: { xp: 300, streak: 3, badges: [], level: 4 },
        gamePayload: { target: 12, stream: [4, 7, 9], combosEnabled: true, powerUps: ['magnet'] },
      } as any),
    );
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp.selectedMode.set('falling-numbers');
    comp.loadChallenge();

    expect(comp.hasAnswerOptions(comp.challenge())).toBe(false);
  });

  it('does not submit when no answer selected', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    vi.advanceTimersByTime(mockFlashPayload.speedMs * mockFlashPayload.flashSequence.length + 50);

    comp.submitChallenge(); // no answer selected
    expect(gameServiceMock.submitAbacusFlash).not.toHaveBeenCalled();
  });

  it('does not re-submit after challenge is already submitted', () => {
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    vi.advanceTimersByTime(mockFlashPayload.speedMs * mockFlashPayload.flashSequence.length + 50);
    comp.selectedAnswer.set(mockAbacusAnswer);
    comp.submitChallenge();
    comp.submitChallenge(); // second call should be ignored

    expect(gameServiceMock.submitAbacusFlash.mock.calls.length).toBe(1);
  });

  it('configures and starts AI puzzle engine when ai-puzzle mode is loaded', () => {
    gameServiceMock.getChallenge.mockReturnValueOnce(of(mockAiPuzzleChallenge as any));
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp.selectedMode.set('ai-puzzle');
    comp.loadChallenge();

    expect(comp.aiPuzzleEngine.prompt()).toContain('Which number comes next');
    expect(comp.aiPuzzleEngine.options()).toEqual(['24', '32', '30', '18']);
    expect(comp.aiPuzzleEngine.isRunning()).toBe(true);
  });

  it('submits AI puzzle answers and updates challenge submission state', () => {
    gameServiceMock.getChallenge.mockReturnValueOnce(of(mockAiPuzzleChallenge as any));
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp.selectedMode.set('ai-puzzle');
    comp.loadChallenge();
    comp.onAiPuzzleSubmit('32');

    expect(comp.challengeSubmitted()).toBe(true);
    expect(comp.aiPuzzleEngine.isCorrect()).toBe(true);
    expect(gameServiceMock.submitChallenge).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'ai-puzzle' }),
    );
  });

  it('configures and starts reasoning puzzle engine when reasoning-puzzle mode is loaded', () => {
    gameServiceMock.getChallenge.mockReturnValueOnce(of(mockReasoningPuzzleChallenge as any));
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp.selectedMode.set('reasoning-puzzle');
    comp.loadChallenge();

    expect(comp.reasoningPuzzleEngine.prompt()).toContain('Find the missing letter');
    expect(comp.reasoningPuzzleEngine.options()).toEqual(['K', 'M', 'O', 'P']);
    expect(comp.reasoningPuzzleEngine.isRunning()).toBe(true);
  });

  it('submits reasoning puzzle answers only when solved correctly', () => {
    gameServiceMock.getChallenge.mockReturnValueOnce(of(mockReasoningPuzzleChallenge as any));
    const fixture = TestBed.createComponent(GameModeComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp.selectedMode.set('reasoning-puzzle');
    comp.loadChallenge();
    comp.onReasoningPuzzleSubmit('K');

    expect(comp.challengeSubmitted()).toBe(false);
    expect(comp.reasoningPuzzleEngine.isCompleted()).toBe(false);

    comp.onReasoningPuzzleSubmit('O');

    expect(comp.challengeSubmitted()).toBe(true);
    expect(comp.reasoningPuzzleEngine.isCorrect()).toBe(true);
    expect(gameServiceMock.submitChallenge).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'ai-puzzle' }),
    );
  });
});
