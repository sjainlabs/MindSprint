const request = require('supertest');

const API_BASE = process.env.API_URL || 'http://localhost:3000';

describe('GET /api/insights/topic/:studentId (list)', () => {
  test('returns array of topic insights and validates mastery/accuracy fields', async () => {
    const studentId = process.env.TEST_STUDENT_ID || 'demo-student';

    const res = await request(API_BASE).get(`/api/insights/topic/${encodeURIComponent(studentId)}`).expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length === 0) return;

    for (const item of res.body) {
      // item should have either mastery or masteryProgress and accuracy
      const hasMastery = typeof item.mastery === 'number' || typeof item.masteryProgress === 'number';
      expect(hasMastery).toBe(true);

      const accuracy = typeof item.accuracy === 'number' ? item.accuracy : undefined;
      if (accuracy !== undefined) {
        expect(accuracy).toBeGreaterThanOrEqual(0);
        expect(accuracy).toBeLessThanOrEqual(100);
      }

      // normalize mastery prop for value checks
      const masteryVal = typeof item.mastery === 'number' ? item.mastery : item.masteryProgress;
      expect(typeof masteryVal).toBe('number');
      expect(masteryVal).toBeGreaterThanOrEqual(0);
      expect(masteryVal).toBeLessThanOrEqual(100);
    }
  }, 20000);
});

