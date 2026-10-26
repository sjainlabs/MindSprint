import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';
import {
  DAILY_GOAL_MINUTES,
  DailyChallengeError,
  DailyChallengeService,
  DailyHistory,
  goalStreak,
  localDate,
  percent,
} from '../services/daily-challenge.service';

const DAYS = 30;
/** SVG user units match the container's pixels (measured), so text stays readable on phones. */
const DEFAULT_W = 640;
const PAD_L = 40;
const PAD_R = 12;
const PANEL_H = 120;
const PANEL_TOP = 14;
const PANEL_BOTTOM = 22;

interface Day {
  date: string;
  label: string;
  tick: string;
  minutes: number;
  questions: number;
  accuracy: number | null;
  seconds: number | null;
  goalReached: boolean;
}

interface Panel {
  id: 'minutes' | 'accuracy' | 'seconds';
  title: string;
  max: number;
  ticks: number[];
  unit: string;
}

/**
 * Parent view of the last 30 days: minutes per day against the goal, accuracy and average seconds.
 * Three small charts share one time axis instead of one chart with several y-scales.
 */
@Component({
  selector: 'app-daily-chart-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './daily-chart-page.component.html',
  styleUrls: ['../tests/test-pages.css', './daily-chart-page.component.css'],
})
export class DailyChartPageComponent implements OnInit {
  private readonly api = inject(DailyChallengeService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  private readonly width = signal(DEFAULT_W);
  get W(): number {
    return this.width();
  }
  readonly PAD_L = PAD_L;
  readonly PAD_R = PAD_R;
  readonly H = PANEL_H;
  readonly TOP = PANEL_TOP;
  readonly BOTTOM = PANEL_H - PANEL_BOTTOM;

  readonly loading = signal(true);
  readonly error = signal('');
  readonly history = signal<DailyHistory | null>(null);
  readonly hover = signal<number | null>(null);
  readonly showTable = signal(false);

  readonly goal = computed(() => this.history()?.dailyGoalMinutes || DAILY_GOAL_MINUTES);

  /** Oldest first, one entry per calendar day (days without practice are empty). */
  readonly days = computed<Day[]>(() => {
    const byDate = new Map((this.history()?.sessions ?? []).map((s) => [s.date, s]));
    return Array.from({ length: DAYS }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (DAYS - 1 - i));
      const key = localDate(d);
      const s = byDate.get(key);
      const practised = !!s && s.questions > 0;
      return {
        date: key,
        label: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
        tick: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        minutes: Math.round(s?.activeMinutes ?? 0),
        questions: s?.questions ?? 0,
        accuracy: practised ? percent(s!.accuracy) : null,
        seconds: practised && s!.averageSeconds !== null ? Math.round(s!.averageSeconds * 10) / 10 : null,
        goalReached: !!s?.goalReached,
      };
    });
  });

  readonly practisedDays = computed(() => this.days().filter((d) => d.questions > 0));
  readonly streak = computed(() => goalStreak(this.history()?.sessions ?? []));
  readonly averageMinutes = computed(() => {
    const p = this.practisedDays();
    return p.length ? Math.round(p.reduce((a, d) => a + d.minutes, 0) / p.length) : 0;
  });

  readonly panels = computed<Panel[]>(() => {
    const goal = this.goal();
    const maxMin = Math.max(goal * 1.5, ...this.days().map((d) => d.minutes));
    const minMax = Math.ceil(maxMin / 15) * 15;
    const maxSec = Math.max(10, ...this.days().map((d) => d.seconds ?? 0));
    const secMax = Math.ceil(maxSec / 10) * 10;
    return [
      { id: 'minutes', title: 'Minutes practised', max: minMax, ticks: [0, goal, minMax], unit: 'min' },
      { id: 'accuracy', title: 'Accuracy', max: 100, ticks: [0, 50, 100], unit: '%' },
      { id: 'seconds', title: 'Average seconds per question', max: secMax, ticks: [0, secMax / 2, secMax], unit: 's' },
    ];
  });

  /** Every 7th day gets an axis label, counted back from today so today is always labelled. */
  readonly xTicks = computed(() => this.days().map((d, i) => ({ i, d })).filter(({ i }) => (DAYS - 1 - i) % 7 === 0));

  private get step(): number {
    return (this.W - PAD_L - PAD_R) / DAYS;
  }

  private resizeObserver: ResizeObserver | null = null;

  /** Called once the chart container exists; keeps the drawing the same width as the screen space. */
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
    const fromQuery = this.route.snapshot.queryParamMap.get('studentId');
    this.load(fromQuery ?? this.auth.getStoredStudentId() ?? '');
  }

  async load(studentId: string): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.history.set(await this.api.daily(studentId, DAYS));
    } catch (err) {
      this.error.set((err as DailyChallengeError).message);
    } finally {
      this.loading.set(false);
    }
  }

  retry(): void {
    this.load(this.route.snapshot.queryParamMap.get('studentId') ?? this.auth.getStoredStudentId() ?? '');
  }

  /* ---------------- Geometry ---------------- */

  x(i: number): number {
    return PAD_L + this.step * (i + 0.5);
  }

  y(value: number, panel: Panel): number {
    return this.BOTTOM - (Math.min(value, panel.max) / panel.max) * (this.BOTTOM - PANEL_TOP);
  }

  /** A bar with 4px rounded top corners, anchored flat on the baseline. */
  barPath(i: number, value: number, panel: Panel): string {
    if (value <= 0) return '';
    const w = Math.max(4, this.step - 4);
    const x0 = this.x(i) - w / 2;
    const top = this.y(value, panel);
    const r = Math.min(4, w / 2, this.BOTTOM - top);
    return `M${x0},${this.BOTTOM} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x0 + w - r} Q${x0 + w},${top} ${x0 + w},${top + r} V${this.BOTTOM} Z`;
  }

  /** Line through practised days; it breaks across days without practice. */
  linePath(panel: Panel): string {
    const key = panel.id === 'accuracy' ? 'accuracy' : 'seconds';
    let d = '';
    let pen = false;
    this.days().forEach((day, i) => {
      const v = day[key];
      if (v === null) {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${this.x(i).toFixed(1)},${this.y(v, panel).toFixed(1)} `;
      pen = true;
    });
    return d.trim();
  }

  /** Days with no practised neighbour would be invisible as a line, so they get a dot. */
  lonePoints(panel: Panel): Array<{ i: number; v: number }> {
    const key = panel.id === 'accuracy' ? 'accuracy' : 'seconds';
    const days = this.days();
    return days
      .map((d, i) => ({ i, v: d[key] }))
      .filter(({ i, v }) => v !== null && days[i - 1]?.[key] == null && days[i + 1]?.[key] == null) as Array<{ i: number; v: number }>;
  }

  valueOf(day: Day, panel: Panel): number | null {
    return panel.id === 'minutes' ? day.minutes : panel.id === 'accuracy' ? day.accuracy : day.seconds;
  }

  /* ---------------- Hover ---------------- */

  onPointer(e: PointerEvent, svg: Element): void {
    const rect = svg.getBoundingClientRect();
    const ux = ((e.clientX - rect.left) / rect.width) * this.W;
    const i = Math.floor((ux - PAD_L) / this.step);
    this.hover.set(i >= 0 && i < DAYS ? i : null);
  }

  onKey(e: KeyboardEvent): void {
    const cur = this.hover() ?? DAYS - 1;
    if (e.key === 'ArrowLeft') this.hover.set(Math.max(0, cur - 1));
    else if (e.key === 'ArrowRight') this.hover.set(Math.min(DAYS - 1, cur + 1));
    else return;
    e.preventDefault();
  }

  /** Tooltip beside the crosshair, on whichever side has room. */
  tooltipPos(i: number): { left: number | null; right: number | null } {
    const at = (this.x(i) / this.W) * 100;
    return at < 50 ? { left: at + 2, right: null } : { left: null, right: 100 - at + 2 };
  }

  readonly newestFirst = computed(() => [...this.practisedDays()].reverse());
}
