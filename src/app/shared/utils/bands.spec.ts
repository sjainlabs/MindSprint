import { bandRank, sheetBand, sortBands } from './bands';

describe('bands', () => {
  it('orders pre-school bands before A–O', () => {
    expect(sortBands(['D', '3A', 'A', 'ZI', 'D', null, 'O'])).toEqual(['ZI', '3A', 'A', 'D', 'O']);
    expect(bandRank('zz')).toBeGreaterThan(bandRank('O'));
  });

  it('puts a sheet in the band most of its topics are in, the higher one on a tie, ignoring case', () => {
    const bandOf = new Map([['multiplication-2x2', 'E'], ['lcm-two-numbers', 'E'], ['fractions-simplify', 'E'], ['expanded-form', 'C']]);
    expect(sheetBand(['Multiplication-2x2', 'lcm-two-numbers', 'expanded-form'], bandOf)).toBe('E');
    expect(sheetBand(['expanded-form', 'fractions-simplify'], bandOf)).toBe('E');
    expect(sheetBand(['unknown-topic'], bandOf)).toBeNull();
  });
});
