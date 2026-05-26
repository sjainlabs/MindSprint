const request = require('supertest');

const API_BASE = process.env.API_URL || 'http://localhost:3000';

describe('GET /api/insights/topic/:studentId/:topicId', () => {
  test('returns topic insight shape and valid mastery/accuracy numbers', async () => {
    const studentId = process.env.TEST_STUDENT_ID || 'demo-student';
    const topicId = process.env.TEST_TOPIC_ID || 'addition';

    const res = await request(API_BASE).get(`/api/insights/topic/${encodeURIComponent(studentId)}/${encodeURIComponent(topicId)}`).expect(200);

    expect(res.body).toBeTruthy();
    // required fields for TopicInsight
    expect(res.body).toHaveProperty('topicId');
    expect(res.body).toHaveProperty('name');
    expect(res.body).toHaveProperty('mastery');
    expect(res.body).toHaveProperty('accuracy');
    expect(res.body).toHaveProperty('avgTimeSeconds');
    expect(res.body).toHaveProperty('attempts');
    expect(res.body).toHaveProperty('errors');

    // sanity checks: mastery and accuracy are numbers between 0 and 100
    expect(typeof res.body.mastery).toBe('number');
    expect(res.body.mastery).toBeGreaterThanOrEqual(0);
    expect(res.body.mastery).toBeLessThanOrEqual(100);

    expect(typeof res.body.accuracy).toBe('number');
    expect(res.body.accuracy).toBeGreaterThanOrEqual(0);
    expect(res.body.accuracy).toBeLessThanOrEqual(100);

    // if subtopics present, ensure they contain valid mastery numbers
    if (Array.isArray(res.body.subtopics) && res.body.subtopics.length > 0) {
      for (const s of res.body.subtopics) {
        expect(typeof s.mastery).toBe('number');
        expect(s.mastery).toBeGreaterThanOrEqual(0);
        expect(s.mastery).toBeLessThanOrEqual(100);
      }
    }
  }, 20000);
});

