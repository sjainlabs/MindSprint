import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { triggerConfetti } from '../shared/utils/confetti';
import {
  ChestOpened,
  LEVELS,
  Rarity,
  RewardSummary,
  RewardsError,
  RewardsService,
  STAR_RULES,
  STREAK_BADGES,
  dayLabel,
  rarityFor,
} from '../services/rewards.service';

/** The chest shakes at least this long while the server opens it. */
const SHAKE_MS = 700;
const RARITY_LABELS: Record<Rarity, string> = { common: 'Common', rare: 'Rare', trophy: 'Trophy' };

interface Slot {
  milestone: number;
  rarity: Rarity;
  name?: string;
  state: 'collected' | 'ready' | 'locked';
}

/** Level, stars, streak calendar, treasure chests and the collection. */
@Component({
  selector: 'app-rewards-page',
  standalone: true,
  templateUrl: './rewards-page.component.html',
  styleUrls: ['../tests/test-pages.css', './rewards.css', './rewards-page.component.css'],
})
export class RewardsPageComponent implements OnInit {
  private readonly rewards = inject(RewardsService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly starRules = STAR_RULES;
  readonly levels = LEVELS;
  readonly dayLabel = dayLabel;
  readonly rarityLabels = RARITY_LABELS;

  readonly summary = this.rewards.summary;
  readonly loading = signal(true);
  readonly error = signal('');
  readonly infoOpen = signal(false);

  readonly chestState = signal<'idle' | 'shaking' | 'open'>('idle');
  readonly opened = signal<ChestOpened | null>(null);

  readonly badges = computed(() => {
    const earned = new Map((this.summary()?.streak.badges ?? []).map((b) => [b.days, b.earnedOn]));
    return STREAK_BADGES.map((b) => ({ ...b, earnedOn: earned.get(b.days) ?? null }));
  });

  /** Collected, ready-to-open and locked slots up to the next trophy (at least ten). */
  readonly slots = computed<Slot[]>(() => {
    const s = this.summary();
    if (!s) return [];
    const collected = new Map(s.collectibles.map((c) => [c.milestone, c]));
    const ready = new Set(s.chests.unclaimed);
    const last = Math.max(10, Math.ceil((s.chests.earned + 1) / 10) * 10);
    return Array.from({ length: last }, (_, i) => {
      const milestone = i + 1;
      const item = collected.get(milestone);
      if (item) return { milestone, rarity: item.rarity, name: item.name, state: 'collected' };
      return { milestone, rarity: rarityFor(milestone), state: ready.has(milestone) ? 'ready' : 'locked' };
    });
  });

  private studentId = '';

  ngOnInit(): void {
    this.studentId = this.auth.getStoredStudentId() ?? '';
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(!this.summary());
    this.error.set('');
    const summary = await this.rewards.load();
    if (!summary) this.error.set("We couldn't load your rewards. Check your connection and try again.");
    this.loading.set(false);
    if (summary?.chests.unclaimed.length && this.route.snapshot.queryParamMap.get('open') === 'chest') void this.openChest();
  }

  async openChest(): Promise<void> {
    if (this.chestState() === 'shaking') return;
    this.opened.set(null);
    this.chestState.set('shaking');
    const shake = new Promise((resolve) => setTimeout(resolve, SHAKE_MS));
    try {
      const [opened] = await Promise.all([this.rewards.openChest(this.studentId), shake]);
      this.opened.set(opened);
      this.chestState.set('open');
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) triggerConfetti(1500);
    } catch (err) {
      this.chestState.set('idle');
      this.rewards.toast((err as RewardsError).message, 'error');
      void this.rewards.load();
    }
  }

  closeChest(): void {
    this.chestState.set('idle');
    this.opened.set(null);
  }

  calendarLabel(day: RewardSummary['calendar'][number]): string {
    const when = dayLabel(day.date);
    return day.active ? `${when}: ${day.questions} questions, ${day.stars} stars` : `${when}: no practice`;
  }

  dayNumber(date: string): number {
    return Number(date.slice(8, 10));
  }
}
