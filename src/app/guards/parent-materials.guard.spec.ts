import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ParentAccessService } from '../services/parent-access.service';
import { parentMaterialsGuard } from './parent-materials.guard';

describe('parentMaterialsGuard', () => {
  const parentAccessServiceMock = {
    hasValidatedAccess: () => false,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ParentAccessService, useValue: parentAccessServiceMock },
      ],
    });
  });

  it('allows navigation with validated access', () => {
    spyOn(parentAccessServiceMock, 'hasValidatedAccess').and.returnValue(true);

    const result = TestBed.runInInjectionContext(() => parentMaterialsGuard({} as never, {} as never));

    expect(result).toBeTrue();
  });

  it('redirects to dashboard without validated access', () => {
    const router = TestBed.inject(Router);
    spyOn(parentAccessServiceMock, 'hasValidatedAccess').and.returnValue(false);

    const result = TestBed.runInInjectionContext(() => parentMaterialsGuard({} as never, {} as never));

    expect(result).toEqual(router.createUrlTree(['/parent/dashboard']));
  });
});
