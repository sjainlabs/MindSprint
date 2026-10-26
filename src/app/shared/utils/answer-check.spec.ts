import { answersMatch, canAutoCheck, checkAnswer, parseNumber } from './answer-check';

describe('answer-check', () => {
  describe('parseNumber', () => {
    it('parses whole numbers, decimals, fractions and mixed numbers', () => {
      expect(parseNumber('42')).toBe(42);
      expect(parseNumber('0.5')).toBe(0.5);
      expect(parseNumber('3/4')).toBe(0.75);
      expect(parseNumber('2 1/4')).toBe(2.25);
    });

    it('handles unicode minus, thousands commas and currency', () => {
      expect(parseNumber('−7')).toBe(-7);
      expect(parseNumber('12,500')).toBe(12500);
      expect(parseNumber('₹1,250')).toBe(1250);
    });

    it('returns null for text and divide-by-zero', () => {
      expect(parseNumber('Circle')).toBeNull();
      expect(parseNumber('1/0')).toBeNull();
    });
  });

  describe('answersMatch', () => {
    it('accepts equivalent numbers', () => {
      expect(answersMatch('0.5', '1/2')).toBe(true);
      expect(answersMatch('2/4', '1/2')).toBe(true);
      expect(answersMatch('9/4', '2 1/4')).toBe(true);
      expect(answersMatch('1 000', '1000')).toBe(true);
      expect(answersMatch('-3', '−3')).toBe(true);
    });

    it('matches words ignoring case and spaces', () => {
      expect(answersMatch('circle', 'Circle')).toBe(true);
      expect(answersMatch(' DOWN ', 'Down')).toBe(true);
      expect(answersMatch('x=3 or x=-3', 'x = 3 or x = −3')).toBe(true);
    });

    it('accepts list answers in any order', () => {
      expect(answersMatch('x = −3 or x = 3', 'x = 3 or x = −3')).toBe(true);
      expect(answersMatch('6, 2, 4', '2, 4, 6')).toBe(true);
    });

    it('rejects wrong answers', () => {
      expect(answersMatch('3/5', '3/4')).toBe(false);
      expect(answersMatch('Square', 'Circle')).toBe(false);
      expect(answersMatch('x = 3', 'x = 3 or x = −3')).toBe(false);
    });
  });

  describe('checkAnswer', () => {
    it('falls back to manual for long written answers', () => {
      const long = 'Because the denominators are the same, you only add the numerators.';
      expect(canAutoCheck(long)).toBe(false);
      expect(checkAnswer('anything', long)).toBe('manual');
    });

    it('treats an empty input as incorrect', () => {
      expect(checkAnswer('  ', '5')).toBe('incorrect');
    });
  });
});
