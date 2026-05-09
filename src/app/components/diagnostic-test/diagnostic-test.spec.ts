import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { DiagnosticTestComponent } from './diagnostic-test';
import {
  type DiagnosticQuestion,
  DiagnosticService,
  type DiagnosticResult,
  type DiagnosticTest,
} from '../../services/diagnostic.service';

describe('DiagnosticTestComponent', () => {
  const questions: DiagnosticQuestion[] = Array.from({ length: 20 }, (_, index) => ({
    id: `q-${index + 1}`,
    operation: 'addition',
    prompt: `${index + 1} + ${index + 2} = ?`,
  }));

  const diagnosticTest: DiagnosticTest = {
    testId: 'diag-123',
    createdAt: '2026-05-09T00:00:00.000Z',
    questions,
  };

  const diagnosticResult: DiagnosticResult = {
    level: 'Intermediate',
    score: {
      totalQuestions: 20,
      attempted: 2,
      correct: 2,
      incorrect: 0,
      unanswered: 18,
      totalDurationSeconds: 100,
      averageSecondsPerQuestion: 5,
      accuracyScore: 10,
      speedScore: 83,
      finalScore: 25,
    },
    questionResults: [],
    weakAreas: ['subtraction', 'multiplication', 'division'],
    strongAreas: ['addition'],
  };

  const diagnosticService = {
    startDiagnostic: vi.fn(() => of(diagnosticTest)),
    submitDiagnostic: vi.fn(() => of(diagnosticResult)),
  };

  beforeEach(async () => {
    diagnosticService.startDiagnostic.mockClear();
    diagnosticService.submitDiagnostic.mockClear();

    await TestBed.configureTestingModule({
      imports: [DiagnosticTestComponent],
      providers: [
        provideRouter([]),
        { provide: DiagnosticService, useValue: diagnosticService },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows one question at a time and preserves answers while navigating', async () => {
    const fixture = TestBed.createComponent(DiagnosticTestComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const element = fixture.nativeElement as HTMLElement;

    expect(component.questions).toHaveLength(20);
    expect(element.textContent).toContain('Question 1 of 20');
    expect(element.textContent).toContain('1. 1 + 2 = ?');
    expect(element.textContent).not.toContain('2. 2 + 3 = ?');

    component.updateAnswer(12);
    component.nextQuestion();

    expect(component.currentQuestionIndex).toBe(1);
    expect(component.currentQuestion?.prompt).toBe('2 + 3 = ?');
    expect(component.answers[0]).toBe(12);

    component.updateAnswer(24);
    component.previousQuestion();

    expect(component.currentQuestionIndex).toBe(0);
    expect(component.currentQuestion?.prompt).toBe('1 + 2 = ?');
    expect(component.answers[1]).toBe(24);
    expect(component.answers[0]).toBe(12);
  });

  it('submits tracked answers with timestamps and navigates to the worksheet level', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-09T00:00:00.000Z'));

    const fixture = TestBed.createComponent(DiagnosticTestComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.updateAnswer(11);
    component.nextQuestion();
    component.currentQuestionIndex = component.questions.length - 1;
    component.updateAnswer(99);

    vi.setSystemTime(new Date('2026-05-09T00:01:40.000Z'));

    component.submitTest();

    expect(diagnosticService.submitDiagnostic).toHaveBeenCalledWith({
      testId: 'diag-123',
      startedAt: '2026-05-09T00:00:00.000Z',
      completedAt: '2026-05-09T00:01:40.000Z',
      responses: [
        { questionId: 'q-1', answer: 11, secondsSpent: 5 },
        { questionId: 'q-20', answer: 99, secondsSpent: 5 },
      ],
    });
    expect(navigateSpy).toHaveBeenCalledWith(['/worksheet'], {
      queryParams: { level: 'Intermediate' },
    });
  });
});
