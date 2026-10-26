import { inputSpecFor, joinMultiAnswer, splitMultiAnswer } from './question-input';

describe('inputSpecFor', () => {
  it('detects multi-part answers and keeps prompt order', () => {
    const spec = inputSpecFor('Solve the simultaneous equations. Give x, y separated by a comma.');
    expect(spec.kind).toBe('multi');
    expect(spec.variables).toEqual(['x', 'y']);
    expect(spec.hint).toBe('Example: 3, -2');

    expect(inputSpecFor('Give p, q where p ≤ q').variables).toEqual(['p', 'q']);
    expect(inputSpecFor('Give a, b, c').variables).toEqual(['a', 'b', 'c']);
    expect(inputSpecFor('Solve for x, y and z. Give x, y, z').variables).toEqual(['x', 'y', 'z']);

    const division = inputSpecFor('Divide x^3 + 2x^2 − 5x + 1 by x − 2. Give a, b, c, R');
    expect(division.variables).toEqual(['a', 'b', 'c', 'R']);
    expect(division.hint).toBe('Example: 3, -2, 5, 1');
    expect(inputSpecFor('Give a, b, c and R').variables).toEqual(['a', 'b', 'c', 'R']);
  });

  it('offers inequality keys for "Solve …<…" prompts', () => {
    const spec = inputSpecFor('Solve 2x + 3 < 11');
    expect(spec.kind).toBe('inequality');
    expect(spec.helperKeys.map((k) => k.label)).toEqual(['<', '>', '≤', '≥', '−']);
  });

  it('adds / and − keys for fractions', () => {
    const spec = inputSpecFor('Simplify 38/6. Give your answer in simplest form.');
    expect(spec.inputMode).toBe('text');
    expect(spec.helperKeys.map((k) => k.insert)).toEqual(['/', '-']);
  });

  it('adds a minus key for negatives and equations', () => {
    expect(inputSpecFor('Work out −7 + 3').helperKeys.map((k) => k.insert)).toEqual(['-']);
    expect(inputSpecFor('Solve 3x + 4 = 1').helperKeys.map((k) => k.insert)).toEqual(['-']);
  });

  it('uses a number pad for plain arithmetic', () => {
    expect(inputSpecFor('What is 23 + 45?')).toMatchObject({ inputMode: 'numeric', helperKeys: [] });
    expect(inputSpecFor('What is 2.5 × 4?').inputMode).toBe('decimal');
    expect(inputSpecFor('What is 45 − 23?')).toMatchObject({ inputMode: 'numeric', helperKeys: [] });
  });

  it('keeps a text keyboard for word answers', () => {
    expect(inputSpecFor('Which shape has 3 sides?').inputMode).toBe('text');
  });

  it('uses the big number pad for counting dots', () => {
    expect(inputSpecFor('How many dots? ●●●●● ●●').kind).toBe('dots');
  });

  it('uses the big number pad for dice', () => {
    expect(inputSpecFor('How many dots altogether? ⚁ ⚄').kind).toBe('dots');
  });

  it('offers a √ key for surds', () => {
    const spec = inputSpecFor('Expand (√7 + √2)^2');
    expect(spec.helperKeys.map((k) => k.label)).toEqual(['√', '/', '−']);
    expect(inputSpecFor('Rationalise 1/(√26 - 5)').helperKeys[0].label).toBe('√');
  });

  it('switches input per question on a "Mixed" sheet', () => {
    const sheet = ['What is 6 × 7?', 'What is 42 ÷ 6?', 'What is 35 + 18?', 'What is 61 − 27?'];
    expect(sheet.map((p) => inputSpecFor(p).inputMode)).toEqual(['numeric', 'numeric', 'numeric', 'numeric']);
    const mixedAlgebra = ['Work out −8 + 3', 'What is 3/4 + 1/8?', 'What is 12 × 4?'];
    expect(mixedAlgebra.map((p) => inputSpecFor(p).helperKeys.map((k) => k.label))).toEqual([['−'], ['/', '−'], []]);
  });

  it('handles each question of a mixed review sheet on its own', () => {
    const kinds = ['What is 12 + 9?', 'What is 56 ÷ 7?', 'Add 1/4 + 2/4'].map((p) => inputSpecFor(p));
    expect(kinds.map((k) => k.inputMode)).toEqual(['numeric', 'numeric', 'text']);
  });
});

describe('multi-part answer helpers', () => {
  it('round-trips values', () => {
    expect(splitMultiAnswer('3, -2', 2)).toEqual(['3', '-2']);
    expect(splitMultiAnswer('', 3)).toEqual(['', '', '']);
    expect(joinMultiAnswer(['3', ' -2 '])).toBe('3, -2');
    expect(joinMultiAnswer(['', ''])).toBe('');
  });
});
