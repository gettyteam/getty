jest.mock('../services/channel-upload-utils', () => {
  const actual = jest.requireActual('../services/channel-upload-utils');
  const fakeUploads = [
    {
      claimId: 'abc1230000000000000000000000000000000000',
      releaseMs: 1700000000000,
      title: 'First upload',
      description: 'hello world',
      url: 'https://odysee.com/@demo#abc123',
      thumbnailUrl: 'https://thumbs.odycdn.com/demo.png',
      channelHandle: '@demo',
      channelTitle: 'Demo Channel',
    },
  ];
  return {
    ...actual,
    normalizeChannelClaimId: (value) => {
      if (!value || typeof value !== 'string') return '';
      const trimmed = value.trim();
      if (!trimmed) return '';
      return /^[a-fA-F0-9]{6,40}$/.test(trimmed) ? trimmed.toLowerCase() : '';
    },
    fetchRecentChannelUploads: jest.fn(async () => fakeUploads),
    buildUploadPayload: jest.fn((upload) => ({
      title: upload?.title,
      description: upload?.description || '',
      url: upload?.url,
      thumbnailUrl: upload?.thumbnailUrl,
      publishTimestamp: upload?.releaseMs,
      channelHandle: upload?.channelHandle,
      channelTitle: upload?.channelTitle,
    })),
  };
});

const request = require('supertest');
const { freshServer } = require('./helpers/freshServer');

describe('Channel upload integration routes', () => {
  let app;
  let restore;
  beforeAll(() => {
    ({ app, restore } = freshServer({
      GETTY_REQUIRE_SESSION: '1',
      GETTY_TENANT_DEBUG: '1',
      GETTY_REQUIRE_ADMIN_WRITE: '0',
      GETTY_TEST_FORCE_OPEN: '1',
    }));
  });
  afterAll(() => {
    try {
      restore && restore();
    } catch {}
  });

  const basePayload = {
    discordWebhook: 'https://discord.com/api/webhooks/demo/XYZ',
    channelClaimId: 'ABCDEF1234567890ABCDEF1234567890ABCDEF12',
  };

  test('rejects invalid claim id', async () => {
    const res = await request(app)
      .post('/api/external-notifications/channel-upload')
      .send({ ...basePayload, channelClaimId: 'not-valid' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_claim_id');
  });

  test('saves config and masks webhook on GET', async () => {
    const saveRes = await request(app)
      .post('/api/external-notifications/channel-upload')
      .send(basePayload);
    expect(saveRes.status).toBe(200);
    expect(saveRes.body.success).toBe(true);
    expect(saveRes.body.active).toBe(true);

    const getRes = await request(app).get('/api/external-notifications/channel-upload');
    expect(getRes.status).toBe(200);
    const cfg = getRes.body.config;
    expect(cfg.hasDiscordWebhook).toBe(true);
    expect(cfg.discordWebhook).toBe('');
    expect(cfg.channelClaimId).toBe(basePayload.channelClaimId.toLowerCase());
    expect(cfg.sentCount).toBeGreaterThanOrEqual(0);
  });

  test('clears config when webhook removed', async () => {
    const res = await request(app)
      .post('/api/external-notifications/channel-upload')
      .send({ discordWebhook: '', channelClaimId: '' });
    expect(res.status).toBe(200);
    expect(res.body.active).toBe(false);

    const getRes = await request(app).get('/api/external-notifications/channel-upload');
    expect(getRes.status).toBe(200);
    const cfg = getRes.body.config;
    expect(cfg.hasDiscordWebhook).toBe(false);
    expect(cfg.channelClaimId).toBe('');
  });
});
