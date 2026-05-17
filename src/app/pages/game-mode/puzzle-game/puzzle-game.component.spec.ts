import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { PuzzleGameComponent } from './puzzle-game.component';
import { PuzzleEngineService } from '../../../services/puzzle-engine.service';
import { MasteryEngineService } from '../../../core/mastery/mastery-engine.service';

describe('PuzzleGameComponent', () => {
  const puzzleEngineMock = {
    generatePuzzles: vi.fn(() =>
      of({
        puzzleSessionId: 'session-1',
        puzzles: [
          {
            puzzleId: 'p-1',
            puzzleText: 'What number comes next: 2, 4, 6, ?',
            type: 'mcq',
            metadata: {
              inputType: 'mcq',
              skillId: 'sequence',
              options: ['7', '8', '9'],
              correctAnswer: '8',
            },
          },
        ],
      }),
    ),
    submitPuzzleAnswers: vi.fn(() =>
      of({
        saved: true,
        xpEarned: 20,
      }),
    ),
  };

  const masteryEngineMock = {
    fetchMasteryState: vi.fn(() =>
      of({
        studentId: 'student-demo',
        updatedAt: new Date().toISOString(),
        skills: [],
        weakSkills: [],
        recommendedNextSkill: null,
      }),
    ),
    updateMastery: vi.fn(() =>
      of({
        studentId: 'student-demo',
        updatedAt: new Date().toISOString(),
        skills: [],
        weakSkills: [],
        recommendedNextSkill: null,
      }),
    ),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [PuzzleGameComponent],
      providers: [
        { provide: PuzzleEngineService, useValue: puzzleEngineMock },
        { provide: MasteryEngineService, useValue: masteryEngineMock },
      ],
    }).compileComponents();
  });

  it('loads puzzles via generatePuzzles on init', () => {
    const fixture = TestBed.createComponent(PuzzleGameComponent);
    fixture.componentRef.setInput('studentId', 'student-demo');
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(puzzleEngineMock.generatePuzzles).toHaveBeenCalledWith('ai-puzzle', 50);
    expect(comp.currentPuzzles().length).toBe(1);
    expect(comp.puzzleSessionId()).toBe('session-1');
  });

  it('binds dynamic answers and enables submit flow', () => {
    const fixture = TestBed.createComponent(PuzzleGameComponent);
    fixture.componentRef.setInput('studentId', 'student-demo');
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.canSubmit()).toBe(false);

    comp.selectOption('p-1', '8');
    expect(comp.answerValue('p-1')).toBe('8');
    expect(comp.canSubmit()).toBe(true);
  });

  it('evaluates answers locally and submits aggregate ai-puzzle payload', () => {
    const fixture = TestBed.createComponent(PuzzleGameComponent);
    fixture.componentRef.setInput('studentId', 'student-demo');
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    comp.selectOption('p-1', '8');
    comp.handleSubmit();
    fixture.detectChanges();

    expect(puzzleEngineMock.submitPuzzleAnswers).toHaveBeenCalledWith({
      studentId: 'student-demo',
      mode: 'ai-puzzle',
      score: 100,
      accuracy: 100,
      streak: 1,
    });
    expect(comp.hasSubmitted()).toBe(true);
    expect(comp.score()).toBe(1);
    expect(comp.total()).toBe(1);
    expect(comp.resultFor('p-1')?.correct).toBe(true);
    expect(masteryEngineMock.updateMastery).toHaveBeenCalled();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Score: 1/1');
    expect(text).toContain('Correct');
  });

  it('shows load error message when submit fails', () => {
    puzzleEngineMock.submitPuzzleAnswers.mockReturnValueOnce(
      throwError(() => new Error('submit failed')),
    );

    const fixture = TestBed.createComponent(PuzzleGameComponent);
    fixture.componentRef.setInput('studentId', 'student-demo');
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    comp.selectOption('p-1', '8');
    comp.handleSubmit();

    expect(comp.loadError()).toBe('Unable to load puzzles. Please try again.');
    expect(comp.resultFor('p-1')?.correct).toBe(true);
  });

  it('loads a new puzzle set from retry action', () => {
    const fixture = TestBed.createComponent(PuzzleGameComponent);
    fixture.componentRef.setInput('studentId', 'student-demo');
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    comp.handleRetry();

    expect(puzzleEngineMock.generatePuzzles).toHaveBeenCalledTimes(2);
  });
});
