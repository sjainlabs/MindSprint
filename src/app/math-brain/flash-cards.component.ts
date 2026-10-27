import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { MathTextComponent } from '../components/math-text/math-text.component';
import {
  DECKS,
  Deck,
  FlashCard,
  FlashSummary,
  MathBrainError,
  MathBrainService,
  comeBackText,
} from '../services/math-brain.service';

type Phase = 'pick' | 'loading' | 'playing' | 'done' | 'caught-up' | 'error';

const TABLE_NUMBERS = Array.from({ length: 19 }, (_, i) => i + 2);

@Component({
  selector: 'app-math-brain-flash-cards',
  standalone: true,
  imports: [CommonModule, MathTextComponent],
  templateUrl: './flash-cards.component.html',
  styleUrls: ['../tests/test-pages.css', './math-brain.css', './flash-cards.component.css'],
})
export class FlashCardsComponent implements OnInit {
  private readonly api = inject(MathBrainService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly decks = DECKS;
  readonly tableNumbers = TABLE_NUMBERS;
  readonly upToChoices = [10, 12, 20];

  readonly deck = signal<Deck>('tables');
  readonly from = signal(2);
  readonly to = signal(10);
  readonly upTo = signal(10);

  readonly phase = signal<Phase>('pick');
  readonly error = signal('');
  readonly cards = signal<FlashCard[]>([]);
  readonly summary = signal<FlashSummary | null>(null);
  readonly index = signal(0);
  readonly flipped = signal(false);
  readonly hintShown = signal(false);
  readonly celebrate = signal(false);
  readonly knewCount = signal(0);
  readonly notYetCount = signal(0);
  readonly rememberedNow = signal(0);
  readonly busy = signal(false);

  readonly studentId = this.auth.getStoredStudentId();
  readonly card = computed(() => this.cards()[this.index()] ?? null);
  readonly deckLabel = computed(() => DECKS.find((d) => d.id === this.deck())?.label ?? '');
  readonly comeBack = computed(() => comeBackText(this.summary()?.nextDueAt ?? null));

  /** Reviews that couldn't be sent straight away; retried in one batch at the end of the set. */
  private pending: Array<{ cardId: string; knew: boolean }> = [];
  private celebrateTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    const deck = q.get('deck') as Deck | null;
    const num = (k: string) => Number(q.get(k));
    if (num('upTo') && this.upToChoices.includes(num('upTo'))) this.upTo.set(num('upTo'));
    if (num('from') >= 2 && num('from') <= 20) this.from.set(num('from'));
    if (num('to') >= 2 && num('to') <= 20) this.to.set(Math.max(this.from(), num('to')));
    if (deck && DECKS.some((d) => d.id === deck)) {
      this.deck.set(deck);
      this.start();
    }
  }

  setFrom(v: number): void {
    this.from.set(v);
    if (this.to() < v) this.to.set(v);
  }

  setTo(v: number): void {
    this.to.set(v);
    if (this.from() > v) this.from.set(v);
  }

  async start(): Promise<void> {
    this.phase.set('loading');
    this.error.set('');
    try {
      const res = await this.api.flashcards(this.deck(), this.studentId, {
        from: this.from(),
        to: this.to(),
        upTo: this.upTo(),
      });
      this.cards.set(res.cards);
      this.summary.set(res.summary);
      this.index.set(0);
      this.flipped.set(false);
      this.hintShown.set(false);
      this.knewCount.set(0);
      this.notYetCount.set(0);
      this.rememberedNow.set(0);
      this.phase.set(res.cards.length ? 'playing' : 'caught-up');
    } catch (err) {
      this.error.set((err as MathBrainError).message);
      this.phase.set('error');
    }
  }

  flip(): void {
    this.flipped.update((f) => !f);
  }

  async mark(knew: boolean): Promise<void> {
    const card = this.card();
    if (!card || this.busy()) return;
    this.busy.set(true);
    (knew ? this.knewCount : this.notYetCount).update((n) => n + 1);

    if (this.studentId) {
      try {
        const [result] = await this.api.review(this.studentId, [{ cardId: card.cardId, knew }]);
        // It just became "remembered" if it moved up a box into the remembered group.
        if (knew && result?.remembered && (card.isNew || result.box > card.box)) this.cheer();
      } catch {
        this.pending.push({ cardId: card.cardId, knew });
      }
    }

    this.busy.set(false);
    this.advance();
  }

  private advance(): void {
    this.flipped.set(false);
    this.hintShown.set(false);
    if (this.index() + 1 < this.cards().length) {
      this.index.update((i) => i + 1);
    } else {
      this.finishSet();
    }
  }

  private async finishSet(): Promise<void> {
    this.phase.set('done');
    if (this.studentId && this.pending.length) {
      const batch = this.pending;
      this.pending = [];
      await this.api.review(this.studentId, batch).catch(() => (this.pending = batch));
    }
    // Fresh counts for the summary.
    this.api
      .flashcards(this.deck(), this.studentId, { from: this.from(), to: this.to(), upTo: this.upTo() }, 1)
      .then((res) => this.summary.set(res.summary))
      .catch(() => undefined);
  }

  private cheer(): void {
    this.rememberedNow.update((n) => n + 1);
    this.celebrate.set(true);
    if (this.celebrateTimer) clearTimeout(this.celebrateTimer);
    this.celebrateTimer = setTimeout(() => this.celebrate.set(false), 1600);
  }

  changeDeck(): void {
    this.phase.set('pick');
    this.router.navigate([], { relativeTo: this.route, replaceUrl: true, queryParams: {} });
  }
}
