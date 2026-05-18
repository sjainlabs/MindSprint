import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { Router, RouterOutlet, provideRouter } from '@angular/router';
import { operationsRoutes } from './operations-routing.module';

@Component({
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
class HostComponent {}

describe('operationsRoutes', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        provideRouter([
          {
            path: 'operations',
            children: operationsRoutes,
          },
        ]),
      ],
    }).compileComponents();
  });

  it('supports concept → demo → practice → mastery-check navigation flow', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    const router = TestBed.inject(Router);
    const location = TestBed.inject(Location);

    await router.navigateByUrl('/operations/add/concept');
    fixture.detectChanges();
    expect(location.path()).toBe('/operations/add/concept');

    await router.navigateByUrl('/operations/add/demo');
    fixture.detectChanges();
    expect(location.path()).toBe('/operations/add/demo');

    await router.navigateByUrl('/operations/add/practice');
    fixture.detectChanges();
    expect(location.path()).toBe('/operations/add/practice');

    await router.navigateByUrl('/operations/add/mastery-check');
    fixture.detectChanges();
    expect(location.path()).toBe('/operations/add/mastery-check');
  });
});
