/* eslint-env node */

const request = require('supertest');
const { freshServer } = require('./helpers/freshServer');

async function walletLogin(agent, address = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
  const nr = await agent.post('/api/auth/wander/nonce').send({ address });
  expect(nr.status).toBe(200);

  const vr = await agent
    .post('/api/auth/wander/verify')
    .send({ address, publicKey: 'FAKE_PUBLIC_KEY_BASE64URL', signature: 'TEST' });
  expect(vr.status).toBe(200);
  expect(vr.body).toHaveProperty('walletHash');
  return vr.body.walletHash;
}

describe('Admin tenant config export/import', () => {
  let app;
  let restore;
  let agent;

  beforeAll(() => {
    ({ app, restore } = freshServer({
      GETTY_MULTI_TENANT_WALLET: '1',
      GETTY_WALLET_AUTH_ALLOW_DUMMY: '1',
      GETTY_REQUIRE_SESSION: '1',
      REDIS_URL: '',
      DONT_LOAD_DOTENV: '1',
    }));
    agent = request.agent(app);
  });

  afterAll(() => {
    try {
      restore && restore();
    } catch {}
  });

  test('export returns expected sections and import persists expanded configs', async () => {
    const ns = await walletLogin(agent, 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB');

    const exportRes = await agent.get('/api/admin/tenant/config-export');
    expect(exportRes.status).toBe(200);
    expect(exportRes.body).toHaveProperty('configs');

    const configs = exportRes.body.configs || {};

    expect(configs).toHaveProperty('announcement');
    expect(configs).toHaveProperty('socialmedia');
    expect(configs).toHaveProperty('tip-goal');
    expect(configs).toHaveProperty('last-tip');
    expect(configs).toHaveProperty('raffle');
    expect(configs).toHaveProperty('achievements');
    expect(configs).toHaveProperty('chat');
    expect(configs).toHaveProperty('audio-settings');
    expect(configs).toHaveProperty('audio-library');
    expect(configs).toHaveProperty('channel-analytics');
    expect(configs).toHaveProperty('tip-notification');

    const importPayload = {
      ...exportRes.body,
      configs: {
        ...configs,
        'audio-settings': {
          ...(configs['audio-settings'] || {}),
          __testFlag: true,
        },
        'channel-analytics': {
          ...(configs['channel-analytics'] || {}),
          __testFlag: true,
        },
      },
    };

    const importRes = await agent.post('/api/admin/tenant/config-import').send(importPayload);
    expect(importRes.status).toBe(200);
    expect(importRes.body).toHaveProperty('results');
    expect(importRes.body.results).toHaveProperty('audio-settings');
    expect(importRes.body.results['audio-settings']).toMatchObject({ success: true });

    expect(app).toHaveProperty('store');
    const audioStored = await app.store.getConfig(ns, 'audio-settings.json', null);
    expect(audioStored).toBeTruthy();
    expect(audioStored).toHaveProperty('data');
    expect(audioStored.data).toHaveProperty('__testFlag', true);

    const channelStored = await app.store.getConfig(ns, 'channel-analytics-config.json', null);
    expect(channelStored).toBeTruthy();
    expect(channelStored).toHaveProperty('data');
    expect(channelStored.data).toHaveProperty('__testFlag', true);
  });

  test('import accepts camelCase keys for kebab-case configs', async () => {
    const ns = await walletLogin(agent, 'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC');

    const importRes = await agent.post('/api/admin/tenant/config-import').send({
      version: '1.1',
      timestamp: new Date().toISOString(),
      configs: {
        audioSettings: { __camelOk: true },
      },
    });

    expect(importRes.status).toBe(200);
    expect(importRes.body).toHaveProperty('results');
    expect(importRes.body.results).toHaveProperty('audio-settings');
    expect(importRes.body.results['audio-settings']).toMatchObject({ success: true });

    const audioStored = await app.store.getConfig(ns, 'audio-settings.json', null);
    expect(audioStored).toBeTruthy();
    expect(audioStored.data).toHaveProperty('__camelOk', true);
  });
});
