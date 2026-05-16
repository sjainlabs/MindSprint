import { computed, signal } from '@angular/core';
import { type CompetitionBossConfig, type CompetitionBossOutcome } from './competition-boss.types';

const PLAYER_MAX_HP = 100;
const DEFAULT_COMPETITOR_MAX_HP = 100;
const PLAYER_BASE_DAMAGE = 18;
const BOSS_BASE_DAMAGE = 12;
const COMPETITOR_TICK_MS = 250;
const TIMER_TICK_MS = 100;
const SPECIAL_ATTACK_WARN_MS = 1500;
const COMPETITOR_DIFFICULTY_SCALING_FACTOR = 200;
const ENRAGED_COMPETITOR_DPS_MULTIPLIER = 1.15;
const MAX_COMPETITOR_DPS = 600;
const ENRAGED_SPECIAL_INTERVAL_MULTIPLIER = 0.7;
const SPECIAL_INTERVAL_DIFFICULTY_REDUCTION = 0.25;

const DEFAULT_CONFIG: CompetitionBossConfig = {
  bossId: 'competition-boss-default',
  title: 'Tournament Tyrant',
  maxHp: 140,
  difficulty: 60,
  phaseCount: 3,
  specialAttackIntervalMs: 7000,
  competitorDps: 12,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function percent(current: number, max: number): number {
  return clamp(Math.round((current / Math.max(1, max)) * 100), 0, 100);
}

function hpTone(value: number): string {
  if (value > 60) return 'cb-hp-fill--high';
  if (value > 30) return 'cb-hp-fill--medium';
  return 'cb-hp-fill--low';
}

export class CompetitionBossEngine {
  readonly bossTitle = signal(DEFAULT_CONFIG.title);
  readonly bossHp = signal(DEFAULT_CONFIG.maxHp);
  readonly bossMaxHp = signal(DEFAULT_CONFIG.maxHp);
  readonly playerHp = signal(PLAYER_MAX_HP);
  readonly playerMaxHp = signal(PLAYER_MAX_HP);
  readonly competitorHp = signal(DEFAULT_COMPETITOR_MAX_HP);
  readonly competitorMaxHp = signal(DEFAULT_COMPETITOR_MAX_HP);
  readonly phase = signal(1);
  readonly enraged = signal(false);
  readonly specialAttackTimerMs = signal(DEFAULT_CONFIG.specialAttackIntervalMs);
  readonly specialAttackWarning = signal(false);
  readonly competitorAttackRate = signal(DEFAULT_CONFIG.competitorDps);
  readonly isRunning = signal(false);
  readonly outcome = signal<CompetitionBossOutcome>('in-progress');
  readonly playerDamageDealt = signal(0);
  readonly competitorDamageDealt = signal(0);

  readonly bossHpPercent = computed(() => percent(this.bossHp(), this.bossMaxHp()));
  readonly playerHpPercent = computed(() => percent(this.playerHp(), this.playerMaxHp()));
  readonly competitorHpPercent = computed(() => percent(this.competitorHp(), this.competitorMaxHp()));
  readonly playerRacePercent = computed(() => percent(this.playerDamageDealt(), this.bossMaxHp()));
  readonly competitorRacePercent = computed(() => percent(this.competitorDamageDealt(), this.bossMaxHp()));
  readonly phaseLabel = computed(() => `Phase ${this.phase()} / ${this.config.phaseCount}`);
  readonly nextSpecialAttackSeconds = computed(() => Math.max(0, Math.ceil(this.specialAttackTimerMs() / 1000)));
  readonly bossHpBarClass = computed(() => hpTone(this.bossHpPercent()));
  readonly playerHpBarClass = computed(() => hpTone(this.playerHpPercent()));
  readonly competitorHpBarClass = computed(() => hpTone(this.competitorHpPercent()));
  readonly isPlayerVictory = computed(() => this.outcome() === 'player-victory');
  readonly isCompetitorVictory = computed(() => this.outcome() === 'competitor-victory');
  readonly isPlayerDefeat = computed(() => this.outcome() === 'player-defeat');
  readonly isFinished = computed(() => this.outcome() !== 'in-progress');

  private config: CompetitionBossConfig = { ...DEFAULT_CONFIG };
  private competitorAttackTimer: ReturnType<typeof setInterval> | null = null;
  private specialAttackTimeout: ReturnType<typeof setTimeout> | null = null;
  private specialAttackWarnTimeout: ReturnType<typeof setTimeout> | null = null;
  private specialAttackCountdownTimer: ReturnType<typeof setInterval> | null = null;

  configure(config: Partial<CompetitionBossConfig> & Pick<CompetitionBossConfig, 'bossId' | 'title'>): void {
    const maxHp = clamp(
      typeof config.maxHp === 'number' && Number.isFinite(config.maxHp)
        ? Math.round(config.maxHp)
        : DEFAULT_CONFIG.maxHp,
      1,
      10_000,
    );
    const difficulty = clamp(Math.round(config.difficulty ?? DEFAULT_CONFIG.difficulty), 1, 100);
    const phaseCount = clamp(Math.round(config.phaseCount ?? DEFAULT_CONFIG.phaseCount), 1, 10);
    const specialAttackIntervalMs = clamp(
      Math.round(config.specialAttackIntervalMs ?? DEFAULT_CONFIG.specialAttackIntervalMs),
      1200,
      60_000,
    );
    const competitorDps = clamp(config.competitorDps ?? DEFAULT_CONFIG.competitorDps, 1, 500);
    const competitorMaxHp = clamp(Math.round(DEFAULT_COMPETITOR_MAX_HP + difficulty * 0.4), 80, 160);

    this.config = {
      bossId: config.bossId,
      title: config.title,
      maxHp,
      difficulty,
      phaseCount,
      specialAttackIntervalMs,
      competitorDps,
    };

    this.bossTitle.set(this.config.title);
    this.bossMaxHp.set(maxHp);
    this.bossHp.set(maxHp);
    this.playerMaxHp.set(PLAYER_MAX_HP);
    this.playerHp.set(PLAYER_MAX_HP);
    this.competitorMaxHp.set(competitorMaxHp);
    this.competitorHp.set(competitorMaxHp);
    this.phase.set(1);
    this.enraged.set(false);
    this.specialAttackTimerMs.set(specialAttackIntervalMs);
    this.specialAttackWarning.set(false);
    this.competitorAttackRate.set(this.computeCompetitorAttackRate());
    this.playerDamageDealt.set(0);
    this.competitorDamageDealt.set(0);
    this.outcome.set('in-progress');
    this.isRunning.set(false);
    this.clearTimers();
  }

  start(): void {
    if (this.isRunning() || this.isFinished()) return;

    this.isRunning.set(true);
    this.competitorAttackTimer = setInterval(() => this.competitorAttackTick(), COMPETITOR_TICK_MS);
    this.scheduleSpecialAttackCycle();
  }

  stop(): void {
    this.clearTimers();
    this.isRunning.set(false);
  }

  playerAttack(): void {
    if (!this.isRunning() || this.isFinished()) return;

    const playerDamage = clamp(
      Math.round(PLAYER_BASE_DAMAGE * (1 + (100 - this.config.difficulty) / 100)),
      6,
      this.bossMaxHp(),
    );
    this.applyBossDamage(playerDamage, 'player');
  }

  competitorAttackTick(): void {
    if (!this.isRunning() || this.isFinished() || this.competitorHp() <= 0) return;

    const damage = clamp(
      Math.round((this.competitorAttackRate() * COMPETITOR_TICK_MS) / 1000),
      1,
      this.bossMaxHp(),
    );
    this.applyBossDamage(damage, 'competitor');
  }

  bossSpecialAttack(): void {
    if (!this.isRunning() || this.isFinished()) return;

    this.specialAttackWarning.set(false);
    const difficultyBonus = 1 + this.config.difficulty / 150;
    const enrageBonus = this.enraged() ? 1.35 : 1;
    const baseDamage = clamp(
      Math.round(BOSS_BASE_DAMAGE * difficultyBonus * enrageBonus),
      8,
      PLAYER_MAX_HP,
    );
    const competitorDamage = clamp(Math.round(baseDamage * 0.9), 6, this.competitorMaxHp());

    const nextPlayerHp = clamp(this.playerHp() - baseDamage, 0, this.playerMaxHp());
    const nextCompetitorHp = clamp(this.competitorHp() - competitorDamage, 0, this.competitorMaxHp());

    this.playerHp.set(nextPlayerHp);
    this.competitorHp.set(nextCompetitorHp);

    if (nextPlayerHp <= 0) {
      this.finish('player-defeat');
      return;
    }

    if (this.isRunning()) {
      this.scheduleSpecialAttackCycle();
    }
  }

  reset(): void {
    this.configure(this.config);
  }

  private applyBossDamage(damage: number, source: 'player' | 'competitor'): void {
    const nextBossHp = clamp(this.bossHp() - damage, 0, this.bossMaxHp());
    this.bossHp.set(nextBossHp);

    if (source === 'player') {
      this.playerDamageDealt.update((value) => Math.min(this.bossMaxHp(), value + damage));
    } else {
      this.competitorDamageDealt.update((value) => Math.min(this.bossMaxHp(), value + damage));
    }

    this.updatePhaseState();

    if (nextBossHp <= 0) {
      this.finish(source === 'player' ? 'player-victory' : 'competitor-victory');
    }
  }

  private updatePhaseState(): void {
    const phaseSizePct = 100 / this.config.phaseCount;
    const nextPhase = clamp(
      Math.floor((100 - this.bossHpPercent()) / phaseSizePct) + 1,
      1,
      this.config.phaseCount,
    );

    if (nextPhase !== this.phase()) {
      this.phase.set(nextPhase);
    }

    const shouldEnrage = nextPhase === this.config.phaseCount;
    if (shouldEnrage !== this.enraged()) {
      this.enraged.set(shouldEnrage);
      this.competitorAttackRate.set(this.computeCompetitorAttackRate());
      if (this.isRunning() && !this.isFinished()) {
        this.scheduleSpecialAttackCycle();
      }
    }
  }

  private computeCompetitorAttackRate(): number {
    const difficultyMultiplier = 1 + this.config.difficulty / COMPETITOR_DIFFICULTY_SCALING_FACTOR;
    const enragedMultiplier = this.enraged() ? ENRAGED_COMPETITOR_DPS_MULTIPLIER : 1;
    return clamp(this.config.competitorDps * difficultyMultiplier * enragedMultiplier, 1, MAX_COMPETITOR_DPS);
  }

  private currentSpecialAttackIntervalMs(): number {
    const enrageMultiplier = this.enraged() ? ENRAGED_SPECIAL_INTERVAL_MULTIPLIER : 1;
    const difficultyMultiplier = 1 - (this.config.difficulty / 100) * SPECIAL_INTERVAL_DIFFICULTY_REDUCTION;
    return clamp(
      Math.round(this.config.specialAttackIntervalMs * enrageMultiplier * difficultyMultiplier),
      1000,
      60_000,
    );
  }

  private scheduleSpecialAttackCycle(): void {
    this.clearSpecialAttackTimers();

    const intervalMs = this.currentSpecialAttackIntervalMs();
    const warnMs = Math.min(SPECIAL_ATTACK_WARN_MS, Math.round(intervalMs * 0.5));
    const warnAtMs = Math.max(TIMER_TICK_MS, intervalMs - warnMs);

    this.specialAttackTimerMs.set(intervalMs);
    this.specialAttackCountdownTimer = setInterval(() => {
      this.specialAttackTimerMs.update((value) => Math.max(0, value - TIMER_TICK_MS));
    }, TIMER_TICK_MS);

    this.specialAttackWarnTimeout = setTimeout(() => {
      if (this.isRunning() && !this.isFinished()) {
        this.specialAttackWarning.set(true);
      }
    }, warnAtMs);

    this.specialAttackTimeout = setTimeout(() => this.bossSpecialAttack(), intervalMs);
  }

  private finish(outcome: CompetitionBossOutcome): void {
    this.clearTimers();
    this.outcome.set(outcome);
    this.isRunning.set(false);
    this.specialAttackWarning.set(false);
    this.specialAttackTimerMs.set(0);
  }

  private clearSpecialAttackTimers(): void {
    if (this.specialAttackTimeout !== null) {
      clearTimeout(this.specialAttackTimeout);
      this.specialAttackTimeout = null;
    }
    if (this.specialAttackWarnTimeout !== null) {
      clearTimeout(this.specialAttackWarnTimeout);
      this.specialAttackWarnTimeout = null;
    }
    if (this.specialAttackCountdownTimer !== null) {
      clearInterval(this.specialAttackCountdownTimer);
      this.specialAttackCountdownTimer = null;
    }
    this.specialAttackWarning.set(false);
  }

  private clearTimers(): void {
    if (this.competitorAttackTimer !== null) {
      clearInterval(this.competitorAttackTimer);
      this.competitorAttackTimer = null;
    }
    this.clearSpecialAttackTimers();
  }
}
