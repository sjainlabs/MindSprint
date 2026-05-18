import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { InteractiveDemoComponent } from './interactive-demo.component';

const scenarios = [
  { operation: 'add', expected: 'Addition: combining blocks' },
  { operation: 'sub', expected: 'Subtraction: removing blocks' },
  { operation: 'mul', expected: 'Multiplication: groups of items' },
  { operation: 'div', expected: 'Division: sharing items' },
  { operation: 'fraction', expected: 'Fractions: shaded shapes' },
  { operation: 'decimal', expected: 'Decimals: place value grid' },
] as const;

describe('InteractiveDemoComponent', () => {
  for (const scenario of scenarios) {
    it(`renders ${scenario.operation} demo UI`, async () => {
      await TestBed.configureTestingModule({
        imports: [InteractiveDemoComponent],
        providers: [
          {
            provide: ActivatedRoute,
            useValue: {
              snapshot: { paramMap: convertToParamMap({ operation: scenario.operation }) },
            },
          },
        ],
      }).compileComponents();

      const fixture = TestBed.createComponent(InteractiveDemoComponent);
      fixture.detectChanges();

      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain(scenario.expected);
    });
  }
});
