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
