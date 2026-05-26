const request = require('supertest');

const API_BASE = process.env.API_URL || 'http://localhost:3000';

describe('GET /api/insights/summary/:studentId/:topicId', () => {
  test('returns a parent summary object (notes/summary) for a student and topic', async () => {
    const studentId = process.env.TEST_STUDENT_ID || 'demo-student';
    const topicId = process.env.TEST_TOPIC_ID || 'addition';

    const res = await request(API_BASE)
      .get(`/api/insights/summary/${encodeURIComponent(studentId)}/${encodeURIComponent(topicId)}`)
      .expect(200);

    expect(res.body).toBeTruthy();

    // The API may return the summary directly or wrapped like { parentSummary: {...} }
    const body = res.body.parentSummary ? res.body.parentSummary : res.body;

    // At minimum we expect some textual summary/notes to be present or at least defined
    if (body.notes !== undefined) {
      expect(typeof body.notes).toBe('string');
    }
    if (body.summary !== undefined) {
      expect(typeof body.summary).toBe('string');
    }

    // recommendedActions is optional but if present should be an array of strings
    if (Array.isArray(body.recommendedActions)) {
      for (const a of body.recommendedActions) {
        expect(typeof a).toBe('string');
      }
    }
  }, 20000);
});

