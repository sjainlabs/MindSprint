import { of, throwError } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { ConceptViewComponent } from './concept-view.component';
import { OperationsService } from '../../operations.service';

describe('ConceptViewComponent', () => {
  const operationsServiceMock = {
    getConcept: vi.fn(() =>
      of({
        operation: 'add',
        definition: 'Putting numbers together.',
        kidFriendlyExplanation: 'Join two groups.',
        visualExplanation: '🟦 + 🟦',
        examples: ['1 + 2 = 3'],
        commonMistakes: ['Forgetting to count all blocks'],
      }),
    ),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [ConceptViewComponent],
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

  it('loads concept data for the route operation', () => {
    const fixture = TestBed.createComponent(ConceptViewComponent);
    fixture.detectChanges();

    expect(operationsServiceMock.getConcept).toHaveBeenCalledWith('add');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Putting numbers together.');
    expect(text).toContain('Start Practice');
  });

  it('shows an error when concept request fails', () => {
    operationsServiceMock.getConcept.mockReturnValueOnce(throwError(() => new Error('network')));

    const fixture = TestBed.createComponent(ConceptViewComponent);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Unable to load concept right now.');
  });
});
