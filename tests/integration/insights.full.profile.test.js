const request = require('supertest');

const API_BASE = process.env.API_URL || 'http://localhost:3000';

describe('GET /api/insights/full/:studentId/:topicId - profile fields', () => {
  test('returns profile fields for a student', async () => {
    const studentId = process.env.TEST_STUDENT_ID || 'demo-student';
    const topicId = process.env.TEST_TOPIC_ID || 'addition';

    const res = await request(API_BASE)
      .get(`/api/insights/full/${encodeURIComponent(studentId)}/${encodeURIComponent(topicId)}`)
      .expect(200);

    expect(res.body).toBeTruthy();

    // Top-level profile fields
    expect(res.body).toHaveProperty('studentId');
    if (res.body.studentName !== undefined) expect(typeof res.body.studentName).toBe('string');
    if (res.body.avatar !== undefined) expect(typeof res.body.avatar).toBe('string');
    if (res.body.grade !== undefined) expect(typeof res.body.grade).toBe('string');
    if (res.body.xp !== undefined) expect(typeof res.body.xp === 'number' || typeof res.body.xp === 'string').toBe(true);
    if (res.body.streak !== undefined) expect(typeof res.body.streak === 'number' || typeof res.body.streak === 'string').toBe(true);
  }, 20000);
});

