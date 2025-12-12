const request = require('supertest');
const app = require('../server');

describe('Achievement channel group', () => {
  test('status includes follower-based channel achievements', async () => {
    const res = await request(app).get('/api/achievements/status');
    expect(res.status).toBe(200);

    const items = Array.isArray(res.body.items) ? res.body.items : [];
    const channelItems = items.filter((it) => it && it.category === 'channel');

    expect(channelItems).toHaveLength(6);

    const targets = channelItems
      .map((it) => it.progress && typeof it.progress.target === 'number' ? it.progress.target : null)
      .filter((n) => typeof n === 'number')
      .sort((a, b) => a - b);

    expect(targets).toEqual([10, 100, 1000, 10000, 50000, 100000]);
  });

  test('poll-channel endpoint is available', async () => {
    const res = await request(app)
      .post('/api/achievements/poll-channel')
      .set('Cookie', ['getty_admin_token=dummy']);
    expect(res.status).toBe(200);
    expect(res.body && res.body.ok).toBe(true);
  });
});
