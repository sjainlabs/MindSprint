const request = require('supertest');

const API_BASE = process.env.API_URL || 'http://localhost:3000';

describe('GET /api/insights/topic/:studentId/:topicId - detailed fields', () => {
  test('returns commonErrors and subtopic breakdown when available', async () => {
    const studentId = process.env.TEST_STUDENT_ID || 'demo-student';
    const topicId = process.env.TEST_TOPIC_ID || 'addition';

    const res = await request(API_BASE)
      .get(`/api/insights/topic/${encodeURIComponent(studentId)}/${encodeURIComponent(topicId)}`)
      .expect(200);

    expect(res.body).toBeTruthy();

    // commonErrors is optional, but if present it should be an array with objects
    if (Array.isArray(res.body.commonErrors)) {
      expect(res.body.commonErrors.length).toBeGreaterThanOrEqual(0);
      for (const err of res.body.commonErrors) {
        expect(err).toHaveProperty('count');
        // code or name is helpful for diagnostics
        expect(err.code || err.name || err.id).toBeTruthy();
      }
    }

    // subtopicBreakdown may exist as dedicated field or within subtopics
    const breakdown = res.body.subtopicBreakdown || res.body.subtopics;
    if (Array.isArray(breakdown)) {
      for (const s of breakdown) {
        expect(s).toHaveProperty('subtopicId') || expect(s).toHaveProperty('name');
        // mastery/accuracy if present should be numbers 0-100
        if (typeof s.mastery === 'number') {
          expect(s.mastery).toBeGreaterThanOrEqual(0);
          expect(s.mastery).toBeLessThanOrEqual(100);
        }
        if (typeof s.accuracy === 'number') {
          expect(s.accuracy).toBeGreaterThanOrEqual(0);
          expect(s.accuracy).toBeLessThanOrEqual(100);
        }
      }
    }
  }, 20000);
});

