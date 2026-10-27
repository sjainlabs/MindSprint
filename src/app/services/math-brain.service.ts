import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { TestApiError, toTestApiError } from './test-api-error';

/* ---------------- Types (mirror /api/math-brain) ---------------- */

export interface Trick {
  name: string;
  how: string;
  example: string;
}

export interface TableRow {
  multiplier: number;
  product: number;
  text: string;
}

export interface TimesTable {
  table: number;
  rows: TableRow[];
  tricks: Trick[];
}

export type ReferenceType = 'squares' | 'cubes' | 'square-roots' | 'cube-roots';
export type Deck = 'tables' | ReferenceType;

export interface ReferenceList {
  title: string;
  intro: string;
  tricks: Trick[];
  rows: Array<{ number: number; value: number | string; text: string }>;
}

export interface FlashCard {
  cardId: string;
  front: string;
  back: string;
  hint: string | null;
  table?: number;
  box: number;
  isNew: boolean;
}

export interface FlashSummary {
  total: number;
  new: number;
  dueNow: number;
  learning: number;
  remembered: number;
  nextDueAt: string | null;
}

export interface FlashDeckResponse {
  cards: FlashCard[];
  summary: FlashSummary;
}

export interface ReviewResult {
  cardId: string;
  box: number;
  dueAt: string;
  remembered: boolean;
}

export interface TableRange {
  from: number;
  to: number;
  upTo: number;
}

export type AbacusOperation = 'random' | 'add-subtract' | 'multiplication' | 'division';
export type AbacusFamily = Exclude<AbacusOperation, 'random'>;

export interface AbacusRound {
  roundId: string;
  family: AbacusFamily;
  level: number;
  numbers: number[];
  /** One string per number, e.g. ["5", "−3", "+8"] or ["23", "× 4"]. */
  display: string[];
  expression: string;
  flashMs: number;
  targetSeconds: number;
  /** Set when the child picked a practice level. */
  chosenLevel: number | null;
}

export interface AbacusRoundResponse {
  grade: number;
  availableOperations: AbacusOperation[];
  round: AbacusRound;
}

export interface AbacusStats {
  rounds: number;
  correct: number;
  accuracy: number | null;
  averageSeconds: number | null;
  bestLevel: number;
}

export interface AbacusAnswerResponse {
  correct: boolean;
  slow: boolean;
  expectedAnswer: number | string;
  timeTakenSeconds: number;
  family: AbacusFamily;
  levelChange: -1 | 0 | 1;
  level: number;
  stats: AbacusStats;
  next: AbacusRound;
}

export interface AbacusFamilyStatus {
  family: AbacusFamily;
  unlocked: boolean;
  unlocksAtGrade: number | null;
  level: number;
  startingLevel: number;
  startingLevelReasons: string[];
  rounds: number;
  accuracy: number | null;
  averageSeconds: number | null;
  bestLevel: number;
}

export interface AbacusStatus {
  families: AbacusFamilyStatus[];
  pendingRound: AbacusRound | null;
}

/** "Practise with Math Brain" links on a study guide. */
export interface MathBrainLink {
  id: string;
  path: string;
  flashcardDeck: Deck | null;
}

export type MathBrainErrorCode = 'GRADE_REQUIRED' | 'NOT_UNLOCKED' | 'STALE_ROUND' | 'NOT_FOUND' | 'INVALID_REQUEST';
export { TestApiError as MathBrainError };

export const DECKS: Array<{ id: Deck; label: string; emoji: string }> = [
  { id: 'tables', label: 'Times tables', emoji: '✖️' },
  { id: 'squares', label: 'Squares', emoji: '⬛' },
  { id: 'cubes', label: 'Cubes', emoji: '🧊' },
  { id: 'square-roots', label: 'Square roots', emoji: '√' },
  { id: 'cube-roots', label: 'Cube roots', emoji: '∛' },
];

export const OPERATIONS: Array<{ id: AbacusOperation; label: string; emoji: string }> = [
  { id: 'random', label: 'Random', emoji: '🎲' },
  { id: 'add-subtract', label: 'Add & subtract', emoji: '➕' },
  { id: 'multiplication', label: 'Multiply', emoji: '✖️' },
  { id: 'division', label: 'Divide', emoji: '➗' },
];

export function familyLabel(family: string): string {
  return OPERATIONS.find((o) => o.id === family)?.label ?? family;
}

