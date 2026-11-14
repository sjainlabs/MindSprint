import { analystShareLink, formatAnalystCode, normalizeAnalystCode } from './analyst-code';

describe('analyst codes', () => {
  it('cleans up and formats a code', () => {
    expect(normalizeAnalystCode(' wdts-7qek ')).toBe('WDTS7QEK');
    expect(formatAnalystCode('wdts7qek')).toBe('WDTS-7QEK');
  });

  it('puts the share link on the hash route, under the app base', () => {
    expect(analystShareLink('wdts-7qek', 'https://sjainlabs.github.io/MindSprint/')).toBe(
      'https://sjainlabs.github.io/MindSprint/#/analyst?code=WDTS7QEK',
    );
    expect(analystShareLink('WDTS7QEK', 'http://localhost:4200/')).toBe('http://localhost:4200/#/analyst?code=WDTS7QEK');
  });

  it('ignores the current page hash and query in the base', () => {
    expect(analystShareLink('WDTS7QEK', 'https://sjainlabs.github.io/MindSprint/?x=1#/parent/dashboard')).toBe(
      'https://sjainlabs.github.io/MindSprint/#/analyst?code=WDTS7QEK',
    );
  });
});
