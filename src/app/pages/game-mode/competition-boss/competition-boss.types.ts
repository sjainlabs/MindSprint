export interface CompetitionBossConfig {
  bossId: string;
  title: string;
  maxHp: number;
  difficulty: number;
  phaseCount: number;
  specialAttackIntervalMs: number;
  competitorDps: number;
}

export type CompetitionBossOutcome =
  | 'in-progress'
  | 'player-victory'
  | 'competitor-victory'
  | 'player-defeat';
