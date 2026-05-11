import { of, throwError } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TopicBrowserComponent } from './topic-browser';
import { TopicService } from '../../services/topic.service';
import { SyllabusService } from '../../services/syllabus.service';

const mockBrowserResponse = {
  studentId: 'student-demo',
  browseTopics: [
    {
      id: 'foundation',
      title: 'Foundation Math',
      sourceTopicId: 'foundation',
      subtopics: ['counting', 'addition'],
      difficultyTiers: [{ name: 'Beginner', min: 0, max: 30 }],
      prerequisites: [],
      masteryPercentage: 75,
      recommendedNextSteps: ['Move to subtraction'],
    },
    {
      id: 'algebra-basics',
      title: 'Algebra Basics',
      sourceTopicId: 'algebra-basics',
      subtopics: ['variables', 'expressions'],
      difficultyTiers: [
        { name: 'Beginner', min: 0, max: 30 },
        { name: 'Advanced', min: 70, max: 100 },
      ],
      prerequisites: ['foundation'],
      masteryPercentage: 40,
      recommendedNextSteps: ['Practice linear equations'],
    },
  ],
};

const mockExploration = {
  studentId: 'student-demo',
  requestedTopicId: 'foundation',
  recommendedTopicId: 'algebra-basics',
  recommendedTopicName: 'Algebra Basics',
  recommendedDifficulty: 45,
  message: 'You have mastered Foundation. Try Algebra Basics next!',
};

const mockDomainDetail = {
  domainId: 'fluency' as const,
  name: 'Fluency & Speed',
  description: 'Build automatic recall.',
  totalSkills: 2,
  skills: [
    {
      skillId: 'fl-1',
      name: 'Addition Fluency',
      description: 'Add within 100 quickly',
      difficulty: 20,
      ritBand: { min: 190, max: 210 },
      recommendedNextSteps: ['Subtraction fluency'],
      domain: 'fluency' as const,
      gradeRange: { min: 1, max: 3 },
      tags: ['addition', 'speed'],
    },
  ],
};

describe('TopicBrowserComponent', () => {
  const topicServiceMock = {
    getTopicBrowser: vi.fn(() => of(mockBrowserResponse)),
    getExplorationRecommendation: vi.fn(() => of(mockExploration)),
  };

  const syllabusServiceMock = {
    getDomain: vi.fn(() => of(mockDomainDetail)),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [TopicBrowserComponent],
      providers: [
        provideRouter([]),
        { provide: TopicService, useValue: topicServiceMock },
        { provide: SyllabusService, useValue: syllabusServiceMock },
      ],
    }).compileComponents();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(TopicBrowserComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('loads topic browser on init', () => {
    const fixture = TestBed.createComponent(TopicBrowserComponent);
    fixture.detectChanges();

    expect(topicServiceMock.getTopicBrowser).toHaveBeenCalledWith('student-demo');
    expect(fixture.componentInstance.browser()).toBeTruthy();
  });

  it('loads exploration recommendation after browser loads', () => {
    const fixture = TestBed.createComponent(TopicBrowserComponent);
    fixture.detectChanges();

    expect(topicServiceMock.getExplorationRecommendation).toHaveBeenCalled();
    expect(fixture.componentInstance.exploration()?.message).toContain('Algebra Basics');
  });

  it('shows error message when browser fails to load', () => {
    topicServiceMock.getTopicBrowser.mockReturnValueOnce(throwError(() => new Error('error')));
    const fixture = TestBed.createComponent(TopicBrowserComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.errorMessage()).toBe('Unable to load topic browser.');
  });

  it('exposes all five Super-Syllabus categories', () => {
    const fixture = TestBed.createComponent(TopicBrowserComponent);
    const comp = fixture.componentInstance;

    expect(comp.superCategories.length).toBe(5);
    const ids = comp.superCategories.map((c) => c.id);
    expect(ids).toContain('fluency');
    expect(ids).toContain('conceptual-mastery');
    expect(ids).toContain('reasoning-logic');
    expect(ids).toContain('map-skills');
    expect(ids).toContain('competition-math');
  });

  it('loads domain detail when a category is selected', () => {
    const fixture = TestBed.createComponent(TopicBrowserComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    comp.selectCategory('fluency');

    expect(syllabusServiceMock.getDomain).toHaveBeenCalledWith('fluency');
    expect(comp.categoryDetail()).toBeTruthy();
    expect(comp.categoryDetail()!.name).toBe('Fluency & Speed');
  });

  it('deselects category on second click', () => {
    const fixture = TestBed.createComponent(TopicBrowserComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    comp.selectCategory('fluency');
    comp.selectCategory('fluency'); // second click deselects

    expect(comp.selectedCategory()).toBeNull();
    expect(comp.categoryDetail()).toBeNull();
  });

  it('filters topics by domain (returns all topics)', () => {
    const fixture = TestBed.createComponent(TopicBrowserComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    comp.exploreFilter.set('domain');
    expect(comp.filteredTopics().length).toBe(2);
  });

  it('filters topics by reasoning level', () => {
    const fixture = TestBed.createComponent(TopicBrowserComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    comp.exploreFilter.set('reasoning-level');
    comp.selectedReasoningLevel.set('basic');
    // foundation has Beginner tier (min 0, max 30) — falls in basic range
    const filtered = comp.filteredTopics();
    expect(filtered.length).toBeGreaterThanOrEqual(1);
  });

  it('filters topics by competition difficulty', () => {
    const fixture = TestBed.createComponent(TopicBrowserComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    comp.exploreFilter.set('competition-difficulty');
    comp.selectedCompetitionLevel.set('AMC-8'); // minDiff = 50
    // algebra-basics has an Advanced tier going to 100 → passes
    const filtered = comp.filteredTopics();
    expect(filtered.some((t) => t.id === 'algebra-basics')).toBe(true);
  });

  it('supports all four exploration filter types', () => {
    const fixture = TestBed.createComponent(TopicBrowserComponent);
    const comp = fixture.componentInstance;

    expect(comp.exploreFilter()).toBe('domain');
    comp.exploreFilter.set('rit-band');
    expect(comp.exploreFilter()).toBe('rit-band');
    comp.exploreFilter.set('reasoning-level');
    expect(comp.exploreFilter()).toBe('reasoning-level');
    comp.exploreFilter.set('competition-difficulty');
    expect(comp.exploreFilter()).toBe('competition-difficulty');
  });
});
