import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RewardsService } from '../services/rewards.service';

const MESSAGE_MS = 5000;
const NUDGE_KEY = 'mindsprint.rewards.nudgeDismissed';

/** Stars, streak and chest progress at the top of the kid's dashboard, with rotating tips underneath. */
@Component({
  selector: 'app-rewards-bar',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (rewards.summary(); as s) {
      @if (s.streak.atRisk && !nudgeDismissed()) {
        <p class="nudge" role="status">
          <span aria-hidden="true">🔥</span>
          <span>Practise today to keep your {{ s.streak.current }}-day streak going!</span>
          <button type="button" (click)="dismissNudge()" aria-label="Dismiss">✕</button>
        </p>
      }

      <a class="bar" routerLink="/rewards/me" [attr.aria-label]="label()">
        <span class="item stars">
          <span class="icon" aria-hidden="true">⭐</span>
          <span class="num">{{ s.stars.available }}</span>
          <span class="cap">stars</span>
        </span>

        <span class="item flame" [class]="flame().cls">
          <span class="icon" aria-hidden="true">🔥</span>
          <span class="num">{{ s.streak.current }}</span>
          <span class="cap">{{ flame().text }}</span>
        </span>

        <span class="item chest">
          @if (s.chests.unclaimed.length) {
            <span class="icon ready" aria-hidden="true">🎁<span class="count">{{ s.chests.unclaimed.length }}</span></span>
            <span class="cap">open me!</span>
          } @else {
            <span class="ring" [style.--p]="s.chests.progressPercent" aria-hidden="true"><span>🎁</span></span>
            <span class="cap">{{ s.chests.questionsToNext }} to go</span>
          }
        </span>
      </a>

      @if (message(); as m) {
        <p class="message" aria-hidden="true">{{ m }}</p>
      }
    }
  `,
  styles: [
    `
      :host { display: block; }
      .bar { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; padding: 10px; border-radius: 18px; background: linear-gradient(120deg, #fef3c7, #ede9fe); text-decoration: none; color: #1e1b4b; box-shadow: 0 4px 14px rgba(76, 29, 149, 0.12); }
      .bar:hover { box-shadow: 0 6px 18px rgba(76, 29, 149, 0.2); }
      .item { display: grid; grid-template-columns: auto auto; justify-content: center; align-items: center; column-gap: 6px; background: rgba(255, 255, 255, 0.75); border-radius: 14px; padding: 8px 4px; min-height: 64px; }
      .icon { font-size: 1.6rem; line-height: 1; position: relative; }
      .num { font-size: 1.5rem; font-weight: 900; }
      .cap { grid-column: 1 / -1; text-align: center; font-size: 0.75rem; font-weight: 800; color: #475569; }
      .flame.off .icon { filter: grayscale(1); opacity: 0.5; }
      .flame.done .cap { color: #c2410c; }
      .flame.risk { background: #fffbeb; outline: 2px solid #f59e0b; }
      .flame.risk .icon { animation: pulse 1.2s ease-in-out infinite; }
      .flame.risk .cap { color: #b45309; }
      .ready { animation: bounce 1s ease-in-out infinite; }
      .count { position: absolute; top: -6px; right: -10px; background: #dc2626; color: #fff; font-size: 0.7rem; font-weight: 900; border-radius: 999px; min-width: 18px; height: 18px; display: grid; place-items: center; padding: 0 4px; }
      .ring { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; background: conic-gradient(#8b5cf6 calc(var(--p) * 1%), #e2e8f0 0); grid-column: 1 / -1; justify-self: center; }
      .ring span { width: 30px; height: 30px; border-radius: 50%; background: #fff; display: grid; place-items: center; font-size: 1rem; }
      .message { margin: 6px 4px 0; text-align: center; font-size: 0.88rem; font-weight: 700; color: #5b21b6; min-height: 1.3em; animation: fade 0.5s ease both; }
      .nudge { display: flex; align-items: center; gap: 8px; margin: 0 0 8px; padding: 10px 12px; border-radius: 14px; background: #fff7ed; border: 2px solid #fdba74; color: #9a3412; font-weight: 800; }
      .nudge span:nth-child(2) { flex: 1; }
      .nudge button { border: 0; background: none; color: inherit; font-size: 1rem; cursor: pointer; padding: 4px 8px; }
      @keyframes pulse { 50% { transform: scale(1.18); } }
      @keyframes bounce { 50% { transform: translateY(-5px) rotate(-6deg); } }
      @keyframes fade { from { opacity: 0; } }
      @media (prefers-reduced-motion: reduce) {
        .flame.risk .icon, .ready, .message { animation: none; }
      }
    `,
  ],
})
export class RewardsBarComponent implements OnInit, OnDestroy {
  protected readonly rewards = inject(RewardsService);
  private readonly tick = signal(0);
  private timer: ReturnType<typeof setInterval> | null = null;
  readonly nudgeDismissed = signal(readNudge());

  readonly flame = computed(() => {
    const s = this.rewards.summary()?.streak;
    if (!s || s.current === 0) return { cls: 'off', text: 'no streak' };
    if (s.activeToday) return { cls: 'done', text: 'done today ✓' };
    return { cls: 'risk', text: 'practise today!' };
  });

  readonly message = computed(() => {
    const list = this.rewards.summary()?.messages ?? [];
    return list.length ? list[this.tick() % list.length].text : '';
  });

  readonly label = computed(() => {
    const s = this.rewards.summary();
    if (!s) return '';
    const chest = s.chests.unclaimed.length
      ? `${s.chests.unclaimed.length} treasure chest${s.chests.unclaimed.length === 1 ? '' : 's'} to open`
      : `${s.chests.questionsToNext} questions to the next treasure chest`;
    return `${s.stars.available} stars available, ${s.streak.current}-day streak (${this.flame().text}), ${chest}. Open rewards.`;
  });

  ngOnInit(): void {
    void this.rewards.load();
    this.timer = setInterval(() => this.tick.update((n) => n + 1), MESSAGE_MS);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  dismissNudge(): void {
    this.nudgeDismissed.set(true);
    try {
      localStorage.setItem(NUDGE_KEY, today());
    } catch {
      // The banner just comes back next visit.
    }
  }
}

function today(): string {
  return new Date().toDateString();
}

function readNudge(): boolean {
  try {
    return localStorage.getItem(NUDGE_KEY) === today();
  } catch {
    return false;
  }
}
