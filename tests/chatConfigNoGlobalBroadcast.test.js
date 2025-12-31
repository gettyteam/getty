const request = require('supertest');
const { freshServer } = require('./helpers/freshServer');

let appRef;
let restoreBaseline;

describe('Chat config broadcast isolation', () => {
  let server;
  let agent;
  let wssMock;

  beforeAll(async () => {
    ({ app: appRef, restore: restoreBaseline } = freshServer({
      REDIS_URL: null,
      GETTY_REQUIRE_SESSION: null,
      GETTY_ENFORCE_OWNER_WRITES: '0',
      GETTY_REQUIRE_ADMIN_WRITE: '0',
    }));

    wssMock = { broadcast: jest.fn() };
    try {
      if (typeof appRef.set === 'function') appRef.set('wss', wssMock);
    } catch {}

    if (typeof appRef.startTestServer === 'function') {
      server = await appRef.startTestServer();
      agent = request(server);
    } else {
      agent = request(appRef);
    }
  });

  afterAll((done) => {
    try {
      restoreBaseline && restoreBaseline();
    } catch {}
    if (server) server.close(done);
    else done();
  });

  test('POST /api/chat without ns never broadcasts globally', async () => {
    const payload = {
      chatUrl: 'wss://relay.example/ws',
      odyseeWsUrl: 'https://odysee.com/$/api',
      bgColor: '#111111',
      msgBgColor: '#222222',
      msgBgAltColor: '#333333',
      borderColor: '#444444',
      textColor: '#555555',
      usernameColor: '#666666',
      usernameBgColor: '#777777',
      donationColor: '#888888',
      donationBgColor: '#999999',
      themeCSS: '.chat { color: #fff; }',
      avatarRandomBg: true,
    };

    const res = await agent.post('/api/chat').send(payload);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);

    const calls = (wssMock.broadcast && wssMock.broadcast.mock && wssMock.broadcast.mock.calls)
      ? wssMock.broadcast.mock.calls
      : [];

    expect(calls.some((c) => c && c[0] === null)).toBe(false);
  });
});
