import { Injectable, computed, signal } from '@angular/core';

export const ANALYST_SESSION_KEY = 'ms-analyst-session';

export interface AnalystSession {
  code: string;
  studentId: string;
  studentName: string;
  grade: string;
  /** ISO timestamp; the session is unusable after it. */
  expiresAt: string;
}

/**
 * The analyst's access, kept for this browser tab only (sessionStorage). Storage can be missing or
 * blocked, so the session also lives in memory and every storage call is guarded.
 */
@Injectable({ providedIn: 'root' })
export class AnalystSessionService {
  private readonly current = signal<AnalystSession | null>(readStored());

  /** The saved session, or null when there is none or it has expired. */
  readonly session = computed(() => {
    const s = this.current();
    return s && !isExpired(s) ? s : null;
  });

  /** Reads the session again (the clock may have passed its expiry); clears an expired one. */
  get(now = Date.now()): AnalystSession | null {
    const s = this.current();
    if (!s) return null;
    if (isExpired(s, now)) {
      this.clear();
      return null;
    }
    return s;
  }

  isActive(now = Date.now()): boolean {
    return this.get(now) !== null;
  }

  save(session: AnalystSession): void {
    this.current.set(session);
    try {
      sessionStorage.setItem(ANALYST_SESSION_KEY, JSON.stringify(session));
    } catch {
      // Kept in memory only; a reload asks for the code again.
    }
  }

  clear(): void {
    this.current.set(null);
    try {
      sessionStorage.removeItem(ANALYST_SESSION_KEY);
    } catch {
      // Nothing stored.
    }
  }
}

function isExpired(s: AnalystSession, now = Date.now()): boolean {
  const expires = Date.parse(s.expiresAt);
  return Number.isNaN(expires) || expires <= now;
}

function readStored(): AnalystSession | null {
  try {
    const raw = sessionStorage.getItem(ANALYST_SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Partial<AnalystSession>;
    return s && typeof s.code === 'string' && typeof s.studentId === 'string' && typeof s.expiresAt === 'string'
      ? { code: s.code, studentId: s.studentId, studentName: s.studentName ?? '', grade: s.grade ?? '', expiresAt: s.expiresAt }
      : null;
  } catch {
    return null;
  }
}
