import { MIXED_PRACTICE_LEVEL, worksheetLevel } from './practice-level';

describe('worksheetLevel', () => {
  it('keeps the level when every topic shares a grade and level', () => {
    expect(worksheetLevel([{ cbseGrade: 3, practiceLevel: 'Elementary' }, { cbseGrade: 3, practiceLevel: 'Elementary' }])).toBe('Elementary');
  });

  it('asks for a mixed sheet across grades or levels', () => {
    expect(worksheetLevel([{ cbseGrade: 2, practiceLevel: 'Beginner' }, { cbseGrade: 3, practiceLevel: 'Beginner' }])).toBe(MIXED_PRACTICE_LEVEL);
    expect(worksheetLevel([{ cbseGrade: 3, practiceLevel: 'Beginner' }, { cbseGrade: 3, practiceLevel: 'Elementary' }])).toBe(MIXED_PRACTICE_LEVEL);
  });
});
