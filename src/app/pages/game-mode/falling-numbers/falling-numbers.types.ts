export type FallingPowerUpType = 'magnet' | 'slow-mo' | 'bomb';

export interface FallingNumber {
  id: string;
  value: number;
  x: number;
  drift: number;
  speed: number;
  spawnedAt: number;
  expiresAt: number;
}

export interface FallingNumbersConfig {
  target: number;
  stream: number[];
  difficulty: number;
  combosEnabled: boolean;
  powerUps: FallingPowerUpType[];
}

export {};

