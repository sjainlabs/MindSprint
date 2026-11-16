import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ActivityItem, ActivityKind, LearningApiService } from '../services/learning-api.service';
import { localDate } from '../services/daily-challenge.service';
import { HoursMinutesPipe, describeDuration } from '../shared/utils/duration';

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface KindInfo {
  kind: ActivityKind;
  label: string;
  /** Categorical colour, in a fixed order so a kind keeps its colour when others are hidden */
  color: string;
}

/** Fixed order and colours (validated categorical slots 1–5); filters never repaint the rest */
export const ACTIVITY_KINDS: KindInfo[] = [
  { kind: 'worksheet', label: 'Worksheets', color: '#2a78d6' },
  { kind: 'daily', label: 'Daily challenge', color: '#eb6834' },
  { kind: 'topic-test', label: 'Topic tests', color: '#1baf7a' },
  { kind: 'review-test', label: 'Scheduled review tests', color: '#eda100' },
  { kind: 'custom-test', label: 'Custom tests', color: '#e87ba4' },
];

const PERIODS: Array<{ id: Period; label: string; span: string }> = [
  { id: 'daily', label: 'Daily', span: 'last 14 days' },
  { id: 'weekly', label: 'Weekly', span: 'last 12 weeks' },
  { id: 'monthly', label: 'Monthly', span: 'last 12 months' },
  { id: 'yearly', label: 'Yearly', span: 'every year' },
];

export interface Bucket {
  key: string;
  /** Full name for the table and tooltip, e.g. "Week of Nov 10" */
  label: string;
  /** Short axis label */
  tick: string;
  seconds: Record<ActivityKind, number>;
  sessions: number;
  total: number;
}

const DAY_MS = 86_400_000;

/** The kid's calendar day for an item: the daily challenge already has one; sheets use the local day they were submitted. */
export const itemDay = (item: ActivityItem): Date | null => {
  if (item.date) {
    const [y, m, d] = item.date.split('-').map(Number);
    return y && m && d ? new Date(y, m - 1, d) : null;
  }
  const at = item.at ? new Date(item.at) : null;
  return at && !Number.isNaN(at.getTime()) ? new Date(at.getFullYear(), at.getMonth(), at.getDate()) : null;
};

const mondayOf = (day: Date): Date => {
  const monday = new Date(day);
  monday.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  return monday;
};

const emptySeconds = (): Record<ActivityKind, number> =>
  Object.fromEntries(ACTIVITY_KINDS.map((k) => [k.kind, 0])) as Record<ActivityKind, number>;

/** Oldest first: the last 14 days, 12 weeks or 12 months, or every year since the first activity. */
export function bucketActivity(items: ActivityItem[], period: Period, today = new Date()): Bucket[] {
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const short = (d: Date, opts: Intl.DateTimeFormatOptions) => d.toLocaleDateString(undefined, opts);
  let buckets: Array<Omit<Bucket, 'seconds' | 'sessions' | 'total'>> = [];
  let keyOf: (d: Date) => string;

  if (period === 'daily') {
    keyOf = localDate;
    buckets = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(day.getTime() - (13 - i) * DAY_MS);
      return { key: localDate(d), label: short(d, { weekday: 'short', month: 'short', day: 'numeric' }), tick: short(d, { month: 'short', day: 'numeric' }) };
    });
  } else if (period === 'weekly') {
    keyOf = (d) => localDate(mondayOf(d));
    const thisWeek = mondayOf(day);
    buckets = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(thisWeek);
      d.setDate(thisWeek.getDate() - (11 - i) * 7);
      return { key: localDate(d), label: `Week of ${short(d, { month: 'short', day: 'numeric', year: 'numeric' })}`, tick: short(d, { month: 'short', day: 'numeric' }) };
    });
  } else if (period === 'monthly') {
    keyOf = (d) => `${d.getFullYear()}-${d.getMonth()}`;
    buckets = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(day.getFullYear(), day.getMonth() - (11 - i), 1);
      return { key: keyOf(d), label: short(d, { month: 'long', year: 'numeric' }), tick: short(d, { month: 'short' }) };
    });
  } else {
    keyOf = (d) => String(d.getFullYear());
    const years = items.map(itemDay).filter((d): d is Date => !!d).map((d) => d.getFullYear());
    const first = Math.min(day.getFullYear(), ...years);
    buckets = Array.from({ length: day.getFullYear() - first + 1 }, (_, i) => ({ key: String(first + i), label: String(first + i), tick: String(first + i) }));
  }

  const filled = new Map<string, Bucket>(buckets.map((b) => [b.key, { ...b, seconds: emptySeconds(), sessions: 0, total: 0 }]));
  for (const item of items) {
    const d = itemDay(item);
    const bucket = d ? filled.get(keyOf(d)) : undefined;
    if (!bucket) continue;
    bucket.seconds[item.kind] += item.seconds;
    bucket.sessions += 1;
    bucket.total += item.seconds;
  }
  return [...filled.values()];
}

