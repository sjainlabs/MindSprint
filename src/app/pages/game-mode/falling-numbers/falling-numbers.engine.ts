import { computed, signal } from '@angular/core';
import {
  type FallingNumber,
  type FallingNumbersConfig,
  type FallingPowerUpType,
} from './falling-numbers.types';

const DEFAULT_CONFIG: FallingNumbersConfig = {
  target: 10,
  stream: [6, 7, 8, 9, 10, 11, 12],
  difficulty: 50,
  combosEnabled: true,
  powerUps: ['magnet', 'slow-mo', 'bomb'],
};

const POWER_UP_DURATION_MS: Record<FallingPowerUpType, number> = {
  magnet: 3500,
  'slow-mo': 4200,
  bomb: 900,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickOne<T>(items: T[]): T {
  return items[randomInt(0, items.length - 1)];
}

function uniquePowerUps(values: FallingPowerUpType[]): FallingPowerUpType[] {
  return [...new Set(values)];
}

export class FallingNumbersEngine {
  readonly numbers = signal<FallingNumber[]>([]);
  readonly combo = signal(0);
  readonly score = signal(0);
  readonly target = signal(DEFAULT_CONFIG.target);
  readonly isRunning = signal(false);
  readonly activePowerUps = signal<FallingPowerUpType[]>([]);

  readonly comboMultiplier = computed(() => Math.max(1, this.combo()));

  private config: FallingNumbersConfig = DEFAULT_CONFIG;
  private spawnTimer: ReturnType<typeof setInterval> | null = null;
  private reapTimer: ReturnType<typeof setInterval> | null = null;
  private sequence = 0;
  private powerUpExpiresAt: Partial<Record<FallingPowerUpType, number>> = {};

  configure(
    partialConfig: Partial<FallingNumbersConfig> &
      Pick<FallingNumbersConfig, 'target' | 'difficulty'>
  ): void {
    const normalizedDifficulty = clamp(Math.round(partialConfig.difficulty), 1, 100);
    const normalizedTarget = Number.isFinite(partialConfig.target)
      ? Math.round(partialConfig.target)
      : DEFAULT_CONFIG.target;

    // STREAM FIX — ensure valid numbers
    const rawStream = (partialConfig.stream ?? DEFAULT_CONFIG.stream)
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v))
      .map((v) => Math.round(v));

    // GUARANTEE: stream contains target
    if (!rawStream.includes(normalizedTarget)) {
      rawStream.push(normalizedTarget);
    }

    const safeStream = rawStream.length > 0
      ? rawStream
      : this.buildFallbackStream(normalizedTarget);

    // VALID POWER-UPS ONLY
    const safePowerUps = uniquePowerUps(
      (partialConfig.powerUps ?? DEFAULT_CONFIG.powerUps).filter(
        (value): value is FallingPowerUpType =>
          value === 'magnet' || value === 'slow-mo' || value === 'bomb'
      )
    );

    this.config = {
      target: normalizedTarget,
      stream: safeStream,
      difficulty: normalizedDifficulty,
      combosEnabled: partialConfig.combosEnabled ?? DEFAULT_CONFIG.combosEnabled,
      powerUps: safePowerUps,
    };

    this.target.set(this.config.target);
  }

  start(): void {
    if (this.isRunning()) return;

    this.stop(false);
    this.isRunning.set(true);

    const spawnEveryMs = this.getSpawnIntervalMs();
    this.spawnNumber();

    this.spawnTimer = setInterval(() => this.spawnNumber(), spawnEveryMs);

    this.reapTimer = setInterval(() => {
      this.reapExpiredNumbers();
      this.refreshActivePowerUps();
      this.applyMagnetAutoCatch();
    }, 120);
  }

  stop(resetScore = true): void {
    if (this.spawnTimer) clearInterval(this.spawnTimer);
    if (this.reapTimer) clearInterval(this.reapTimer);

    this.spawnTimer = null;
    this.reapTimer = null;

    this.isRunning.set(false);
    this.numbers.set([]);
    this.combo.set(0);
    if (resetScore) this.score.set(0);

    this.activePowerUps.set([]);
    this.powerUpExpiresAt = {};
  }

  tap(id: string): void {
    if (!this.isRunning()) return;

    const number = this.numbers().find((item) => item.id === id);
    if (!number) return;

    this.numbers.update((items) => items.filter((item) => item.id !== id));

    const isCorrect = number.value === this.target();
    if (isCorrect) {
      this.onCorrectHit();
    } else {
      this.onMiss();
    }
  }

  private onCorrectHit(): void {
    const nextCombo = this.config.combosEnabled ? this.combo() + 1 : 1;
    this.combo.set(nextCombo);

    const points = 10 * Math.max(1, nextCombo);
    this.score.update((value) => value + points);

    if (nextCombo > 0 && nextCombo % 5 === 0) {
      this.tryActivatePowerUp();
      return;
    }

    if (Math.random() < 0.12) {
      this.tryActivatePowerUp();
    }
  }

  private onMiss(): void {
    this.combo.set(0);
  }

  private spawnNumber(): void {
    if (!this.isRunning()) return;

    const now = Date.now();
    const fallDurationMs = this.getFallDurationMs();

    const number: FallingNumber = {
      id: `fall-${this.sequence++}`,
      value: pickOne(this.config.stream),
      x: randomInt(6, 92),
      drift: randomInt(-22, 22),
      speed: fallDurationMs / 1000,
      spawnedAt: now,
      expiresAt: now + fallDurationMs + 200,
    };

    this.numbers.update((items) => [...items, number].slice(-18));
  }

  private reapExpiredNumbers(): void {
    const now = Date.now();
    let missedTarget = false;

    this.numbers.update((items) => {
      const keep: FallingNumber[] = [];
      for (const item of items) {
        const expired = item.expiresAt <= now;
        if (!expired) {
          keep.push(item);
        } else if (item.value === this.target()) {
          missedTarget = true;
        }
      }
      return keep;
    });

    if (missedTarget) this.onMiss();
  }

  private applyMagnetAutoCatch(): void {
    if (!this.isPowerUpActive('magnet')) return;

    const now = Date.now();
    const candidate = this.numbers().find((item) => {
      const lifetime = Math.max(1, item.expiresAt - item.spawnedAt);
      const progress = (now - item.spawnedAt) / lifetime;
      return item.value === this.target() && progress >= 0.55;
    });

    if (!candidate) return;

    this.numbers.update((items) => items.filter((item) => item.id !== candidate.id));
    this.onCorrectHit();
  }

  private tryActivatePowerUp(): void {
    if (this.config.powerUps.length === 0) return;

    const nextPowerUp = pickOne(this.config.powerUps);
    const durationMs = POWER_UP_DURATION_MS[nextPowerUp];

    this.powerUpExpiresAt[nextPowerUp] = Date.now() + durationMs;
    this.refreshActivePowerUps();

    if (nextPowerUp === 'bomb') {
      this.numbers.update((items) => items.filter((item) => item.value === this.target()));
    }
  }

  private refreshActivePowerUps(): void {
    const now = Date.now();
    const active = Object.entries(this.powerUpExpiresAt)
      .filter(([, expiresAt]) => typeof expiresAt === 'number' && expiresAt > now)
      .map(([key]) => key as FallingPowerUpType);

    this.activePowerUps.set(active);
  }

  private isPowerUpActive(type: FallingPowerUpType): boolean {
    const expiresAt = this.powerUpExpiresAt[type];
    return typeof expiresAt === 'number' && expiresAt > Date.now();
  }

  private getSpawnIntervalMs(): number {
    const base = 1500 - this.config.difficulty * 8;
    return clamp(base, 320, 1600);
  }

  private getFallDurationMs(): number {
    const base = 4400 - this.config.difficulty * 20;
    const slowMoMultiplier = this.isPowerUpActive('slow-mo') ? 1.5 : 1;
    return clamp(Math.round(base * slowMoMultiplier), 1300, 5200);
  }

  private buildFallbackStream(target: number): number[] {
    return [target - 3, target - 2, target - 1, target, target + 1, target + 2, target + 3].map(
      (value) => Math.max(0, value)
    );
  }
}
