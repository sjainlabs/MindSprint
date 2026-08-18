import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VerticalMultiplicationComponent } from './vertical-multiplication.component';

describe('VerticalMultiplicationComponent', () => {
  let component: VerticalMultiplicationComponent;
  let fixture: ComponentFixture<VerticalMultiplicationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerticalMultiplicationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VerticalMultiplicationComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
