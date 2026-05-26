const request = require('supertest');

const API_BASE = process.env.API_URL || 'http://localhost:3000';

describe('Modal data load - GET /api/insights/full/:studentId/:topicId', () => {
  test('API returns data suitable for modal rendering', async () => {
    const studentId = process.env.TEST_STUDENT_ID || 'demo-student';
    const topicId = process.env.TEST_TOPIC_ID || 'addition';

    const res = await request(API_BASE).get(`/api/insights/full/${encodeURIComponent(studentId)}/${encodeURIComponent(topicId)}`).expect(200);

    expect(res.body).toBeTruthy();
    expect(res.body).toHaveProperty('studentId');
    expect(res.body).toHaveProperty('topics');
    expect(Array.isArray(res.body.topics)).toBe(true);

    if (res.body.topics.length > 0) {
      const t = res.body.topics[0];
      expect(t).toHaveProperty('topicId');
      expect(t).toHaveProperty('name');
      expect(t).toHaveProperty('mastery');
      expect(t).toHaveProperty('accuracy');
    }
  }, 20000);
});

