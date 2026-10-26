import { formatMath } from './math-format';

describe('formatMath', () => {
  it('leaves plain text alone', () => {
    expect(formatMath('Find 49 × 2 ÷ 7')).toEqual([{ kind: 'text', value: 'Find 49 × 2 ÷ 7' }]);
    expect(formatMath("Find f'(0) and |x - 3|")).toEqual([{ kind: 'text', value: "Find f'(0) and |x - 3|" }]);
  });

  it('raises exponents', () => {
    expect(formatMath('x^2 + 1')).toEqual([
      { kind: 'text', value: 'x' },
      { kind: 'sup', value: '2' },
      { kind: 'text', value: ' + 1' },
    ]);
    expect(formatMath('e^(3x)')).toEqual([{ kind: 'text', value: 'e' }, { kind: 'sup', value: '3x' }]);
    expect(formatMath('x^2y')[1]).toEqual({ kind: 'sup', value: '2' });
  });

  it('subscripts log bases', () => {
    expect(formatMath('log_2(8)')).toEqual([
      { kind: 'text', value: 'log' },
      { kind: 'sub', value: '2' },
      { kind: 'text', value: '(8)' },
    ]);
  });

  it('stacks fractions and mixed numbers but not dates', () => {
    expect(formatMath('-19/3')).toEqual([
      { kind: 'text', value: '-' },
      { kind: 'frac', whole: undefined, num: '19', den: '3', raw: '19/3' },
    ]);
    expect(formatMath('2 3/4')[0]).toMatchObject({ kind: 'frac', whole: '2', num: '3', den: '4' });
    expect(formatMath('on 12/05/2024')).toEqual([{ kind: 'text', value: 'on 12/05/2024' }]);
  });

  it('renders matrices', () => {
    expect(formatMath('Find det [2 1; 3 4]')).toEqual([
      { kind: 'text', value: 'Find det ' },
      { kind: 'matrix', rows: [['2', '1'], ['3', '4']], raw: '[2 1; 3 4]' },
    ]);
    expect(formatMath('see [note] here')).toEqual([{ kind: 'text', value: 'see [note] here' }]);
  });

  it('regroups counting dots into fives', () => {
    const parts = formatMath('How many dots? ●●●●● ●●');
    expect(parts[1]).toEqual({ kind: 'dots', groups: [5, 2], count: 7 });
    expect(formatMath('●●●●●●●●●●●●')[0]).toEqual({ kind: 'dots', groups: [5, 5, 2], count: 12 });
  });

  it('draws roots over the number or bracket contents', () => {
    expect(formatMath('(√7 + √2)^2')).toEqual([
      { kind: 'text', value: '(' },
      { kind: 'root', value: '7' },
      { kind: 'text', value: ' + ' },
      { kind: 'root', value: '2' },
      { kind: 'text', value: ')' },
      { kind: 'sup', value: '2' },
    ]);
    expect(formatMath('1/(√26 - 5)')).toEqual([
      { kind: 'text', value: '1/(' },
      { kind: 'root', value: '26' },
      { kind: 'text', value: ' - 5)' },
    ]);
    expect(formatMath('√(x + 1)')).toEqual([{ kind: 'root', value: 'x + 1' }]);
  });

  it('turns dice characters into faces', () => {
    expect(formatMath('How many dots altogether? ⚁ ⚄')).toEqual([
      { kind: 'text', value: 'How many dots altogether? ' },
      { kind: 'dice', faces: [2, 5] },
    ]);
    expect(formatMath('⚀⚅')[0]).toEqual({ kind: 'dice', faces: [1, 6] });
  });

  it('reads tally marks as bundles of five plus single strokes', () => {
    expect(formatMath('What number is 卌 卌 |||?')).toEqual([
      { kind: 'text', value: 'What number is ' },
      { kind: 'tally', groups: [5, 5, 3], count: 13 },
      { kind: 'text', value: '?' },
    ]);
    expect(formatMath('|x - 3| = 2')).toEqual([{ kind: 'text', value: '|x - 3| = 2' }]);
  });

  it('leaves ₹, °, ², ½, π, ≤ and ≥ as text', () => {
    expect(formatMath('₹50 at 90° is ½ of π r² ≤ 3 ≥ 1')).toEqual([
      { kind: 'text', value: '₹50 at 90° is ½ of π r² ≤ 3 ≥ 1' },
    ]);
  });
});
