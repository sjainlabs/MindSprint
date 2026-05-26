const request = require('supertest');

const API_BASE = process.env.API_URL || 'http://localhost:3000';

describe('POST /api/insights/submit', () => {
  test('accepts worksheet submission and returns success', async () => {
    const payload = {
      studentId: process.env.TEST_STUDENT_ID || 'demo-student',
      topicId: process.env.TEST_TOPIC_ID || 'addition',
      worksheetId: `ws-${Date.now()}`,
      answers: [
        { questionId: 'q1', answer: '8', correct: true, timeMs: 12000 },
        { questionId: 'q2', answer: '5', correct: true, timeMs: 15000 },
      ],
      metadata: { durationMs: 27000 },
    };

    const res = await request(API_BASE).post('/api/insights/submit').send(payload).expect((r) => {
      if (!(r.status >= 200 && r.status < 300)) throw new Error('Expected 2xx response');
    });

    // minimal expectations about success shape
    expect(res.body).toBeTruthy();
    if (res.body.success !== undefined) expect(res.body.success).toBe(true);
    if (res.body.message !== undefined) expect(typeof res.body.message).toBe('string');
  }, 20000);
});