const W_DEFAULT = 640;
const H = 240;
const PAD_L = 44;
const PAD_R = 8;
const TOP = 12;
const BOTTOM = H - 26;
/** Surface gap between stacked segments */
const GAP = 2;

/**
 * Active time: how long the kid spent on worksheets, each kind of test and the Daily Challenge,
 * by day, week, month or year. A stacked bar per period and the same numbers as a table.
 */
@Component({
  selector: 'app-activity-report-page',
  standalone: true,
  imports: [CommonModule, RouterLink, HoursMinutesPipe],
  templateUrl: './activity-report-page.component.html',
  styleUrls: ['../tests/test-pages.css', './activity-report-page.component.css'],
})
export class ActivityReportPageComponent implements OnInit {
  private readonly api = inject(LearningApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly kinds = ACTIVITY_KINDS;
  readonly periods = PERIODS;
  readonly describeDuration = describeDuration;
  readonly H = H;
  readonly PAD_L = PAD_L;
  readonly BOTTOM = BOTTOM;

  /** Parents open this with ?studentId=…; links back keep it. */
  readonly childId = this.route.snapshot.queryParamMap.get('studentId');
  readonly linkParams = this.childId ? { studentId: this.childId } : {};

  readonly loading = signal(true);
  readonly error = signal('');
  readonly items = signal<ActivityItem[]>([]);
  readonly maxSheetMinutes = signal(180);
  readonly period = signal<Period>('daily');
  readonly shown = signal<Set<ActivityKind>>(new Set(ACTIVITY_KINDS.map((k) => k.kind)));
  readonly hover = signal<number | null>(null);
  private readonly width = signal(W_DEFAULT);
  get W(): number {
    return this.width();
  }

  readonly visibleKinds = computed(() => this.kinds.filter((k) => this.shown().has(k.kind)));
  readonly periodSpan = computed(() => PERIODS.find((p) => p.id === this.period())!.span);

  /** Buckets with only the shown kinds counted in the totals */
  readonly buckets = computed<Bucket[]>(() => {
    const shown = this.shown();
    return bucketActivity(this.items().filter((i) => shown.has(i.kind)), this.period());
  });

  readonly totalSeconds = computed(() => this.buckets().reduce((a, b) => a + b.total, 0));
  readonly totalsByKind = computed(() =>
    Object.fromEntries(this.kinds.map((k) => [k.kind, this.buckets().reduce((a, b) => a + b.seconds[k.kind], 0)])) as Record<ActivityKind, number>,
  );
  readonly activeBuckets = computed(() => this.buckets().filter((b) => b.total > 0));
  readonly averageSeconds = computed(() => {
    const active = this.activeBuckets();
    return active.length ? this.totalSeconds() / active.length : null;
  });
  readonly busiest = computed(() => this.activeBuckets().reduce<Bucket | null>((best, b) => (!best || b.total > best.total ? b : best), null));
  readonly newestFirst = computed(() => [...this.buckets()].reverse());
  readonly periodNoun = computed(() => ({ daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' })[this.period()]);

  /** Minutes on the axis, or hours once the tallest bar passes 2 hours */
  readonly scale = computed(() => {
    const maxMinutes = Math.max(1, ...this.buckets().map((b) => b.total / 60));
    if (maxMinutes > 120) {
      const step = Math.max(1, Math.ceil(maxMinutes / 60 / 4));
      const max = step * 4 * 60;
      return { max, unit: 'h', ticks: [0, 1, 2, 3, 4].map((i) => i * step * 60) };
    }
    const step = [5, 10, 15, 30][[5, 10, 15, 30].findIndex((s) => s * 4 >= maxMinutes)] ?? 30;
    return { max: step * 4, unit: 'min', ticks: [0, 1, 2, 3, 4].map((i) => i * step) };
  });

  tickLabel(minutes: number): string {
    return this.scale().unit === 'h' ? `${minutes / 60}h` : `${minutes}`;
  }

  private get step(): number {
    return (this.W - PAD_L - PAD_R) / Math.max(1, this.buckets().length);
  }

  x(i: number): number {
    return PAD_L + this.step * (i + 0.5);
  }

  y(minutes: number): number {
    return BOTTOM - (Math.min(minutes, this.scale().max) / this.scale().max) * (BOTTOM - TOP);
  }

  barWidth(): number {
    return Math.max(4, Math.min(48, this.step * 0.62));
  }

  /** Stacked segments bottom-up in the fixed kind order; only the top one gets rounded corners. */
  segments(b: Bucket): Array<{ kind: ActivityKind; color: string; d: string }> {
    const w = this.barWidth();
    const x0 = this.x(this.buckets().indexOf(b)) - w / 2;
    const parts = this.visibleKinds().filter((k) => b.seconds[k.kind] > 0);
    let minutes = 0;
    return parts.map((k, n) => {
      const bottom = this.y(minutes) - (n > 0 ? GAP / 2 : 0);
      minutes += b.seconds[k.kind] / 60;
      const top = Math.min(bottom - 1, this.y(minutes) + (n < parts.length - 1 ? GAP / 2 : 0));
      const r = n === parts.length - 1 ? Math.min(4, w / 2, bottom - top) : 0;
      const d = `M${x0},${bottom} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x0 + w - r} Q${x0 + w},${top} ${x0 + w},${top + r} V${bottom} Z`;
      return { kind: k.kind, color: k.color, d };
    });
  }

  /** Axis labels thin out so they never collide */
  readonly xTicks = computed(() => {
    const n = this.buckets().length;
    const every = Math.max(1, Math.ceil(n / Math.max(1, Math.floor((this.W - PAD_L) / 64))));
    return this.buckets().map((b, i) => ({ b, i })).filter(({ i }) => (n - 1 - i) % every === 0);
  });

  private resizeObserver: ResizeObserver | null = null;

  @ViewChild('wrap') set wrap(el: ElementRef<HTMLElement> | undefined) {
    this.resizeObserver?.disconnect();
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const w = Math.round(el.nativeElement.clientWidth);
      if (w > 0 && w !== this.width()) this.width.set(w);
    };
    this.resizeObserver = new ResizeObserver(measure);
    this.resizeObserver.observe(el.nativeElement);
    measure();
  }

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => this.resizeObserver?.disconnect());
    this.load();
  }

  async load(): Promise<void> {
    const studentId = this.childId ?? this.auth.getStoredStudentId() ?? '';
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await this.api.getActivity(studentId);
      this.items.set(result.items);
      this.maxSheetMinutes.set(Math.round(result.maxSheetSeconds / 60));
    } catch (err) {
      this.error.set(err instanceof Error && err.message ? err.message : 'Could not load active time.');
    } finally {
      this.loading.set(false);
    }
  }

