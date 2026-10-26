import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, concat, EMPTY, firstValueFrom, of, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

/* ---------------- Types (mirror /api/study-guides) ---------------- */

export interface StudyMethod {
  title: string;
  summary: string;
  steps: Array<{ name: string; detail: string }>;
}

export interface StudyGuide {
  id: string;
  title: string;
  topicIds: string[];
  forKids: string;
  forParents: string;
  keyIdeas: string[];
  tricks: Array<{ name: string; how: string; example: string }>;
  workedExamples: Array<{ question: string; steps: string[]; answer: string }>;
  // expr / verify also come back but are for backend tests only.
  sampleQuestions: Array<{ question: string; answer: string; hint: string }>;
  commonMistakes: string[];
  practiceTogether: string[];
}

export interface TopicStudyGuideResponse {
  topic: { topicId: string; name: string; grade: number; level: string };
  guide: StudyGuide & { method: StudyMethod };
}

export interface StudyGuideIndexResponse {
  method: StudyMethod;
  guides: Array<{ id: string; title: string; topicIds: string[] }>;
}

export class StudyGuideError extends Error {
  constructor(
    readonly code: 'NOT_FOUND' | 'NETWORK' | 'UNKNOWN',
    message: string,
  ) {
    super(message);
  }
}

/** Per-topic reading state, kept on this device only. */
export interface StudyGuideProgress {
  lastSection?: string;
  tryIt?: {
    index: number;
    inputs: Record<number, string>;
    outcomes: Record<number, 'correct' | 'got-it' | 'not-yet'>;
  };
}

/** Guides change rarely: serve from cache for a day, then show the cached copy while refetching. */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_PREFIX = 'mindsprint.studyGuide.cache';
const PROGRESS_PREFIX = 'mindsprint.studyGuide.progress';
const PREF_PREFIX = 'mindsprint.studyGuide.pref';

interface CacheEntry<T> {
  savedAt: number;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class StudyGuideService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = `${environment.apiUrl}/study-guides`;
  private readonly memory = new Map<string, CacheEntry<unknown>>();

  /**
   * Emits the cached guide straight away if there is one, then (only if the cache is older than a day
   * or missing) the fresh copy from the server. A failed refresh is ignored when a cached copy was shown.
   */
  topicGuide(topicId: string): Observable<TopicStudyGuideResponse> {
    return this.cached(`topic.${topicId.toLowerCase()}`, () =>
      this.http.get<TopicStudyGuideResponse>(`${this.apiBase}/topic/${encodeURIComponent(topicId)}`),
    );
  }

  index(): Observable<StudyGuideIndexResponse> {
    return this.cached('index', () => this.http.get<StudyGuideIndexResponse>(this.apiBase));
  }

  /** Force a network fetch, e.g. for "Try again". */
  async refreshTopicGuide(topicId: string): Promise<TopicStudyGuideResponse> {
    this.forget(`topic.${topicId.toLowerCase()}`);
    return firstValueFrom(this.topicGuide(topicId));
  }

  /* ---------------- Progress & preferences (localStorage) ---------------- */

  loadProgress(topicId: string): StudyGuideProgress {
    return this.read<StudyGuideProgress>(`${PROGRESS_PREFIX}.${topicId.toLowerCase()}`) ?? {};
  }

  saveProgress(topicId: string, progress: StudyGuideProgress): void {
    this.write(`${PROGRESS_PREFIX}.${topicId.toLowerCase()}`, progress);
  }

  getPref(name: 'parentOpen' | 'methodHidden'): boolean {
    return this.read<boolean>(`${PREF_PREFIX}.${name}`) === true;
  }

  setPref(name: 'parentOpen' | 'methodHidden', value: boolean): void {
    this.write(`${PREF_PREFIX}.${name}`, value);
  }

  /* ---------------- Cache helpers ---------------- */

  private cached<T>(key: string, fetch: () => Observable<T>): Observable<T> {
    const entry =
      (this.memory.get(key) as CacheEntry<T> | undefined) ?? this.read<CacheEntry<T>>(`${CACHE_PREFIX}.${key}`);
    const fresh$ = fetch().pipe(
      tap((data) => this.store(key, data)),
      catchError((err) => throwError(() => this.toError(err))),
    );

    if (!entry) return fresh$;
    if (Date.now() - entry.savedAt < CACHE_TTL_MS) return of(entry.data);

    // Stale: show the cached copy now, refresh quietly.
    return concat(of(entry.data), fresh$.pipe(catchError(() => EMPTY)));
  }

  private store<T>(key: string, data: T): void {
    const entry: CacheEntry<T> = { savedAt: Date.now(), data };
    this.memory.set(key, entry);
    this.write(`${CACHE_PREFIX}.${key}`, entry);
  }

  private forget(key: string): void {
    this.memory.delete(key);
    try {
      window.localStorage.removeItem(`${CACHE_PREFIX}.${key}`);
    } catch {
      // ignore
    }
  }

  private toError(err: unknown): StudyGuideError {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 404 || err.error?.error?.code === 'NOT_FOUND') {
        return new StudyGuideError('NOT_FOUND', "There isn't a study guide for this topic yet.");
      }
      if (err.status === 0) {
        return new StudyGuideError('NETWORK', "We couldn't reach MindSprint. Check your internet and try again.");
      }
    }
    return new StudyGuideError('UNKNOWN', 'Something went wrong while loading the guide.');
  }

  private read<T>(key: string): T | null {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  private write(key: string, value: unknown): void {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or blocked: everything still works for this visit.
    }
  }
}
