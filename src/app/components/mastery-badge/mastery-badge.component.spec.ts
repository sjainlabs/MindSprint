import { TestBed } from '@angular/core/testing';
import { MasteryBadgeComponent } from './mastery-badge.component';

describe('MasteryBadgeComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MasteryBadgeComponent],
    }).compileComponents();
  });

  it('renders mastered badge with blue style', () => {
    const fixture = TestBed.createComponent(MasteryBadgeComponent);
    fixture.componentRef.setInput('level', 'mastered');
    fixture.componentRef.setInput('label', 'Mastered');
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('span') as HTMLSpanElement;
    expect(badge.className).toContain('bg-blue-100');
    expect(badge.className).toContain('text-blue-700');
  });

  it('renders developing badge with yellow style', () => {
    const fixture = TestBed.createComponent(MasteryBadgeComponent);
    fixture.componentRef.setInput('level', 'developing');
    fixture.componentRef.setInput('label', 'Developing');
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('span') as HTMLSpanElement;
    expect(badge.className).toContain('bg-yellow-100');
    expect(badge.className).toContain('text-yellow-700');
  });
});
