import { CompetitionBossEngine } from './competition-boss.engine';

describe('CompetitionBossEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('lets the player defeat the boss first', () => {
    const engine = new CompetitionBossEngine();
    engine.configure({
      bossId: 'boss-1',
      title: 'Tournament Tyrant',
      maxHp: 20,
      difficulty: 1,
      phaseCount: 2,
      specialAttackIntervalMs: 5000,
      competitorDps: 1,
    });

    engine.start();
    engine.playerAttack();

    expect(engine.isPlayerVictory()).toBe(true);
    expect(engine.outcome()).toBe('player-victory');
    expect(engine.isRunning()).toBe(false);
  });

  it('awards the race to the competitor when the competitor lands the final blow', () => {
    const engine = new CompetitionBossEngine();
    engine.configure({
      bossId: 'boss-2',
      title: 'Rival Rush',
      maxHp: 12,
      difficulty: 50,
      phaseCount: 3,
      specialAttackIntervalMs: 5000,
      competitorDps: 40,
    });

    engine.start();
    engine.competitorAttackTick();
    engine.competitorAttackTick();

    expect(engine.isCompetitorVictory()).toBe(true);
    expect(engine.outcome()).toBe('competitor-victory');
  });

  it('damages both racers on boss special attacks and defeats the player at zero hp', () => {
    const engine = new CompetitionBossEngine();
    engine.configure({
      bossId: 'boss-3',
      title: 'Endurance Exam',
      maxHp: 180,
      difficulty: 100,
      phaseCount: 3,
      specialAttackIntervalMs: 1200,
      competitorDps: 8,
    });

    engine.start();
    const initialCompetitorHp = engine.competitorHp();

    vi.advanceTimersByTime(700);
    expect(engine.specialAttackWarning()).toBe(true);

    vi.advanceTimersByTime(6000);

    expect(engine.competitorHp()).toBeLessThan(initialCompetitorHp);
    expect(engine.playerHp()).toBe(0);
    expect(engine.isPlayerDefeat()).toBe(true);
  });
});
