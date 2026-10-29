import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Redemption, RewardShop, RewardsError, RewardsService, SHOP_LIMITS, dayLabel } from '../services/rewards.service';
import { STATUS_TEXT } from './reward-shop-page.component';

interface DraftItem {
  id?: string;
  title: string;
  starCost: number;
}

/** Parents set up the reward shop and give or decline what the kid asked for. Opened from the parent dashboard with ?studentId=. */
@Component({
  selector: 'app-reward-shop-parent-page',
  standalone: true,
  template: `
    <main class="page">
      @if (loading()) {
        <section class="card center" aria-busy="true"><div class="spinner"></div></section>
      } @else if (shop(); as s) {
        <section class="card shop-head">
          <h1>👪 Reward shop</h1>
          <span class="stars-pill" [attr.aria-label]="s.availableStars + ' stars available to spend'">⭐ {{ s.availableStars }} available</span>
        </section>

        <section class="card" aria-labelledby="pending-title">
          <h2 id="pending-title">Waiting for you <span class="muted small">· {{ pending().length }}</span></h2>
          <ul class="list">
            @for (r of pending(); track r.id) {
              <li>
                <span class="req-title">{{ r.title }}</span>
                <span class="muted small">{{ r.starCost }} ⭐ · asked {{ dayLabel(r.requestedAt.slice(0, 10)) }}</span>
                <span class="actions row">
                  <button type="button" class="btn primary small" [disabled]="deciding() === r.id" (click)="decide(r, 'fulfilled')">🎁 Give reward</button>
                  <button type="button" class="btn small" [disabled]="deciding() === r.id" (click)="decide(r, 'declined')">Decline</button>
                </span>
              </li>
            } @empty {
              <li class="muted">No requests right now.</li>
            }
          </ul>
          <p class="small muted">Declining gives the stars back.</p>
        </section>

        <section class="card" aria-labelledby="items-title">
          <h2 id="items-title">Rewards in the shop</h2>
          @if (s.suggested.length && !draft().length) {
            <p class="muted small">Tap to add a starter:</p>
            <div class="starters">
              @for (idea of s.suggested; track idea.title) {
                <button type="button" class="chip" (click)="add(idea)">+ {{ idea.title }} · {{ idea.starCost }}⭐</button>
              }
            </div>
          }

          <ul class="editor">
            @for (item of draft(); track $index; let i = $index) {
              <li>
                <label class="field title">
                  <span class="sr-only">Reward {{ i + 1 }} title</span>
                  <input type="text" [value]="item.title" [attr.maxlength]="limits.titleMax" placeholder="e.g. Pick the weekend movie" (input)="edit(i, 'title', $any($event.target).value)" />
                </label>
                <label class="field cost">
                  <span class="sr-only">Reward {{ i + 1 }} cost in stars</span>
                  <input type="number" inputmode="numeric" [min]="limits.minCost" [max]="limits.maxCost" step="1" [value]="item.starCost" (input)="edit(i, 'starCost', $any($event.target).value)" />
                  <span aria-hidden="true">⭐</span>
                </label>
                <button type="button" class="remove" (click)="remove(i)" [attr.aria-label]="'Remove ' + (item.title || 'reward ' + (i + 1))">✕</button>
              </li>
            }
          </ul>

          <div class="actions row">
            <button type="button" class="btn outline" [disabled]="draft().length >= limits.maxItems" (click)="add({ title: '', starCost: 100 })">+ Add a reward</button>
            <button type="button" class="btn primary" [disabled]="!dirty() || saving()" (click)="save()">{{ saving() ? 'Saving…' : 'Save shop' }}</button>
          </div>
          @if (problem(); as p) {
            <p class="notice error" role="alert">{{ p }}</p>
          } @else if (saved()) {
            <p class="notice info" role="status">Saved. The shop is ready for your child.</p>
          }
          <p class="small muted">Costs: {{ limits.minCost }} to {{ limits.maxCost }} stars · up to {{ limits.maxItems }} rewards. About 100 stars is a few days of practice.</p>
        </section>

        @if (history().length) {
          <section class="card">
            <h2>Past requests</h2>
            <ul class="list">
              @for (r of history(); track r.id) {
                <li>
                  <span class="req-title">{{ r.title }}</span>
                  <span class="muted small">{{ r.starCost }} ⭐ · {{ dayLabel((r.decidedAt ?? r.requestedAt).slice(0, 10)) }}</span>
                  <span class="status" [class]="r.status">{{ statusText[r.status] }}</span>
                </li>
              }
            </ul>
          </section>
        }
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
      .shop-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; }
      .list { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
      .list li { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; padding-bottom: 10px; border-bottom: 1px solid #f1f5f9; }
      .list .actions { margin-left: auto; }
      .req-title { font-weight: 800; flex: 1 1 10rem; }
      .starters { display: flex; flex-wrap: wrap; gap: 6px; }
      .starters .chip { cursor: pointer; min-height: 38px; }
      .editor { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
      .editor li { display: grid; grid-template-columns: 1fr 7.5rem auto; gap: 8px; align-items: center; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9; }
      .field { display: flex; align-items: center; gap: 4px; }
      .field input { width: 100%; min-width: 0; border: 2px solid #e2e8f0; border-radius: 10px; padding: 10px; font: inherit; font-size: 16px; }
      .field input:focus { outline: none; border-color: #6c63ff; }
      .remove { border: 0; background: #f1f5f9; border-radius: 10px; width: 40px; height: 40px; cursor: pointer; color: #475569; font-weight: 900; }
      .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
      @media (max-width: 480px) {
        .editor li { grid-template-columns: 1fr auto; }
        .editor .title { grid-column: 1 / -1; }
      }
    `,
  ],
})
export class RewardShopParentPageComponent implements OnInit {
  private readonly rewards = inject(RewardsService);
  private readonly route = inject(ActivatedRoute);

