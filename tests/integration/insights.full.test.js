const request = require('supertest');

const API_BASE = process.env.API_URL || 'http://localhost:3000';

describe('GET /api/insights/full/:studentId/:topicId', () => {
  test('returns full insights shape for existing student and topic', async () => {
    const studentId = process.env.TEST_STUDENT_ID || 'demo-student';
    const topicId = process.env.TEST_TOPIC_ID || 'addition';

    const res = await request(API_BASE).get(`/api/insights/full/${encodeURIComponent(studentId)}/${encodeURIComponent(topicId)}`).expect(200);

    expect(res.body).toBeTruthy();
    // required top-level fields
    expect(res.body).toHaveProperty('studentId');
    expect(typeof res.body.studentId).toBe('string');

    expect(res.body).toHaveProperty('topics');
    expect(Array.isArray(res.body.topics)).toBe(true);

    if (res.body.topics.length > 0) {
      const t = res.body.topics[0];
      expect(t).toHaveProperty('topicId');
      expect(t).toHaveProperty('name');
      expect(t).toHaveProperty('mastery');
      expect(typeof t.mastery).toBe('number');
      expect(t).toHaveProperty('accuracy');
      expect(typeof t.accuracy).toBe('number');
      expect(t).toHaveProperty('attempts');
      expect(typeof t.attempts).toBe('number');
      expect(t).toHaveProperty('errors');
      expect(typeof t.errors).toBe('number');
    }

    // recommendations optional but if present must be array
    if (res.body.recommendations) {
      expect(Array.isArray(res.body.recommendations)).toBe(true);
    }
  }, 20000);

  test('handles missing or invalid studentId with an error response', async () => {
    const badId = 'non-existent-student-xyz-123';
    const topicId = 'addition';

    const res = await request(API_BASE).get(`/api/insights/full/${encodeURIComponent(badId)}/${encodeURIComponent(topicId)}`);

    // Accept either 4xx or 5xx depending on backend implementation, but should not be 200
    expect(res.status).not.toBe(200);
    // If body contains error message, ensure it's a string
    if (res.body && res.body.error) {
      expect(typeof res.body.error === 'string' || typeof res.body.error.message === 'string').toBe(true);
    }
  }, 20000);
});

