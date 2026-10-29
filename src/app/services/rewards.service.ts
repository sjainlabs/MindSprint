import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NavigationEnd, Router } from '@angular/router';
import { Observable, filter, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { TestApiError, toTestApiError } from './test-api-error';

// ─── Types (mirror the backend's src/api/rewards) ──────────────────────────

export type Rarity = 'common' | 'rare' | 'trophy';

export interface Collectible {
  id: string;
  name: string;
  rarity: Rarity;
}

export interface RewardSummary {
  stars: { total: number; available: number; spent: number; today: number; thisWeek: number };
  questions: { total: number; correct: number; today: number };
  streak: {
    current: number;
    longest: number;
    activeToday: boolean;
    /** Alive from yesterday, nothing yet today */
    atRisk: boolean;
    nextMilestone: { days: number; stars: number; daysToGo: number } | null;
    badges: Array<{ days: number; earnedOn: string }>;
  };
  chests: {
    questionsPerChest: number;
    earned: number;
    claimed: number;
    /** Chest numbers ready to open */
    unclaimed: number[];
    questionsToNext: number;
    progressPercent: number;
    nextCollectible: Collectible;
  };
  level: { number: number; name: string; stars: number; next: { name: string; stars: number; starsToGo: number } | null; progressPercent: number };
  collectibles: Array<Collectible & { milestone: number; claimedAt: string }>;
  /** Last 28 days, oldest first */
  calendar: Array<{ date: string; active: boolean; questions: number; stars: number }>;
  /** Latest 10 */
  recentStars: Array<{ date: string; stars: number; reason: string }>;
  messages: Array<{ kind: 'chest' | 'streak' | 'level' | 'stars'; text: string }>;
}

export interface ChestOpened {
  milestone: number;
  collectible: Collectible;
  bonusStars: number;
  rewards: RewardSummary;
}

export interface ShopItem {
  id: string;
  title: string;
  starCost: number;
}

export type RedemptionStatus = 'requested' | 'fulfilled' | 'declined';

export interface Redemption {
  id: string;
  rewardId: string;
  title: string;
  starCost: number;
  status: RedemptionStatus;
  requestedAt: string;
  decidedAt: string | null;
}

export interface RewardShop {
  availableStars: number;
  items: Array<ShopItem & { affordable: boolean }>;
  /** Starter ideas, only while the shop is empty */
  suggested: Array<{ title: string; starCost: number }>;
  redemptions: Redemption[];
}

export type RewardsErrorCode = 'NO_CHEST' | 'NOT_ENOUGH_STARS' | 'NOT_FOUND' | 'ALREADY_DECIDED' | 'INVALID_REQUEST' | 'PERSISTENCE_FAILED';
export { TestApiError as RewardsError };

/** A moment to celebrate, found by comparing the summary before and after a submit. */
export type Celebration =
  | { kind: 'level'; name: string; number: number }
  | { kind: 'chest'; count: number }
  | { kind: 'badge'; days: number; stars: number }
  | { kind: 'stars'; stars: number };

export interface RewardsToast {
  id: number;
  text: string;
  kind: 'stars' | 'error' | 'info';
}

// ─── Rules, for the info sheet and badge shelf ─────────────────────────────

export const STAR_RULES = [
  { stars: '1', text: 'for each correct answer' },
  { stars: '3', text: 'for a sheet at 90% or more' },
  { stars: '5', text: 'for a perfect sheet' },
  { stars: '10', text: 'for passing a topic test' },
  { stars: '10', text: 'for finishing a review test' },
  { stars: '5', text: 'for reaching the daily challenge goal' },
  { stars: '20', text: 'for each treasure chest' },
];

export const STREAK_BADGES = [
  { days: 3, stars: 10 },
  { days: 7, stars: 25 },
  { days: 14, stars: 50 },
  { days: 30, stars: 100 },
  { days: 60, stars: 200 },
  { days: 100, stars: 300 },
];

export const LEVELS = [
  { name: 'Starter', stars: 0 },
  { name: 'Explorer', stars: 100 },
  { name: 'Solver', stars: 300 },
  { name: 'Thinker', stars: 600 },
  { name: 'Champion', stars: 1000 },
  { name: 'Master', stars: 2000 },
  { name: 'Legend', stars: 4000 },
  { name: 'Grand Legend', stars: 8000 },
];

export const SHOP_LIMITS = { maxItems: 20, titleMax: 60, minCost: 10, maxCost: 10_000 };

/** Same rule as the backend's collectibleFor: every 10th chest is a trophy, every 6th creature is rare. */
export function rarityFor(milestone: number): Rarity {
  if (milestone % 10 === 0) return 'trophy';
  return (milestone - 1 - Math.floor(milestone / 10)) % 6 === 5 ? 'rare' : 'common';
}

/** "Today", "Yesterday" or "Mon 12 Oct" for a YYYY-MM-DD day. */
export function dayLabel(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - date.getTime()) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

/** The device's offset from UTC in minutes (India is 330). */
export function tzOffsetMinutes(): number {
  return -new Date().getTimezoneOffset();
}

/** What changed between two summaries, biggest moment first. */
export function celebrationsBetween(before: RewardSummary, after: RewardSummary): Celebration[] {
  const found: Celebration[] = [];
  if (after.level.number > before.level.number) found.push({ kind: 'level', name: after.level.name, number: after.level.number });
  if (after.chests.unclaimed.length > before.chests.unclaimed.length) found.push({ kind: 'chest', count: after.chests.unclaimed.length });
  const had = new Set(before.streak.badges.map((b) => b.days));
  for (const badge of after.streak.badges) {
    if (!had.has(badge.days)) found.push({ kind: 'badge', days: badge.days, stars: STREAK_BADGES.find((s) => s.days === badge.days)?.stars ?? 0 });
  }
  return found;
}

/** POSTs that change the summary: every submit, daily challenge answers and Math Brain practice. */
const EARNING_REQUEST = /\/(submit|assessment\/answer|math-brain\/flashcards\/review|math-brain\/abacus\/answer)$/;
/** Many answers in a row (daily challenge, flash cards) cause one refresh. */
const REFRESH_DELAY_MS = 1200;
const TOAST_MS = 2600;

@Injectable({ providedIn: 'root' })
export class RewardsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly apiBase = `${environment.apiUrl}/rewards`;

  private readonly state = signal<{ studentId: string; summary: RewardSummary } | null>(null);
  /** The summary when the current page opened, for "+N stars earned" on its results. */
  private readonly baseline = signal<RewardSummary | null>(null);
  private readonly submitRefreshes = signal(0);
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private loading: Promise<RewardSummary | null> | null = null;
  private toastId = 0;

  readonly summary = computed(() => this.state()?.summary ?? null);
  /** Popups waiting to show, one at a time. */
  readonly celebrations = signal<Celebration[]>([]);
  readonly toasts = signal<RewardsToast[]>([]);

  /** Stars earned and chest progress since this page opened; null until a submit here has been counted. */
  readonly pageGain = computed(() => {
    const now = this.summary();
    const before = this.baseline();
    if (!now || !before || this.submitRefreshes() === 0) return null;
    return { stars: Math.max(0, now.stars.total - before.stars.total), chests: now.chests };
  });

  constructor() {
    inject(Router)
      .events.pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => {
        this.baseline.set(this.summary());
        this.submitRefreshes.set(0);
        if (!this.summary()) void this.load();
      });
  }

  /** Called by the HTTP interceptor after every successful POST. */
  noticeRequest(method: string, url: string): void {
    if (method !== 'POST' || !EARNING_REQUEST.test(url.split('?')[0])) return;
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      void this.load({ afterSubmit: true });
    }, REFRESH_DELAY_MS);
  }

  /** Loads the logged-in kid's summary (or another student's for parents) and queues any celebrations. */
  load(options: { studentId?: string; afterSubmit?: boolean } = {}): Promise<RewardSummary | null> {
    const studentId = options.studentId ?? this.auth.getStoredStudentId();
    if (!studentId) return Promise.resolve(null);
    if (this.loading && !options.afterSubmit) return this.loading;
    const request = this.call(
      this.http.get<RewardSummary>(`${this.apiBase}/${encodeURIComponent(studentId)}`, { params: { tzOffsetMinutes: tzOffsetMinutes() } }),
    )
      .then((summary) => {
        this.apply(studentId, summary, { celebrate: true });
        if (options.afterSubmit) this.submitRefreshes.update((n) => n + 1);
        return summary;
      })
      // Rewards never get in the way of learning: a failed refresh keeps the last summary.
      .catch(() => this.summary())
      .finally(() => {
        if (this.loading === request) this.loading = null;
      });
    this.loading = request;
    return request;
  }

  /** Opens the oldest unopened chest. The chest screen does its own celebrating, so only level-ups and badges queue. */
  async openChest(studentId: string): Promise<ChestOpened> {
    const opened = await this.call(this.http.post<ChestOpened>(`${this.apiBase}/chests/open`, { studentId, tzOffsetMinutes: tzOffsetMinutes() }));
    this.apply(studentId, opened.rewards, { celebrate: true, skipStars: true });
    // The new stars came from the chest, not from this page's work.
    const base = this.baseline();
    if (base) this.baseline.set({ ...base, stars: { ...base.stars, total: base.stars.total + opened.bonusStars } });
    return opened;
  }

  shop(studentId: string): Promise<RewardShop> {
    return this.call(this.http.get<RewardShop>(`${this.apiBase}/${encodeURIComponent(studentId)}/shop`));
  }

  saveShop(studentId: string, items: Array<Partial<ShopItem>>): Promise<RewardShop> {
    return this.call(this.http.put<RewardShop>(`${this.apiBase}/${encodeURIComponent(studentId)}/shop`, { items }));
  }

  async redeem(studentId: string, rewardId: string): Promise<{ redemption: Redemption; availableStars: number }> {
    const result = await this.call(
      this.http.post<{ redemption: Redemption; availableStars: number }>(`${this.apiBase}/shop/redeem`, { studentId, rewardId }),
    );
    this.patchAvailable(studentId, result.availableStars);
    return result;
  }

  decide(studentId: string, redemptionId: string, status: 'fulfilled' | 'declined'): Promise<{ redemption: Redemption }> {
    return this.call(
      this.http.post<{ redemption: Redemption }>(`${this.apiBase}/redemptions/${encodeURIComponent(redemptionId)}/decision`, { studentId, status }),
    );
  }

  dismissCelebration(): void {
    this.celebrations.update((list) => list.slice(1));
  }

  toast(text: string, kind: RewardsToast['kind'] = 'info'): void {
    const id = ++this.toastId;
    this.toasts.update((list) => [...list.slice(-2), { id, text, kind }]);
    setTimeout(() => this.dismissToast(id), TOAST_MS);
  }

  dismissToast(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  private apply(studentId: string, next: RewardSummary, options: { celebrate: boolean; skipStars?: boolean }): void {
    const prev = this.state();
    this.state.set({ studentId, summary: next });
    if (!prev || prev.studentId !== studentId) {
      // First look, or a different kid: nothing to compare with.
      this.baseline.set(next);
      return;
    }
    if (!this.baseline()) this.baseline.set(prev.summary);
    if (!options.celebrate || studentId !== this.auth.getStoredStudentId()) return;
    const popups = celebrationsBetween(prev.summary, next);
    if (popups.length) this.celebrations.update((list) => [...list, ...popups]);
    const gained = next.stars.total - prev.summary.stars.total;
    if (gained > 0 && !options.skipStars) this.toast(`+${gained} ⭐`, 'stars');
  }

  private patchAvailable(studentId: string, available: number): void {
    const current = this.state();
    if (current?.studentId !== studentId) return;
    const stars = current.summary.stars;
    this.state.set({ studentId, summary: { ...current.summary, stars: { ...stars, available, spent: stars.spent + (stars.available - available) } } });
  }

  private async call<T>(request: Observable<T>): Promise<T> {
    try {
      return await firstValueFrom(request);
    } catch (err) {
      throw toTestApiError<RewardsErrorCode>(err);
    }
  }
}
