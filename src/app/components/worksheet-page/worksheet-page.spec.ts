import { of } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { WorksheetPageComponent } from './worksheet-page';
import {
  PracticeService,
  type Worksheet,
  type WorksheetResult,
} from '../../services/practice.service';
import { StudentIntelligenceService } from '../../services/student-intelligence.service';
import { TopicService } from '../../services/topic.service';
import { AiWorksheetService } from '../../services/ai-worksheet.service';
import { PRACTICE_TOPIC_CATALOG } from '../../services/practice-topic-catalog';

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
        age: 8,
        grade: 4,
        masteryLevels: {
          addition: 80,
          subtraction: 70,
          multiplication: 65,
          division: 60,
        },
        topicMastery: {
          foundation: 75,
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
        topicAnalytics: [],
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
        rationale: [
          'Recent worksheet accuracy is above 85%, so the next worksheet increases difficulty.',
        ],
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

  const topicServiceMock = {
    getTaxonomy: vi.fn(() =>
      of({
        topics: [
          PRACTICE_TOPIC_CATALOG.find((topic) => topic.groupKey === 'Kindergarten')!,
          PRACTICE_TOPIC_CATALOG.find((topic) => topic.groupKey === 'LevelA')!,
        ],
        difficultyMapping: [],
      }),
    ),
    getPersonalizedPath: vi.fn(() =>
      of({
        studentId: 'student-demo',
        personalizedPath: [],
      }),
    ),
  };

  const aiWorksheetServiceMock = {
    generateWorksheet: vi.fn(() =>
      of({
        worksheetId: 'ai-1',
        topic: PRACTICE_TOPIC_CATALOG[0].id,
        difficulty: 30,
        generatedAt: new Date().toISOString(),
        questionTypes: ['numeric'],
        questions: [],
        validation: {
          allQuestionsHaveAnswers: true,
          hasSupportedQuestionTypes: true,
          topicSupported: true,
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
        { provide: TopicService, useValue: topicServiceMock },
        { provide: AiWorksheetService, useValue: aiWorksheetServiceMock },
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
    expect(compiled.querySelectorAll('[data-testid="worksheet-question-input"]').length).toBe(10);
  });

  it('renders grouped K-12 and Kumon topic sections', () => {
    const fixture = TestBed.createComponent(WorksheetPageComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Kindergarten');
    expect(compiled.textContent).toContain('Kumon Level A');
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

  it('normalizes translated recommended level values for adaptive navigation logic', () => {
    studentIntelligenceServiceMock.getAdaptiveRecommendation.mockReturnValueOnce(
      of({
        studentId: 'student-demo',
        targetDifficulty: 78,
        recommendedLevel: 'Advanced',
        recommendedLevelRaw: 'अनुशंसित स्तर: उन्नत',
        focusOperations: ['division'],
        rationale: ['translation-safe recommendation'],
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
      } as any),
    );

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

    expect(component.recommendedLevel()).toBe('Advanced');
    expect(component.canOpenRecommendedWorksheet()).toBe(true);
  });

  it('uses topic-specific question types when generating an AI worksheet', () => {
    const fixture = TestBed.createComponent(WorksheetPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    const selectedTopic = PRACTICE_TOPIC_CATALOG.find((topic) => topic.groupKey === 'LevelA')!;
    component.selectTopic(selectedTopic.id);
    component.generateAdvancedWorksheet();

    expect(aiWorksheetServiceMock.generateWorksheet).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: selectedTopic.id,
        questionTypes: selectedTopic.questionTypes,
      }),
    );
  });
});
