import { of } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { PracticeViewComponent } from './practice-view.component';
import { OperationsService } from '../../operations.service';

const session = {
  sessionId: 'session-1',
  operation: 'add',
  difficulty: 12,
  problems: [
    { problemId: 'p1', prompt: '2 + 1 = ?' },
    { problemId: 'p2', prompt: '4 + 3 = ?' },
  ],
};

const submission = {
  sessionId: 'session-1',
  totalProblems: 2,
  correctCount: 1,
  incorrectCount: 1,
  scorePercentage: 50,
  results: [
    { problemId: 'p1', studentAnswer: '3', correctAnswer: '3', isCorrect: true },
    { problemId: 'p2', studentAnswer: '1', correctAnswer: '7', isCorrect: false },
  ],
};

describe('PracticeViewComponent', () => {
  const operationsServiceMock = {
    getPractice: vi.fn(() => of(session)),
    submitPractice: vi.fn(() => of(submission)),
    syncMasteryState: vi.fn(() => of(null)),
    clearLatestResult: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [PracticeViewComponent],
      providers: [
        { provide: OperationsService, useValue: operationsServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ operation: 'add' }) },
          },
        },
      ],
    }).compileComponents();
  });

  it('loads practice problems dynamically', () => {
    const fixture = TestBed.createComponent(PracticeViewComponent);
    fixture.detectChanges();

    expect(operationsServiceMock.getPractice).toHaveBeenCalledWith('add', 10);
    expect(
      (fixture.nativeElement as HTMLElement).querySelectorAll('[data-testid="practice-answer-input"]').length,
    ).toBe(2);
  });

  it('disables submit until all answers are filled', () => {
    const fixture = TestBed.createComponent(PracticeViewComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    let submitButton = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="practice-submit"]',
    ) as HTMLButtonElement;
    expect(submitButton.disabled).toBe(true);

    component.updateAnswer('p1', '3');
    fixture.detectChanges();
    submitButton = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="practice-submit"]',
    ) as HTMLButtonElement;
    expect(submitButton.disabled).toBe(true);

    component.updateAnswer('p2', '7');
    fixture.detectChanges();
    submitButton = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="practice-submit"]',
    ) as HTMLButtonElement;
    expect(submitButton.disabled).toBe(false);
  });

  it('submits answers end-to-end and shows correct/incorrect marking', () => {
    const fixture = TestBed.createComponent(PracticeViewComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.updateAnswer('p1', '3');
    component.updateAnswer('p2', '1');
    component.submit();
    fixture.detectChanges();

    expect(operationsServiceMock.submitPractice).toHaveBeenCalledWith({
      sessionId: 'session-1',
      answers: [
        { problemId: 'p1', studentAnswer: '3' },
        { problemId: 'p2', studentAnswer: '1' },
      ],
    });
    expect(operationsServiceMock.syncMasteryState).toHaveBeenCalled();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Score Summary');
    expect(text).toContain('Correct answer: 7');
  });
});
