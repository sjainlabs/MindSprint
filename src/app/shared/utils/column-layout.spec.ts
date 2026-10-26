import { columnLayout } from './column-layout';

describe('columnLayout', () => {
  it('stacks a sum from the prompt', () => {
    expect(columnLayout('Add: 345 + 278 = ?')).toEqual({
      intro: 'Add:',
      rows: [
        { op: '', value: '345' },
        { op: '+', value: '278' },
      ],
    });
  });

  it('handles several numbers and subtraction', () => {
    expect(columnLayout('1,204 + 37 - 18')?.rows).toEqual([
      { op: '', value: '1,204' },
      { op: '+', value: '37' },
      { op: '−', value: '18' },
    ]);
  });

  it('prefers numbers from metadata', () => {
    expect(columnLayout('Multiply 46 × 7', { top: 46, bottom: 7, operator: '×' })).toEqual({
      intro: 'Multiply',
      rows: [
        { op: '', value: '46' },
        { op: '×', value: '7' },
      ],
    });
  });

  it('gives up on prompts that are not a plain sum', () => {
    expect(columnLayout('How many tens are in 450?')).toBeNull();
  });
});
