export interface BossBattleConfig {
  bossId: string;
  title: string;
  maxHp: number;
  difficulty: number;
  phaseCount: number;
  specialAttackIntervalMs: number;
}
