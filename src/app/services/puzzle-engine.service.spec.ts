import { of } from 'rxjs';
import { PuzzleEngineService } from './puzzle-engine.service';

describe('PuzzleEngineService', () => {
  it('calls GET challenge endpoint with ai-puzzle mode', () => {
    const httpMock = {
      get: vi.fn(() =>
        of({
          puzzleSessionId: 'session-1',
          puzzles: [
            {
              puzzleId: 'p-1',
              puzzleText: '2 + 2 = ?',
              type: 'mcq',
              metadata: { options: ['3', '4', '5'], correctAnswer: '4' },
            },
          ],
        }),
      ),
      post: vi.fn(),
    } as any;

    const service = new PuzzleEngineService(httpMock);
    service.generatePuzzles('ai-puzzle', 55).subscribe();

    expect(httpMock.get).toHaveBeenCalled();
    const [url, config] = httpMock.get.mock.calls[0] as [string, { params: { get: (key: string) => string | null } }];
    expect(url).toBe('https://mindsprint-5a5a0849665d.herokuapp.com/api/game/challenge');
    expect(config.params.get('mode')).toBe('ai-puzzle');
  });

  it('calls POST submit endpoint with aggregate ai-puzzle payload', () => {
    const httpMock = {
      get: vi.fn(),
      post: vi.fn(() =>
        of({
          saved: true,
          xpEarned: 25,
        }),
      ),
    } as any;

    const service = new PuzzleEngineService(httpMock);
    service
      .submitPuzzleAnswers({
        studentId: 'student-demo',
        mode: 'ai-puzzle',
        score: 85,
        accuracy: 80,
        streak: 1,
      })
      .subscribe();

    expect(httpMock.post).toHaveBeenCalledWith(
      'https://mindsprint-5a5a0849665d.herokuapp.com/api/game/submit',
      {
        studentId: 'student-demo',
        mode: 'ai-puzzle',
        score: 85,
        accuracy: 80,
        streak: 1,
      },
    );
  });

  it('maps fallback challenge payload to puzzle format', () => {
    const httpMock = { get: vi.fn(), post: vi.fn() } as any;
    const service = new PuzzleEngineService(httpMock);

    const mapped = service.mapPuzzleResponse({
      challengeId: 'challenge-1',
      prompt: 'Find the missing number',
      answer: '12',
      gamePayload: {
        type: 'logic',
        options: ['10', '11', '12'],
      },
    });

    expect(mapped.puzzleSessionId).toBe('challenge-1');
    expect(mapped.puzzles.length).toBe(1);
    expect(mapped.puzzles[0].puzzleText).toBe('Find the missing number');
    expect(mapped.puzzles[0].metadata?.correctAnswer).toBe('12');
  });
});
