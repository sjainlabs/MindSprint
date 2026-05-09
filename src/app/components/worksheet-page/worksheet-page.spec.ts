import { of } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { WorksheetPageComponent } from './worksheet-page';
import { PracticeService, type Worksheet, type WorksheetResult } from '../../services/practice.service';
import { StudentIntelligenceService } from '../../services/student-intelligence.service';

const worksheet: Worksheet = {
  worksheetId: 'ws-1',
  level: 'Intermediate',
  title: 'Practice Worksheet',
  instructions: 'Solve all questions.',
  generatedAt: new Date().toISOString(),
  questions: Array.from({ length: 10 }, (_, index) => ({
    id: `q-${index + 1}`,
    operation: 'addition',
    prompt: `${index + 1} + 1 = ?`,
    answer: index + 2,
  })),
};

const worksheetResult: WorksheetResult = {
  worksheetId: 'ws-1',
  studentId: 'student-demo',
  level: 'Intermediate',
  totalQuestions: 10,
  attempted: 10,
  correct: 9,
  incorrect: 1,
  accuracy: 90,
  totalDurationSeconds: 75,
  questionResults: worksheet.questions.map((question, index) => ({
    questionId: question.id,
    operation: question.operation,
    expectedAnswer: question.answer,
    submittedAnswer: question.answer,
    isCorrect: index !== 9,
  })),
};

describe('WorksheetPageComponent', () => {
  const practiceServiceMock = {
    getPractice: vi.fn(() => of(worksheet)),
    submitWorksheet: vi.fn(() => of(worksheetResult)),
  };

  const studentIntelligenceServiceMock = {
    getStudentProfile: vi.fn(() =>
      of({
        studentId: 'student-demo',
        masteryLevels: {
          addition: 80,
          subtraction: 70,
          multiplication: 65,
          division: 60,
        },
        xp: 250,
        level: 3,
        streak: 2,
        badges: ['Accuracy 90%+'],
        learningPathLevel: 4,
        updatedAt: new Date().toISOString(),
      }),
    ),
    getStudentAnalytics: vi.fn(() =>
      of({
        studentId: 'student-demo',
        accuracyOverTime: [],
        operationMastery: [],
        averageTimePerWorksheet: 60,
        totalWorksheets: 1,
        recommendedNextSteps: ['Focus on division practice.'],
      }),
    ),
    getAdaptiveRecommendation: vi.fn(() =>
      of({
        studentId: 'student-demo',
        targetDifficulty: 78,
        recommendedLevel: 'Advanced',
        focusOperations: ['division', 'multiplication'],
        rationale: ['Recent worksheet accuracy is above 85%, so the next worksheet increases difficulty.'],
        difficultyScore: {
          overallScore: 82,
          operationScores: {
            addition: 88,
            subtraction: 74,
            multiplication: 68,
            division: 55,
          },
          weakOperationWeight: 1.6,
          recommendedLevel: 'Advanced',
        },
      }),
    ),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [WorksheetPageComponent],
      providers: [
        provideRouter([]),
        { provide: PracticeService, useValue: practiceServiceMock },
        { provide: StudentIntelligenceService, useValue: studentIntelligenceServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ level: 'Intermediate' }),
            },
          },
        },
      ],
    }).compileComponents();
  });

  it('loads worksheet questions using the level route param', () => {
    const fixture = TestBed.createComponent(WorksheetPageComponent);
    fixture.detectChanges();

    expect(practiceServiceMock.getPractice).toHaveBeenCalledWith('Intermediate');
    expect(studentIntelligenceServiceMock.getStudentProfile).toHaveBeenCalled();
    expect(studentIntelligenceServiceMock.getStudentAnalytics).toHaveBeenCalled();
  });

  it('renders 10 questions with answer inputs', () => {
    const fixture = TestBed.createComponent(WorksheetPageComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('input[type="number"]').length).toBe(10);
  });

  it('refreshes adaptive recommendation after worksheet submission', () => {
    const fixture = TestBed.createComponent(WorksheetPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.answers.set(
      worksheet.questions.reduce<Record<string, number | null>>((accumulator, question) => {
        accumulator[question.id] = question.answer;
        return accumulator;
      }, {}),
    );

    component.submitWorksheet();

    expect(practiceServiceMock.submitWorksheet).toHaveBeenCalled();
    expect(studentIntelligenceServiceMock.getAdaptiveRecommendation).toHaveBeenCalled();
    expect(component.recommendation()?.recommendedLevel).toBe('Advanced');
  });
});