  setPeriod(period: Period): void {
    this.period.set(period);
    this.hover.set(null);
  }

  /** Hide or show a kind; at least one stays on. */
  toggleKind(kind: ActivityKind): void {
    const next = new Set(this.shown());
    if (next.has(kind)) {
      if (next.size === 1) return;
      next.delete(kind);
    } else {
      next.add(kind);
    }
    this.shown.set(next);
  }

  onPointer(event: PointerEvent, svg: Element): void {
    const rect = svg.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * this.W;
    const i = Math.floor((px - PAD_L) / this.step);
    this.hover.set(i >= 0 && i < this.buckets().length ? i : null);
  }

  onKey(event: KeyboardEvent): void {
    const n = this.buckets().length;
    const current = this.hover() ?? n;
    if (event.key === 'ArrowLeft') this.hover.set(Math.max(0, current - 1));
    else if (event.key === 'ArrowRight') this.hover.set(Math.min(n - 1, this.hover() === null ? n - 1 : current + 1));
    else return;
    event.preventDefault();
  }

  /** Keeps the tooltip inside the chart: right of the bar on the left half, left of it on the right half. */
  tooltipPos(i: number): { left: number | null; right: number | null } {
    const pct = (this.x(i) / this.W) * 100;
    return pct < 50 ? { left: pct + 2, right: null } : { left: null, right: 100 - pct + 2 };
  }
}
