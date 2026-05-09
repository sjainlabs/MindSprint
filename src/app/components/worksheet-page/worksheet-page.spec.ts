import { of } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { WorksheetPageComponent } from './worksheet-page';
import { PracticeService, type Worksheet } from '../../services/practice.service';

describe('WorksheetPageComponent', () => {
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

  const practiceServiceMock = {
    getPractice: vi.fn(() => of(worksheet)),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorksheetPageComponent],
      providers: [
        provideRouter([]),
        { provide: PracticeService, useValue: practiceServiceMock },
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
  });

  it('renders 10 questions with answer inputs', () => {
    const fixture = TestBed.createComponent(WorksheetPageComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('input[type="number"]').length).toBe(10);
  });
});
