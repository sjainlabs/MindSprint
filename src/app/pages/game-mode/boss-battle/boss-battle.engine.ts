import { computed, signal } from '@angular/core';
import { type BossBattleConfig } from './boss-battle.types';

const PLAYER_MAX_HP = 100;
/** Special-attack warning is shown this many ms before the hit lands. */
const SPECIAL_ATTACK_WARN_MS = 1200;
/** Base damage dealt to the player by a standard special attack. */
const BASE_BOSS_DAMAGE = 15;
/** Damage dealt per player hit (scales inversely with difficulty). */
const BASE_PLAYER_DAMAGE = 20;

const DEFAULT_CONFIG: BossBattleConfig = {
  bossId: 'default-boss',
  title: 'The Math Overlord',
  maxHp: 100,
  difficulty: 50,
  phaseCount: 3,
  specialAttackIntervalMs: 8000,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export class BossBattleEngine {
  // ── Boss state ────────────────────────────────────────────────────────────
  readonly hp = signal(DEFAULT_CONFIG.maxHp);
  readonly maxHp = signal(DEFAULT_CONFIG.maxHp);
  readonly phase = signal(1);
  readonly isEnraged = signal(false);

  // ── Player state ──────────────────────────────────────────────────────────
  readonly playerHp = signal(PLAYER_MAX_HP);
  readonly playerMaxHp = signal(PLAYER_MAX_HP);

  // ── Game lifecycle ────────────────────────────────────────────────────────
  readonly isRunning = signal(false);
  readonly isVictory = signal(false);
  readonly isDefeat = signal(false);

  // ── Special-attack warning ────────────────────────────────────────────────
  readonly specialAttackWarning = signal(false);

  // ── Computed values ───────────────────────────────────────────────────────
  readonly hpPercent = computed(() =>
    clamp(Math.round((this.hp() / Math.max(1, this.maxHp())) * 100), 0, 100)
  );

  readonly playerHpPercent = computed(() =>
    clamp(Math.round((this.playerHp() / Math.max(1, this.playerMaxHp())) * 100), 0, 100)
  );

  readonly phaseLabel = computed(() => {
    const phase = this.phase();
    const total = this.config.phaseCount;
    return `Phase ${phase} / ${total}`;
  });

  readonly hpBarClass = computed(() => {
    const pct = this.hpPercent();
    if (pct > 60) return 'bb-hp-bar--high';
    if (pct > 30) return 'bb-hp-bar--medium';
    return 'bb-hp-bar--low';
  });

  // ── Private state ─────────────────────────────────────────────────────────
  private config: BossBattleConfig = { ...DEFAULT_CONFIG };
  private specialAttackTimer: ReturnType<typeof setInterval> | null = null;
  private warnTimer: ReturnType<typeof setTimeout> | null = null;

  get bossTitle(): string {
    return this.config.title;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  configure(config: Partial<BossBattleConfig> & Pick<BossBattleConfig, 'bossId' | 'title' | 'maxHp'>): void {
    const maxHp = clamp(Math.round(config.maxHp), 1, 10_000);
    const difficulty = clamp(Math.round(config.difficulty ?? DEFAULT_CONFIG.difficulty), 1, 100);
    const phaseCount = clamp(Math.round(config.phaseCount ?? DEFAULT_CONFIG.phaseCount), 1, 10);
    const specialAttackIntervalMs = clamp(
      config.specialAttackIntervalMs ?? DEFAULT_CONFIG.specialAttackIntervalMs,
      1000,
      60_000
    );

    this.config = { bossId: config.bossId, title: config.title, maxHp, difficulty, phaseCount, specialAttackIntervalMs };

    this.maxHp.set(maxHp);
    this.hp.set(maxHp);
    this.phase.set(1);
    this.isEnraged.set(false);
    this.playerHp.set(PLAYER_MAX_HP);
    this.playerMaxHp.set(PLAYER_MAX_HP);
    this.isRunning.set(false);
    this.isVictory.set(false);
    this.isDefeat.set(false);
    this.specialAttackWarning.set(false);
  }

  start(): void {
    if (this.isRunning()) return;
    if (this.isVictory() || this.isDefeat()) return;

    this.isRunning.set(true);
    this.scheduleSpecialAttack();
  }

  stop(): void {
    this.clearTimers();
    this.isRunning.set(false);
  }

  reset(): void {
    this.stop();
    this.configure(this.config);
  }

  /** Player deals damage to the boss. */
  hit(damage?: number): void {
    if (!this.isRunning() || this.isVictory() || this.isDefeat()) return;

    const scaledDamage = clamp(
      Math.round((damage ?? BASE_PLAYER_DAMAGE) * (1 + (100 - this.config.difficulty) / 100)),
      1,
      this.maxHp()
    );

    const newHp = clamp(this.hp() - scaledDamage, 0, this.maxHp());
    this.hp.set(newHp);

    this.updatePhase();

    if (newHp <= 0) {
      this.onVictory();
    }
  }

  /** Manually trigger a special attack (e.g. for testing). */
  triggerSpecialAttack(): void {
    if (!this.isRunning() || this.isVictory() || this.isDefeat()) return;
    this.fireSpecialAttack();
  }

  // ── Internal logic ────────────────────────────────────────────────────────

  private updatePhase(): void {
    const hpPct = this.hpPercent();
    const phaseCount = this.config.phaseCount;
    const phaseSizePct = 100 / phaseCount;

    // Phase number = which "slice" of HP the boss is currently in (1-based)
    const newPhase = clamp(
      Math.ceil((100 - hpPct) / phaseSizePct) + 1,
      1,
      phaseCount
    );

    const oldPhase = this.phase();
    if (newPhase !== oldPhase) {
      this.phase.set(newPhase);
    }

    // Enrage activates in the final phase
    const shouldEnrage = newPhase === phaseCount && !this.isEnraged();
    if (shouldEnrage) {
      this.isEnraged.set(true);
      // Restart timer at an accelerated pace
      this.clearTimers();
      if (!this.isVictory() && !this.isDefeat()) {
        this.scheduleSpecialAttack();
      }
    }
  }

  private scheduleSpecialAttack(): void {
    const baseInterval = this.config.specialAttackIntervalMs;
    const enragedMultiplier = this.isEnraged() ? 0.55 : 1;
    const difficultyMultiplier = 1 - (this.config.difficulty / 100) * 0.4;
    const interval = clamp(
      Math.round(baseInterval * enragedMultiplier * difficultyMultiplier),
      800,
      60_000
    );

    this.specialAttackTimer = setInterval(() => {
      if (this.isRunning() && !this.isVictory() && !this.isDefeat()) {
        this.warnAndAttack(interval);
      }
    }, interval);
  }

  private warnAndAttack(interval: number): void {
    const warnMs = Math.min(SPECIAL_ATTACK_WARN_MS, interval * 0.8);
    this.specialAttackWarning.set(true);

    this.warnTimer = setTimeout(() => {
      this.specialAttackWarning.set(false);
      if (this.isRunning() && !this.isVictory() && !this.isDefeat()) {
        this.fireSpecialAttack();
      }
    }, warnMs);
  }

  private fireSpecialAttack(): void {
    const difficultyBonus = 1 + (this.config.difficulty / 100) * 0.5;
    const enragedBonus = this.isEnraged() ? 1.5 : 1;
    const damage = clamp(
      Math.round(BASE_BOSS_DAMAGE * difficultyBonus * enragedBonus),
      1,
      PLAYER_MAX_HP
    );

    const newPlayerHp = clamp(this.playerHp() - damage, 0, this.playerMaxHp());
    this.playerHp.set(newPlayerHp);

    if (newPlayerHp <= 0) {
      this.onDefeat();
    }
  }

  private onVictory(): void {
    this.clearTimers();
    this.isRunning.set(false);
    this.isVictory.set(true);
  }

  private onDefeat(): void {
    this.clearTimers();
    this.isRunning.set(false);
    this.isDefeat.set(true);
  }

  private clearTimers(): void {
    if (this.specialAttackTimer !== null) {
      clearInterval(this.specialAttackTimer);
      this.specialAttackTimer = null;
    }
    if (this.warnTimer !== null) {
      clearTimeout(this.warnTimer);
      this.warnTimer = null;
    }
    this.specialAttackWarning.set(false);
  }
}
