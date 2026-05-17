import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PuzzleGameComponent } from './puzzle-game.component';
import { PuzzleEngineService } from '../../../services/puzzle-engine.service';
import { MasteryEngineService } from '../../../core/mastery/mastery-engine.service';

describe('PuzzleGameComponent', () => {
  const puzzleEngineMock = {
    generatePuzzles: vi.fn(() =>
      of({
        sessionId: 'session-1',
        difficulty: 60,
        puzzles: [
          {
            puzzleId: 'p-1',
            type: 'missing-number',
            prompt: '1, 2, __, 4',
            metadata: { inputType: 'numeric' },
          },
        ],
      }),
    ),
    submitPuzzleAnswers: vi.fn(() =>
      of({
        difficulty: 62,
        results: [{ puzzleId: 'p-1', correct: true, correctAnswer: '3', skillId: 'sequence' }],
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

  it('loads generated puzzles on init', () => {
    const fixture = TestBed.createComponent(PuzzleGameComponent);
    fixture.componentRef.setInput('studentId', 'student-demo');
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.currentPuzzles().length).toBe(1);
    expect(comp.sessionId()).toBe('session-1');
  });

  it('submits answers and stores results', () => {
    const fixture = TestBed.createComponent(PuzzleGameComponent);
    fixture.componentRef.setInput('studentId', 'student-demo');
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    comp.updateTextAnswer('p-1', 0, '3');
    comp.submitAnswers();

    expect(puzzleEngineMock.submitPuzzleAnswers).toHaveBeenCalled();
    expect(comp.hasSubmitted()).toBe(true);
    expect(comp.solvedCount()).toBe(1);
    expect(masteryEngineMock.updateMastery).toHaveBeenCalled();
  });
});
