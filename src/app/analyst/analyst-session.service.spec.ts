import { TestBed } from '@angular/core/testing';
import { ANALYST_SESSION_KEY, AnalystSession, AnalystSessionService } from './analyst-session.service';

const DAY = 24 * 60 * 60 * 1000;

function session(expiresAt: string): AnalystSession {
  return { code: 'ABCDEFGH', studentId: 's1', studentName: 'Maya', grade: '3', expiresAt };
}

describe('AnalystSessionService', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => sessionStorage.clear());

  it('saves the session to sessionStorage and returns it', () => {
    const service = TestBed.inject(AnalystSessionService);
    const s = session(new Date(Date.now() + 30 * DAY).toISOString());

    service.save(s);

    expect(service.get()).toEqual(s);
    expect(service.isActive()).toBe(true);
    expect(JSON.parse(sessionStorage.getItem(ANALYST_SESSION_KEY)!)).toEqual(s);
  });

  it('reads a session saved earlier in the tab', () => {
    const s = session(new Date(Date.now() + DAY).toISOString());
    sessionStorage.setItem(ANALYST_SESSION_KEY, JSON.stringify(s));

    expect(TestBed.inject(AnalystSessionService).get()).toEqual(s);
  });

  it('treats an expired session as missing and clears it', () => {
    const service = TestBed.inject(AnalystSessionService);
    service.save(session(new Date(Date.now() - 1000).toISOString()));

    expect(service.session()).toBeNull();
    expect(service.get()).toBeNull();
    expect(service.isActive()).toBe(false);
    expect(sessionStorage.getItem(ANALYST_SESSION_KEY)).toBeNull();
  });

  it('expires once the clock passes expiresAt', () => {
    const service = TestBed.inject(AnalystSessionService);
    const expires = Date.now() + DAY;
    service.save(session(new Date(expires).toISOString()));

    expect(service.isActive(expires - 1)).toBe(true);
    expect(service.isActive(expires + 1)).toBe(false);
  });

  it('clear() removes the session from memory and storage', () => {
    const service = TestBed.inject(AnalystSessionService);
    service.save(session(new Date(Date.now() + DAY).toISOString()));

    service.clear();

    expect(service.get()).toBeNull();
    expect(sessionStorage.getItem(ANALYST_SESSION_KEY)).toBeNull();
  });

  it('ignores unreadable stored data', () => {
    sessionStorage.setItem(ANALYST_SESSION_KEY, '{not json');
    expect(TestBed.inject(AnalystSessionService).get()).toBeNull();
  });

  it('keeps working in memory when storage throws', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const service = TestBed.inject(AnalystSessionService);
    const s = session(new Date(Date.now() + DAY).toISOString());

    expect(() => service.save(s)).not.toThrow();
    expect(service.get()).toEqual(s);
    setItem.mockRestore();
  });
});
