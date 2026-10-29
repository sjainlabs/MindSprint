import { Component, OnInit, inject, signal } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { RedemptionStatus, RewardShop, RewardsError, RewardsService, ShopItem, dayLabel } from '../services/rewards.service';

export const STATUS_TEXT: Record<RedemptionStatus, string> = {
  requested: '⏳ Waiting',
  fulfilled: '🎉 Given',
  declined: 'Not this time',
};

/** The kid's side of the shop: spend stars on rewards a grown-up set up. */
@Component({
  selector: 'app-reward-shop-page',
  standalone: true,
  template: `
    <main class="page">
      @if (loading()) {
        <section class="card center" aria-busy="true"><div class="spinner"></div></section>
      } @else if (shop(); as s) {
        <section class="card shop-head">
          <span class="stars-pill" [attr.aria-label]="s.availableStars + ' stars to spend'">⭐ {{ s.availableStars }}</span>
          <p class="muted">Pick a reward and we'll ask your grown-up.</p>
        </section>

        @if (notice()) {
          <p class="notice info" role="status">{{ notice() }}</p>
        }

        @if (s.items.length) {
          <ul class="items">
            @for (item of s.items; track item.id) {
              <li class="card item" [class.can]="item.affordable">
                <p class="item-title">{{ item.title }}</p>
                <p class="cost">{{ item.starCost }} ⭐</p>
                @if (item.affordable) {
                  @if (confirming() === item.id) {
                    <p class="small">Spend {{ item.starCost }} stars?</p>
                    <div class="actions row">
                      <button type="button" class="btn primary" [disabled]="busy()" (click)="redeem(item)">{{ busy() ? 'Asking…' : 'Yes, ask!' }}</button>
                      <button type="button" class="btn" [disabled]="busy()" (click)="confirming.set(null)">No</button>
                    </div>
                  } @else {
                    <button type="button" class="btn primary" (click)="confirming.set(item.id)">Redeem</button>
                  }
                } @else {
                  <div class="meter" role="progressbar" aria-valuemin="0" [attr.aria-valuemax]="item.starCost" [attr.aria-valuenow]="s.availableStars" [attr.aria-label]="'Stars saved for ' + item.title">
                    <span class="meter-fill" [style.width.%]="(s.availableStars / item.starCost) * 100"></span>
                  </div>
                  <p class="small muted">{{ item.starCost - s.availableStars }} more stars needed</p>
                }
              </li>
            }
          </ul>
        } @else {
          <section class="card center">
            <div class="empty-art" aria-hidden="true">🛍️</div>
            <p>The shop is empty for now. Ask your grown-up to add some rewards!</p>
          </section>
        }

        <section class="card">
          <h2>My requests</h2>
          <ul class="requests">
            @for (r of s.redemptions; track r.id) {
              <li>
                <span class="req-title">{{ r.title }}</span>
                <span class="muted small">{{ r.starCost }} ⭐ · {{ dayLabel(r.requestedAt.slice(0, 10)) }}</span>
                <span class="status" [class]="r.status">{{ statusText[r.status] }}</span>
              </li>
            } @empty {
              <li class="muted">Nothing asked for yet.</li>
            }
          </ul>
        </section>
      } @else {
        <section class="card">
          <p class="notice error" role="alert">{{ error() }}</p>
          <button type="button" class="btn primary" (click)="load()">Try again</button>
        </section>
      }
    </main>
  `,
  styleUrls: ['../tests/test-pages.css', './rewards.css'],
  styles: [
    `
      .page { padding-top: 8px; }
      .shop-head { grid-template-columns: auto 1fr; align-items: center; }
      .items { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
      .item { gap: 8px; align-content: start; border: 2px solid transparent; }
      .item.can { border-color: #fcd34d; }
      .item-title { font-weight: 800; font-size: 1.05rem; color: #1e1b4b; }
      .cost { font-weight: 900; color: #b45309; font-size: 1.2rem; }
      .meter-fill { background: linear-gradient(90deg, #f59e0b, #facc15); }
      .empty-art { font-size: 3rem; }
      .requests { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
      .requests li { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9; }
      .req-title { font-weight: 800; flex: 1 1 10rem; }
    `,
  ],
})
export class RewardShopPageComponent implements OnInit {
  private readonly rewards = inject(RewardsService);
  private readonly auth = inject(AuthService);

  readonly statusText = STATUS_TEXT;
  readonly dayLabel = dayLabel;

  readonly loading = signal(true);
  readonly error = signal('');
  readonly shop = signal<RewardShop | null>(null);
  readonly confirming = signal<string | null>(null);
  readonly busy = signal(false);
  readonly notice = signal('');

  private studentId = '';

  ngOnInit(): void {
    this.studentId = this.auth.getStoredStudentId() ?? '';
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(!this.shop());
    this.error.set('');
    try {
      this.shop.set(await this.rewards.shop(this.studentId));
    } catch (err) {
      this.error.set((err as RewardsError).message);
    } finally {
      this.loading.set(false);
    }
  }

  async redeem(item: ShopItem): Promise<void> {
    this.busy.set(true);
    try {
      await this.rewards.redeem(this.studentId, item.id);
      this.notice.set(`Asked your grown-up for "${item.title}"! 🎉`);
      this.confirming.set(null);
      await this.load();
    } catch (err) {
      this.rewards.toast((err as RewardsError).message, 'error');
      this.confirming.set(null);
      await this.load();
    } finally {
      this.busy.set(false);
    }
  }
}
