import { parseQuestionLines } from './parent-test-page.component';

describe('parseQuestionLines', () => {
  it('reads "question | answer" lines and skips the rest', () => {
    expect(parseQuestionLines('7 × 8 | 56\n\nSpell 12 | twelve\nno answer here\nWhich is bigger: 3 | 4 or 5? | 5 |')).toEqual({
      questions: [
        { prompt: '7 × 8', answer: '56' },
        { prompt: 'Spell 12', answer: 'twelve' },
      ],
      skipped: 2,
    });
  });

  it('splits on the last bar, so a question may contain one', () => {
    expect(parseQuestionLines('Is 3 | 4 true? | no').questions).toEqual([{ prompt: 'Is 3 | 4 true?', answer: 'no' }]);
  });
});
