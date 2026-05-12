import { TestBed } from '@angular/core/testing';
import { MapGraphComponent } from './map-graph';

describe('MapGraphComponent', () => {
  it('creates component', async () => {
    await TestBed.configureTestingModule({
      imports: [MapGraphComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(MapGraphComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('normalizes bar values for rendering', async () => {
    await TestBed.configureTestingModule({
      imports: [MapGraphComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(MapGraphComponent);
    fixture.componentInstance.payload = {
      type: 'bar',
      labels: ['A', 'B'],
      values: [1, 2],
    };
    fixture.detectChanges();

    expect(fixture.componentInstance.hasData()).toBe(true);
    expect(fixture.componentInstance.normalizedBars().length).toBe(2);
  });
});
