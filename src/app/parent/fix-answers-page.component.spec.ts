import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AnswerFixResult, AnswerFixService, FixableSubmission } from '../services/answer-fix.service';
import { TestApiError } from '../services/test-api-error';
import { FixAnswersPageComponent } from './fix-answers-page.component';

const SUBMISSION: FixableSubmission = {
  worksheetId: 'topic-test-123',
  kind: 'topic-test',
  score: 3,
  total: 4,
  accuracy: 75,
  submittedAt: '2026-11-10T15:30:00Z',
  questions: [
    { questionId: 'q1', prompt: '2 + 2 = ?', expectedAnswer: '4', submittedAnswer: '4', correct: true, fixedByParent: false, canFix: false },
    { questionId: 'q2', prompt: '5 + 3 = ?', expectedAnswer: '8', submittedAnswer: '9', correct: false, fixedByParent: false, canFix: true },
    { questionId: 'q3', prompt: '6 + 1 = ?', expectedAnswer: '7', submittedAnswer: '7', correct: true, fixedByParent: true, canFix: false },
    { questionId: 'q4', prompt: '9 - 4 = ?', expectedAnswer: '5', submittedAnswer: '', correct: false, fixedByParent: false, canFix: true },
  ],
};

const RESULT: AnswerFixResult = {
  ...SUBMISSION,
  score: 4,
  accuracy: 100,
  previousAccuracy: 75,
  fixedQuestionIds: ['q2'],
  questions: SUBMISSION.questions.map((q) => (q.questionId === 'q2' ? { ...q, submittedAnswer: '8', correct: true, fixedByParent: true, canFix: false } : q)),
};

describe('FixAnswersPageComponent', () => {
  let api: { get: ReturnType<typeof vi.fn>; save: ReturnType<typeof vi.fn> };

  async function setup(submission: FixableSubmission | Error = SUBMISSION) {
    api = {
      get: submission instanceof Error ? vi.fn().mockRejectedValue(submission) : vi.fn().mockResolvedValue(submission),
      save: vi.fn().mockResolvedValue(RESULT),
    };
    TestBed.configureTestingModule({
      imports: [FixAnswersPageComponent],
      providers: [
        provideRouter([]),
        { provide: AnswerFixService, useValue: api },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({ studentId: 's1', worksheetId: 'topic-test-123' }) } } },
      ],
    });
    const fixture = TestBed.createComponent(FixAnswersPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  const el = (f: { nativeElement: HTMLElement }) => f.nativeElement;
  const inputs = (f: { nativeElement: HTMLElement }) => [...el(f).querySelectorAll<HTMLInputElement>('.fix input')];
  const button = (f: { nativeElement: HTMLElement }, label: RegExp) =>
    [...el(f).querySelectorAll('button')].find((b) => label.test(b.textContent ?? '')) as HTMLButtonElement;
  const type = (input: HTMLInputElement, value: string) => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  it('loads the submission and shows kind, score and every question', async () => {
    const f = await setup();
    expect(api.get).toHaveBeenCalledWith('s1', 'topic-test-123');
    const text = el(f).textContent ?? '';
    expect(text).toContain('Topic test');
    expect(text).toContain('75%');
    expect(el(f).querySelectorAll('li.q').length).toBe(4);
    expect(el(f).querySelectorAll('.tag.fixed').length).toBe(1);
  });

  it('only wrong answers get an input, prefilled with the child’s answer', async () => {
    const f = await setup();
    const fields = inputs(f);
    expect(fields.length).toBe(2);
    expect(fields.map((i) => i.value)).toEqual(['9', '']);
  });

  it('keeps Save disabled until an answer changes', async () => {
    const f = await setup();
    expect(button(f, /Save fixes/).disabled).toBe(true);

    type(inputs(f)[0], '9');
    f.detectChanges();
    expect(button(f, /Save fixes/).disabled).toBe(true);

    type(inputs(f)[0], '8');
    f.detectChanges();
    expect(button(f, /Save fixes/).disabled).toBe(false);
  });

  it('confirms, then sends only the changed answers and shows the result banner', async () => {
    const f = await setup();
    type(inputs(f)[0], ' 8 ');
    f.detectChanges();

    button(f, /Save fixes/).click();
    f.detectChanges();
    expect(api.save).not.toHaveBeenCalled();
    expect(el(f).textContent).toContain('These answers will be marked as typo fixes');

    button(f, /Yes, save fixes/).click();
    await f.whenStable();
    f.detectChanges();

    expect(api.save).toHaveBeenCalledWith('s1', 'topic-test-123', { q2: '8' });
    const text = el(f).textContent ?? '';
    expect(text).toContain('Score 75% → 100%');
    expect(text).toContain('Test passed 🎉, other topic tests unlocked');
  });

  it('does not claim a pass for other kinds', async () => {
    const f = await setup({ ...SUBMISSION, kind: 'practice' });
    api.save.mockResolvedValue({ ...RESULT, kind: 'practice' });
    type(inputs(f)[0], '8');
    f.detectChanges();
    button(f, /Save fixes/).click();
    f.detectChanges();
    button(f, /Yes, save fixes/).click();
    await f.whenStable();
    f.detectChanges();

    expect(el(f).textContent).toContain('Score 75% → 100%');
    expect(el(f).textContent).not.toContain('Test passed');
  });

  it('shows the backend message when saving fails', async () => {
    const f = await setup();
    api.save.mockRejectedValue(new TestApiError('ALREADY_CORRECT', 'That answer is already correct.', 400));
    type(inputs(f)[0], '8');
    f.detectChanges();
    button(f, /Save fixes/).click();
    f.detectChanges();
    button(f, /Yes, save fixes/).click();
    await f.whenStable();
    f.detectChanges();

    expect(el(f).textContent).toContain('That answer is already correct.');
  });

  it('shows the backend message when loading fails', async () => {
    const f = await setup(new TestApiError('NOT_FOUND', "Worksheet 'x' was not found for this student.", 404));
    expect(el(f).textContent).toContain('was not found for this student');
  });
});
