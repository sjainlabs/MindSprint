import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { RewardsService } from '../services/rewards.service';

/** Pages where a kid answers one question after another: popups wait until they leave, toasts still show. */
const FLOW_PAGES = ['/daily/play', '/math-brain', '/math-games'];

/** App-wide: "+N ⭐" toasts, error toasts, and chest / level-up / streak-badge popups. Each popup closes with one tap. */
@Component({
  selector: 'app-rewards-celebrations',
  standalone: true,
  template: `
    <div class="toasts" aria-live="polite">
      @for (t of rewards.toasts(); track t.id) {
        <button type="button" class="toast" [class]="t.kind" (click)="rewards.dismissToast(t.id)">{{ t.text }}</button>
      }
    </div>

    @if (current(); as c) {
      <div class="backdrop" [class.full]="c.kind === 'level'" (click)="rewards.dismissCelebration()">
        <section class="pop" role="alertdialog" aria-modal="true" aria-labelledby="celebrate-title" (click)="$event.stopPropagation()">
          @switch (c.kind) {
            @case ('level') {
              <div class="art spin" aria-hidden="true">🏅</div>
              <p class="kicker">Level {{ c.number }}</p>
              <h2 id="celebrate-title">You're now a {{ c.name }}!</h2>
              <button type="button" class="btn primary" (click)="rewards.dismissCelebration()">Awesome!</button>
            }
            @case ('chest') {
              <div class="art bounce" aria-hidden="true">🎁</div>
              <h2 id="celebrate-title">You earned a treasure chest!</h2>
              @if (c.count > 1) { <p class="muted">{{ c.count }} chests are waiting.</p> }
              <div class="row">
                <button type="button" class="btn primary" (click)="openChest()">Open it</button>
                <button type="button" class="btn" (click)="rewards.dismissCelebration()">Later</button>
              </div>
            }
            @case ('badge') {
              <div class="art pulse" aria-hidden="true">🔥</div>
              <h2 id="celebrate-title">{{ c.days }}-day streak badge!</h2>
              <p class="muted">+{{ c.stars }} ⭐ for practising {{ c.days }} days in a row.</p>
              <button type="button" class="btn primary" (click)="rewards.dismissCelebration()">Yay!</button>
            }
          }
        </section>
      </div>
    }
  `,
  styles: [
    `
      .toasts { position: fixed; top: 12px; left: 50%; transform: translateX(-50%); z-index: 10000; display: grid; gap: 6px; justify-items: center; width: min(92vw, 420px); pointer-events: none; }
      .toast { pointer-events: auto; border: 0; border-radius: 999px; padding: 10px 18px; font-weight: 800; font-size: 1rem; box-shadow: 0 6px 18px rgba(15, 23, 42, 0.18); background: #1e1b4b; color: #fff; animation: toast-in 0.35s ease both; cursor: pointer; }
      .toast.stars { background: linear-gradient(90deg, #f59e0b, #facc15); color: #422006; font-size: 1.15rem; }
      .toast.error { background: #fff7ed; color: #9a3412; border: 2px solid #fdba74; border-radius: 14px; }
      .backdrop { position: fixed; inset: 0; z-index: 9998; background: rgba(15, 23, 42, 0.45); display: grid; place-items: center; padding: 16px; }
      .backdrop.full { background: radial-gradient(circle at 50% 40%, #fde68a 0%, #c4b5fd 55%, #4338ca 100%); }
      .pop { background: #fff; border-radius: 22px; padding: 24px 20px; width: min(100%, 360px); text-align: center; display: grid; gap: 10px; justify-items: center; animation: pop-in 0.4s cubic-bezier(0.2, 1.4, 0.4, 1) both; }
      .pop h2 { margin: 0; font-size: 1.35rem; font-weight: 900; color: #1e1b4b; }
      .kicker { margin: 0; font-weight: 800; color: #6d28d9; text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.8rem; }
      .muted { margin: 0; color: #64748b; }
      .art { font-size: 4rem; line-height: 1; }
      .row { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
      .btn { border: 2px solid #c7d2fe; background: #fff; color: #3730a3; font-weight: 800; border-radius: 12px; padding: 10px 18px; font-size: 1rem; cursor: pointer; }
      .btn.primary { background: #4f46e5; border-color: #4f46e5; color: #fff; }
      .spin { animation: spin-in 0.9s ease both; }
      .bounce { animation: bounce 0.8s ease 2; }
      .pulse { animation: pulse 0.8s ease 2; }
      @keyframes toast-in { from { opacity: 0; transform: translateY(-12px) scale(0.9); } }
      @keyframes pop-in { from { opacity: 0; transform: scale(0.7); } }
      @keyframes spin-in { from { transform: rotate(-200deg) scale(0.2); } }
      @keyframes bounce { 50% { transform: translateY(-14px); } }
      @keyframes pulse { 50% { transform: scale(1.2); } }
      @media (prefers-reduced-motion: reduce) {
        .toast, .pop, .spin, .bounce, .pulse { animation: none; }
      }
    `,
  ],
})
export class RewardsCelebrationsComponent {
  protected readonly rewards = inject(RewardsService);
  private readonly router = inject(Router);
  private readonly url = signal(this.router.url);

  private readonly inFlow = computed(() => FLOW_PAGES.some((page) => this.url().startsWith(page)));
  readonly current = computed(() => (this.inFlow() ? null : (this.rewards.celebrations()[0] ?? null)));

  constructor() {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((e) => this.url.set(e.urlAfterRedirects));
  }

  openChest(): void {
    this.rewards.dismissCelebration();
    void this.router.navigate(['/rewards/me'], { queryParams: { open: 'chest' } });
  }
}
