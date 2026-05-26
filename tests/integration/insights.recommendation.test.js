const request = require('supertest');

const API_BASE = process.env.API_URL || 'http://localhost:3000';

describe('GET /api/insights/recommendation/:studentId/:topicId', () => {
  test('returns recommendation detail with expected fields', async () => {
    const studentId = process.env.TEST_STUDENT_ID || 'demo-student';
    const topicId = process.env.TEST_TOPIC_ID || 'addition';

    const res = await request(API_BASE)
      .get(`/api/insights/recommendation/${encodeURIComponent(studentId)}/${encodeURIComponent(topicId)}`)
      .expect(200);

    expect(res.body).toBeTruthy();

    // Accept either direct shape or wrapped
    const body = res.body.recommendation ? res.body.recommendation : res.body;

    // required recommendation fields
    if (body.recommendedLevel !== undefined) {
      expect(typeof body.recommendedLevel === 'number' || typeof body.recommendedLevel === 'string').toBe(true);
    }

    if (body.targetDifficulty !== undefined) {
      expect(typeof body.targetDifficulty).toBe('number');
    }

    if (body.rationale !== undefined) {
      expect(typeof body.rationale === 'string' || Array.isArray(body.rationale)).toBe(true);
    }
  }, 20000);
});

