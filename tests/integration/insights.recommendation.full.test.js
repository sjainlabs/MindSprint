const request = require('supertest');

const API_BASE = process.env.API_URL || 'http://localhost:3000';

describe('GET /api/insights/recommendation/:studentId/:topicId - full fields', () => {
  test('returns recommendation with all expected fields', async () => {
    const studentId = process.env.TEST_STUDENT_ID || 'demo-student';
    const topicId = process.env.TEST_TOPIC_ID || 'addition';

    const res = await request(API_BASE)
      .get(`/api/insights/recommendation/${encodeURIComponent(studentId)}/${encodeURIComponent(topicId)}`)
      .expect(200);

    expect(res.body).toBeTruthy();

    const body = res.body.recommendation ? res.body.recommendation : res.body;

    // validate core fields
    expect(body).toHaveProperty('recommendedLevel');
    expect(body).toHaveProperty('targetDifficulty');
    expect(body).toHaveProperty('focusOperations');
    expect(body).toHaveProperty('recommendedTopic');
    expect(body).toHaveProperty('recommendedSubtopic');
    expect(body).toHaveProperty('rationale');

    // sanity checks
    if (body.focusOperations) expect(Array.isArray(body.focusOperations)).toBe(true);
    if (body.rationale) expect(Array.isArray(body.rationale) || typeof body.rationale === 'string').toBe(true);
  }, 20000);
});

