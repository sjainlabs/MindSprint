import { of } from 'rxjs';
import { PuzzleEngineService } from './puzzle-engine.service';
import { environment } from '../../environments/environment';

describe('PuzzleEngineService', () => {
  it('calls POST puzzle generate endpoint', () => {
    const httpMock = {
      get: vi.fn(),
      post: vi.fn(() =>
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
    } as any;

    const service = new PuzzleEngineService(httpMock);
    service.generatePuzzles('ai-puzzle', 55).subscribe();

    expect(httpMock.post).toHaveBeenCalled();
    const [url, config] = httpMock.post.mock.calls[0] as [string, { skillId: string; count: number }];
    expect(url).toBe(`${environment.apiUrl}/puzzles/generate`);
    expect(config.skillId).toBe('ai-puzzle');
    expect(config.count).toBe(3);
  });

  it('calls POST submit endpoint with aggregate ai-puzzle payload', () => {
    const httpMock = {
      get: vi.fn(),
      post: vi.fn(() =>
        of({
          score: 2,
          total: 3,
          results: [],
        }),
      ),
    } as any;

    const service = new PuzzleEngineService(httpMock);
    service
      .submitPuzzleAnswers({
        studentId: 'student-demo',
          puzzleSessionId: 'session-1',
          answers: [{ puzzleId: 'p-1', answer: '4' }],
      })
      .subscribe();

    expect(httpMock.post).toHaveBeenCalledWith(
      `${environment.apiUrl}/puzzles/submit`,
      {
        studentId: 'student-demo',
        puzzleSessionId: 'session-1',
        answers: [{ puzzleId: 'p-1', answer: '4' }],
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
