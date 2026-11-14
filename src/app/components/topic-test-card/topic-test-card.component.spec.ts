import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { TopicTestStatus, lockMessage, readyThenLocked } from '../../services/topic-test.service';
import { TopicTestCardComponent } from './topic-test-card.component';

function status(overrides: Partial<TopicTestStatus> = {}): TopicTestStatus {
  return {
    topicId: 'g3-fractions',
    topicName: 'Fractions',
    state: 'locked',
    qualifyingSheets: 10,
    sheetsRequired: 10,
    sheetsRemaining: 0,
    attempts: 0,
    lastTestAccuracy: null,
    lastTestAt: null,
    lockedBy: { topicId: 'g3-decimals', topicName: 'Decimals', reason: 'failed', accuracy: 65 },
    ...overrides,
  };
}

describe('TopicTestCardComponent (locked)', () => {
  function render(s: TopicTestStatus, readOnly = false) {
    TestBed.configureTestingModule({ imports: [TopicTestCardComponent], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(TopicTestCardComponent);
    fixture.componentInstance.topicStatus = s;
    fixture.componentInstance.readOnly = readOnly;
    fixture.detectChanges();
    return fixture;
  }

  it('explains a failed blocker and links to that topic test', () => {
    const fixture = render(status());
    const el = fixture.nativeElement as HTMLElement;
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    expect(el.querySelector('.tt-card')?.classList).toContain('locked');
    expect(el.textContent).toContain('🔒');
    expect(el.textContent).toContain('Pass the Decimals test first (last score 65%, 80% needed)');
    expect(el.textContent).not.toContain('Take Topic Test');

    (el.querySelector('button.tt-cta') as HTMLButtonElement).click();
    expect(navigate).toHaveBeenCalledWith(['/tests/topic', 'g3-decimals']);
  });

  it('explains an unfinished blocker with the same link', () => {
    const fixture = render(status({ lockedBy: { topicId: 'g3-decimals', topicName: 'Decimals', reason: 'unfinished', accuracy: null } }));
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Finish your Decimals test first');
    expect(el.querySelector('button.tt-cta')?.textContent).toContain('Decimals');
  });

  it('shows the reason but no button in read-only mode', () => {
    const fixture = render(status(), true);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Pass the Decimals test first');
    expect(el.querySelector('button')).toBeNull();
  });

  it('still shows the ready button for an eligible test', () => {
    const fixture = render(status({ state: 'eligible', lockedBy: null }));
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Take Topic Test');
  });
});

describe('topic test lock helpers', () => {
  it('words the lock without a score when there is none', () => {
    expect(lockMessage({ topicId: 'x', topicName: 'Decimals', reason: 'failed', accuracy: null })).toBe('Pass the Decimals test first (80% needed)');
    expect(lockMessage(null)).toContain('other topic test');
  });

  it('lists ready tests first, then locked, keeping order within each', () => {
    const list = [
      status({ topicId: 'a', state: 'practising' }),
      status({ topicId: 'b', state: 'locked' }),
      status({ topicId: 'c', state: 'eligible' }),
      status({ topicId: 'd', state: 'passed' }),
      status({ topicId: 'e', state: 'locked' }),
    ];
    expect(readyThenLocked(list).map((s) => s.topicId)).toEqual(['c', 'b', 'e', 'a', 'd']);
  });
});
