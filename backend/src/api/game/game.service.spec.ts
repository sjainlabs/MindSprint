import { describe, expect, it } from 'vitest';
import { getGameChallenge } from './game.service';

describe('game.service', () => {
  it('returns a game challenge with adaptive and gamified fields', async () => {
    const challenge = await getGameChallenge({
      studentId: 'student-demo',
      difficulty: 78,
      streak: 4,
      completedDailyQuestCount: 2,
    });

    expect(challenge.challengeId).toContain('challenge-');
    expect(challenge.prompt.length).toBeGreaterThan(0);
    expect(challenge.options).toContain(challenge.answer);
    expect(challenge.rewards.xp).toBeGreaterThan(0);
    expect(challenge.dailyQuest.target).toBe(3);
    expect(typeof challenge.bossBattle.unlocked).toBe('boolean');
  });
});
