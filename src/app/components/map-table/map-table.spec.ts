import { TestBed } from '@angular/core/testing';
import { MapTableComponent } from './map-table';

describe('MapTableComponent', () => {
  it('creates component', async () => {
    await TestBed.configureTestingModule({
      imports: [MapTableComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(MapTableComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('returns hasData when headers and rows exist', async () => {
    await TestBed.configureTestingModule({
      imports: [MapTableComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(MapTableComponent);
    fixture.componentInstance.payload = {
      headers: ['H1'],
      rows: [[1]],
    };
    fixture.detectChanges();

    expect(fixture.componentInstance.hasData()).toBe(true);
  });
});
