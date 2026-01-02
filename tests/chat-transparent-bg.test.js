const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { freshServer } = require('./helpers/freshServer');
const { loadTenantConfig } = require('../lib/tenant-config');
let appRef; let restoreBaseline;

const CONFIG_DIR = process.env.GETTY_CONFIG_DIR ? process.env.GETTY_CONFIG_DIR : path.join(process.cwd(), 'config');
const CONFIG_PATH = path.join(CONFIG_DIR, 'chat-config.json');

async function readConfigFile() {
  const result = await loadTenantConfig({ ns: { admin: null } }, null, CONFIG_PATH, 'chat-config.json');
  return result.data?.data ? result.data.data : result.data;
}

describe('Chat config transparent background', () => {
  let server; let agent;
  beforeAll(async () => {
    ({ app: appRef, restore: restoreBaseline } = freshServer({ REDIS_URL: null, GETTY_REQUIRE_SESSION: null, GETTY_ENFORCE_OWNER_WRITES: '0', GETTY_REQUIRE_ADMIN_WRITE: '0' }));
    if (appRef.startTestServer) {
      server = await appRef.startTestServer();
      agent = request(server);
    } else {
      agent = request(appRef);
    }
  });
  afterAll(done => { try { restoreBaseline && restoreBaseline(); } catch {} if (server) server.close(done); else done(); });

  test('saves and retrieves transparent background', async () => {
    try { if (fs.existsSync(CONFIG_PATH)) fs.unlinkSync(CONFIG_PATH); } catch { /* ignore */ }

    const basePayload = {
      chatUrl: 'wss://relay.example/ws',
      bgColor: 'transparent',
    };

    const res1 = await agent.post('/api/chat').send(basePayload);
    expect(res1.status).toBe(200);
    expect(res1.body).toHaveProperty('success', true);

    const onDisk1 = await readConfigFile();
    expect(onDisk1.bgColor).toBe('transparent');

    const resGet = await agent.get('/api/chat-config');
    expect(resGet.status).toBe(200);
    expect(resGet.body.bgColor).toBe('transparent');
  });

  test('saves and retrieves solid background', async () => {
    const basePayload = {
      chatUrl: 'wss://relay.example/ws',
      bgColor: '#123456',
    };

    const res1 = await agent.post('/api/chat').send(basePayload);
    expect(res1.status).toBe(200);
    expect(res1.body).toHaveProperty('success', true);

    const onDisk1 = await readConfigFile();
    expect(onDisk1.bgColor).toBe('#123456');

    const resGet = await agent.get('/api/chat-config');
    expect(resGet.status).toBe(200);
    expect(resGet.body.bgColor).toBe('#123456');
  });
});
