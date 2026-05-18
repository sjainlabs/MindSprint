import { of } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { MasteryCheckComponent } from './mastery-check.component';
import { OperationsService } from '../../operations.service';
import { MasteryEngineService } from '../../../../core/mastery/mastery-engine.service';

const masteryState = {
  studentId: 'student-demo',
  updatedAt: new Date().toISOString(),
  skills: [
    {
      skillId: 'addition',
      skillName: 'Addition',
      level: 'proficient',
      accuracy: 80,
      attempts: 10,
      lastPracticed: new Date().toISOString(),
      progressToNextLevel: 66,
    },
  ],
  weakSkills: [
    {
      skillId: 'division',
      skillName: 'Division',
      level: 'developing',
      accuracy: 43,
      attempts: 7,
      lastPracticed: new Date().toISOString(),
      progressToNextLevel: 30,
    },
  ],
  recommendedNextSkill: {
    skillId: 'division',
    skillName: 'Division',
    reason: 'weak-skill',
    action: 'Practice division facts',
  },
};

describe('MasteryCheckComponent', () => {
  const operationsServiceMock = {
    getLatestMasteryState: vi.fn(() => masteryState),
  };

  const masteryEngineMock = {
    fetchMasteryState: vi.fn(() => of(masteryState)),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [MasteryCheckComponent],
      providers: [
        { provide: OperationsService, useValue: operationsServiceMock },
        { provide: MasteryEngineService, useValue: masteryEngineMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ operation: 'add' }) },
          },
        },
      ],
    }).compileComponents();
  });

  it('shows mastery updates, weak skills, and recommendation', () => {
    const fixture = TestBed.createComponent(MasteryCheckComponent);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Updated mastery badge');
    expect(text).toContain('Weak skills');
    expect(text).toContain('Division');
    expect(text).toContain('Start Next Skill');
  });
});
