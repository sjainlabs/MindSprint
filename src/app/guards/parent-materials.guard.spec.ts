import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('allows navigation with validated access', () => {
    vi.spyOn(parentAccessServiceMock, 'hasValidatedAccess').mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() => parentMaterialsGuard({} as never, {} as never));

    expect(result).toBe(true);
  });

  it('redirects to dashboard without validated access', () => {
    const router = TestBed.inject(Router);
    vi.spyOn(parentAccessServiceMock, 'hasValidatedAccess').mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() => parentMaterialsGuard({} as never, {} as never));

    expect(result).toEqual(router.createUrlTree(['/parent/dashboard']));
  });
});