@Injectable({ providedIn: 'root' })
export class MathBrainService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = `${environment.apiUrl}/math-brain`;
  /** Tables and fact lists never change during a visit. */
  private readonly memo = new Map<string, Promise<unknown>>();

  tables(upTo: number, from = 2, to = 20): Promise<TimesTable[]> {
    return this.cached(`tables.${from}.${to}.${upTo}`, async () => {
      const res = await this.call(
        this.http.get<{ tables: TimesTable[] }>(`${this.apiBase}/tables`, { params: { from, to, upTo } }),
      );
      return res.tables;
    });
  }

  reference(type: ReferenceType): Promise<ReferenceList> {
    return this.cached(`reference.${type}`, () =>
      this.call(this.http.get<ReferenceList>(`${this.apiBase}/reference/${type}`)),
    );
  }

  flashcards(deck: Deck, studentId: string | null, range?: TableRange, limit = 20): Promise<FlashDeckResponse> {
    const params: Record<string, string | number> = { deck, limit };
    if (studentId) params['studentId'] = studentId;
    if (deck === 'tables' && range) Object.assign(params, range);
    return this.call(this.http.get<FlashDeckResponse>(`${this.apiBase}/flashcards`, { params }));
  }

  review(studentId: string, results: Array<{ cardId: string; knew: boolean }>): Promise<ReviewResult[]> {
    return this.call(
      this.http.post<{ cards: ReviewResult[] }>(`${this.apiBase}/flashcards/review`, { studentId, results }),
    ).then((r) => r.cards);
  }

  abacusRound(
    studentId: string,
    options: { operation?: AbacusOperation; level?: number; grade?: string } = {},
  ): Promise<AbacusRoundResponse> {
    const body: Record<string, unknown> = { studentId };
    if (options.operation) body['operation'] = options.operation;
    if (options.level !== undefined) body['level'] = options.level;
    if (options.grade !== undefined) body['grade'] = options.grade;
    return this.call(this.http.post<AbacusRoundResponse>(`${this.apiBase}/abacus/round`, body));
  }

  abacusAnswer(studentId: string, roundId: string, answer: string, timeTakenMs: number): Promise<AbacusAnswerResponse> {
    return this.call(
      this.http.post<AbacusAnswerResponse>(`${this.apiBase}/abacus/answer`, {
        studentId,
        roundId,
        answer,
        timeTakenMs: Math.max(0, Math.round(timeTakenMs)),
      }),
    );
  }

  abacusStatus(studentId: string): Promise<AbacusStatus> {
    return this.call(this.http.get<AbacusStatus>(`${this.apiBase}/abacus/status/${encodeURIComponent(studentId)}`));
  }

  private cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    let p = this.memo.get(key) as Promise<T> | undefined;
    if (!p) {
      p = load();
      this.memo.set(key, p);
      // Don't keep failures, so "Try again" really retries.
      p.catch(() => this.memo.delete(key));
    }
    return p;
  }

  private async call<T>(request: Observable<T>): Promise<T> {
    try {
      return await firstValueFrom(request);
    } catch (err) {
      throw toTestApiError<MathBrainErrorCode>(err);
    }
  }
}

/** "in 5 minutes", "tomorrow at 4:30 pm", "on Fri 31 Oct": when the next cards are due. */
export function comeBackText(iso: string | null, now = new Date()): string {
  if (!iso) return 'later';
  const due = new Date(iso);
  const mins = Math.round((due.getTime() - now.getTime()) / 60000);
  if (mins <= 1) return 'in a minute';
  if (mins < 60) return `in ${mins} minutes`;
  const time = due.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const dayDiff = Math.round(
    (new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime() -
      new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
      86400000,
  );
  if (dayDiff === 0) return `today at ${time}`;
  if (dayDiff === 1) return `tomorrow at ${time}`;
  return `on ${due.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}`;
}

export interface MathBrainTarget {
  label: string;
  commands: string[];
  queryParams: Record<string, string | number>;
}

/**
 * Where a study guide's "Practise with Math Brain" button goes: the flash card deck when it has one,
 * otherwise the matching facts page or the abacus. Table ranges are read from the link's path query.
 */
export function mathBrainTarget(link: MathBrainLink): MathBrainTarget {
  const path = link.path ?? '';
  let query = new URLSearchParams();
  try {
    query = new URL(path, 'https://x.invalid').searchParams;
  } catch {
    // not a URL; use the id alone
  }
  const range: Record<string, number> = {};
  for (const k of ['from', 'to', 'upTo']) if (query.get(k)) range[k] = Number(query.get(k));
  if (query.get('table')) range['from'] = range['to'] = Number(query.get('table'));
  const tableLabel = range['from'] && range['from'] === range['to'] ? `${range['from']} times table` : null;

  if (link.flashcardDeck) {
    const deck = DECKS.find((d) => d.id === link.flashcardDeck);
    return {
      label: `${tableLabel ?? deck?.label ?? 'Flash cards'} flash cards`,
      commands: ['/math-brain/cards'],
      queryParams: { deck: link.flashcardDeck, ...(link.flashcardDeck === 'tables' ? range : {}) },
    };
  }
  if (/abacus/i.test(path) || /abacus/i.test(link.id)) {
    return { label: 'Abacus', commands: ['/math-games/abacus'], queryParams: {} };
  }
  const reference = (['square-roots', 'cube-roots', 'squares', 'cubes'] as const).find((t) => path.includes(t) || link.id.includes(t));
  if (reference) {
    return { label: DECKS.find((d) => d.id === reference)!.label, commands: ['/math-brain/facts'], queryParams: { section: reference } };
  }
  return {
    label: tableLabel ?? 'Times tables',
    commands: ['/math-brain/facts'],
    queryParams: { section: 'tables', ...(range['from'] === range['to'] && range['from'] ? { table: range['from'] } : {}) },
  };
}