  readonly limits = SHOP_LIMITS;
  readonly statusText = STATUS_TEXT;
  readonly dayLabel = dayLabel;

  readonly loading = signal(true);
  readonly error = signal('');
  readonly shop = signal<RewardShop | null>(null);
  readonly draft = signal<DraftItem[]>([]);
  readonly dirty = signal(false);
  readonly saving = signal(false);
  readonly saved = signal(false);
  readonly deciding = signal<string | null>(null);

  readonly pending = computed(() => (this.shop()?.redemptions ?? []).filter((r) => r.status === 'requested'));
  readonly history = computed(() => (this.shop()?.redemptions ?? []).filter((r) => r.status !== 'requested'));

  /** First thing wrong with the draft, checked before saving with the backend's limits. */
  readonly problem = computed(() => {
    if (!this.dirty()) return '';
    const index = this.draft().findIndex((item) => !item.title.trim());
    if (index >= 0) return `Reward ${index + 1} needs a name.`;
    const cost = this.draft().findIndex(
      (item) => !Number.isInteger(item.starCost) || item.starCost < SHOP_LIMITS.minCost || item.starCost > SHOP_LIMITS.maxCost,
    );
    if (cost >= 0) return `Reward ${cost + 1} must cost ${SHOP_LIMITS.minCost} to ${SHOP_LIMITS.maxCost} stars.`;
    return '';
  });

  private studentId = '';

  ngOnInit(): void {
    this.studentId = this.route.snapshot.queryParamMap.get('studentId') ?? '';
    void this.load();
  }

  async load(): Promise<void> {
    if (!this.studentId) {
      this.error.set('Open the reward shop from your parent dashboard.');
      this.loading.set(false);
      return;
    }
    this.loading.set(!this.shop());
    this.error.set('');
    try {
      this.show(await this.rewards.shop(this.studentId));
    } catch (err) {
      this.error.set((err as RewardsError).message);
    } finally {
      this.loading.set(false);
    }
  }

  add(item: DraftItem): void {
    this.draft.update((list) => [...list, { title: item.title, starCost: item.starCost }]);
    this.touch();
  }

  edit(index: number, field: 'title' | 'starCost', value: string): void {
    this.draft.update((list) => list.map((item, i) => (i === index ? { ...item, [field]: field === 'starCost' ? Number(value) : value } : item)));
    this.touch();
  }

  remove(index: number): void {
    this.draft.update((list) => list.filter((_, i) => i !== index));
    this.touch();
  }

  async save(): Promise<void> {
    if (this.problem()) return;
    this.saving.set(true);
    try {
      const items = this.draft().map((item) => ({ ...(item.id ? { id: item.id } : {}), title: item.title.trim(), starCost: item.starCost }));
      this.show(await this.rewards.saveShop(this.studentId, items));
      this.saved.set(true);
    } catch (err) {
      this.rewards.toast((err as RewardsError).message, 'error');
    } finally {
      this.saving.set(false);
    }
  }

  async decide(request: Redemption, status: 'fulfilled' | 'declined'): Promise<void> {
    this.deciding.set(request.id);
    try {
      await this.rewards.decide(this.studentId, request.id, status);
      this.rewards.toast(status === 'fulfilled' ? `Marked "${request.title}" as given 🎉` : 'Declined. The stars went back.', 'info');
    } catch (err) {
      this.rewards.toast((err as RewardsError).message, 'error');
    } finally {
      this.deciding.set(null);
      await this.reloadKeepingDraft();
    }
  }

  private show(shop: RewardShop): void {
    this.shop.set(shop);
    this.draft.set(shop.items.map(({ id, title, starCost }) => ({ id, title, starCost })));
    this.dirty.set(false);
  }

  private touch(): void {
    this.dirty.set(true);
    this.saved.set(false);
  }

  /** After a decision: fresh requests and stars, without losing unsaved shop edits. */
  private async reloadKeepingDraft(): Promise<void> {
    try {
      const shop = await this.rewards.shop(this.studentId);
      if (this.dirty()) this.shop.set(shop);
      else this.show(shop);
    } catch {
      // The list stays as it was; the toast already said what happened.
    }
  }
}
