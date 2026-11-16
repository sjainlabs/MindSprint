import { describeDuration, formatHoursMinutes } from './duration';

describe('formatHoursMinutes', () => {
  it('shows minutes and hours as hh:mm', () => {
    expect(formatHoursMinutes(2307)).toBe('00:38');
    expect(formatHoursMinutes(3725)).toBe('01:02');
    expect(formatHoursMinutes(36000)).toBe('10:00');
  });

  it('never shows time spent as 00:00', () => {
    expect(formatHoursMinutes(12)).toBe('00:01');
    expect(formatHoursMinutes(0)).toBe('00:00');
  });

  it('shows a dash when there is no time', () => {
    expect(formatHoursMinutes(null)).toBe('—');
    expect(formatHoursMinutes(undefined)).toBe('—');
    expect(formatHoursMinutes(NaN)).toBe('—');
  });
});

describe('describeDuration', () => {
  it('spells out the exact time', () => {
    expect(describeDuration(2307)).toBe('38 min 27 s');
    expect(describeDuration(3725)).toBe('1 h 2 min 5 s');
    expect(describeDuration(45)).toBe('45 s');
    expect(describeDuration(null)).toBe('');
  });
});
