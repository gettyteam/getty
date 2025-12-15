const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const request = require('supertest');
const nock = require('nock');
const { freshServer } = require('./helpers/freshServer');

describe('odysee auth login', () => {
  let app;
  let restore;

  beforeEach(() => {
    ({ app, restore } = freshServer({
      REDIS_URL: '',
      GETTY_MULTI_TENANT_WALLET: '1',
      GETTY_REQUIRE_SESSION: '0',
    }));
  });

  afterEach(() => {
    try {
      nock.cleanAll();
    } catch {}
    try {
      restore && restore();
    } catch {}
  });

  test('creates wallet session from auth_token and auto-saves analytics auth token', async () => {
    const agent = request.agent(app);
    const email = 'test@example.com';
    const password = 'password123';
    const authToken = 'auth_token_test_123';
    const walletAddress = 'nu2vtfSxaRzVNcqDD7Jvgol5bZ-d0rO8OHAFe2s4uaM';

    nock('https://api.lbry.com')
      .post('/user/new')
      .reply(200, { data: { auth_token: authToken } });

    nock('https://api.lbry.com')
      .post('/user/signin')
      .reply(200, { data: { success: true } });

    nock('https://api.lbry.com')
      .get('/user/me')
      .query((q) => q && q.auth_token === authToken)
      .reply(200, { data: { arweave_address: walletAddress } });

    const login = await agent.post('/api/auth/odysee/login').send({ email, password });
    expect(login.status).toBe(200);
    expect(login.body.success).toBe(true);
    expect(login.body.walletAddress).toBe(walletAddress);
    expect(login.body.walletHash).toHaveLength(16);
    expect(login.body.widgetToken).toBeTruthy();
    expect(Array.isArray(login.body.capabilities)).toBe(true);
    expect(login.body.capabilities).toContain('config.read');
    expect(login.body.capabilities).not.toContain('config.write');
    expect(login.body.needsWalletVerification).toBe(true);

    const me = await agent.get('/api/auth/wallet/me');
    expect(me.status).toBe(200);
    expect(me.body.address).toBe(walletAddress);
    expect(me.body.walletHash).toHaveLength(16);
    expect(Array.isArray(me.body.capabilities)).toBe(true);
    expect(me.body.capabilities).toContain('config.read');
    expect(me.body.capabilities).not.toContain('config.write');

    const cfg = await agent.get('/config/channel-analytics-config.json');
    expect(cfg.status).toBe(200);
    expect(cfg.body.hasAuthToken).toBe(true);
  });

  test('creates principal session when wallet cannot be detected', async () => {
    const agent = request.agent(app);
    const email = 'test2@example.com';
    const password = 'password123';
    const authToken = 'auth_token_no_wallet';

    nock('https://api.lbry.com')
      .post('/user/new')
      .times(2)
      .reply(200, { data: { auth_token: authToken } });

    nock('https://api.lbry.com')
      .post('/user/signin')
      .times(2)
      .reply(200, { data: { success: true } });

    nock('https://api.lbry.com')
      .get('/user/me')
      .query((q) => q && q.auth_token === authToken)
      .times(2)
      .reply(200, { data: { user: { email } } });

    const login = await agent.post('/api/auth/odysee/login').send({ email, password });
    expect(login.status).toBe(200);
    expect(login.body.success).toBe(true);
    expect(login.body.walletAddress).toBe('');
    expect(typeof login.body.principalAddress).toBe('string');
    expect(login.body.principalAddress.startsWith('odysee:')).toBe(true);
    expect(login.body.needsWalletAddress).toBe(true);
  });

  test('reuses existing wallet session cookie when wallet cannot be detected', async () => {
    const agent = request.agent(app);
    const email = 'cookie@example.com';
    const password = 'password123';
    const authToken = 'auth_token_cookie_wallet';
    const walletAddress = 'nu2vtfSxaRzVNcqDD7Jvgol5bZ-d0rO8OHAFe2s4uaM';

    const walletAuth = require('../lib/wallet-auth');
    const now = Date.now();
    const signed = walletAuth.signSession({
      sid: 'test-sid',
      addr: walletAddress,
      iat: now,
      exp: now + 60_000,
      caps: ['config.read', 'config.write'],
      mode: 'wander',
    });

    nock('https://api.lbry.com')
      .post('/user/new')
      .reply(200, { data: { auth_token: authToken } });

    nock('https://api.lbry.com')
      .post('/user/signin')
      .reply(200, { data: { success: true } });

    nock('https://api.lbry.com')
      .get('/user/me')
      .query((q) => q && q.auth_token === authToken)
      .reply(200, { data: { user: { email } } });

    const login = await agent
      .post('/api/auth/odysee/login')
      .set('Cookie', [`getty_wallet_session=${signed}`])
      .send({ email, password });

    expect(login.status).toBe(200);
    expect(login.body.success).toBe(true);
    expect(login.body.walletAddress).toBe(walletAddress);
    expect(login.body.walletHash).toHaveLength(16);
    expect(Array.isArray(login.body.capabilities)).toBe(true);
    expect(login.body.capabilities).toContain('config.read');
    expect(login.body.capabilities).toContain('config.write');
    expect(login.body.needsWalletVerification).toBe(false);
  });

  test('reuses verified Wander session when Odysee returns same wallet', async () => {
    const agent = request.agent(app);
    const email = 'verified@example.com';
    const password = 'password123';
    const authToken = 'auth_token_verified_wallet';
    const walletAddress = 'nu2vtfSxaRzVNcqDD7Jvgol5bZ-d0rO8OHAFe2s4uaM';

    const walletAuth = require('../lib/wallet-auth');
    const now = Date.now();
    const signed = walletAuth.signSession({
      sid: 'test-sid-verified',
      addr: walletAddress,
      iat: now,
      exp: now + 60_000,
      caps: ['config.read', 'config.write'],
      mode: 'wander',
    });

    nock('https://api.lbry.com').post('/user/new').reply(200, { data: { auth_token: authToken } });
    nock('https://api.lbry.com').post('/user/signin').reply(200, { data: { success: true } });
    nock('https://api.lbry.com')
      .get('/user/me')
      .query((q) => q && q.auth_token === authToken)
      .reply(200, { data: { arweave_address: walletAddress } });

    const login = await agent
      .post('/api/auth/odysee/login')
      .set('Cookie', [`getty_wallet_session=${signed}`])
      .send({ email, password });

    expect(login.status).toBe(200);
    expect(login.body.success).toBe(true);
    expect(Array.isArray(login.body.capabilities)).toBe(true);
    expect(login.body.capabilities).toContain('config.read');
    expect(login.body.capabilities).toContain('config.write');
    expect(login.body.needsWalletVerification).toBe(false);
    expect(login.body.walletAddress).toBe(walletAddress);
  });

  test('rejects invalid auth_token', async () => {
    const agent = request.agent(app);
    const email = 'bad@example.com';
    const password = 'wrongpassword';

    nock('https://api.lbry.com')
      .post('/user/new')
      .reply(200, { data: { auth_token: 'auth_bad_123' } });

    nock('https://api.lbry.com')
      .post('/user/signin')
      .reply(401, { error: 'invalid' });

    const login = await agent.post('/api/auth/odysee/login').send({ email, password });
    expect(login.status).toBe(401);
    expect(login.body.error).toBe('odysee_login_failed');
  });

  test('can switch users by signing out when already signed in', async () => {
    const agent = request.agent(app);
    const walletAddress = 'nu2vtfSxaRzVNcqDD7Jvgol5bZ-d0rO8OHAFe2s4uaM';

    const email1 = 'user1@example.com';
    const email2 = 'user2@example.com';
    const password = 'password123';

    const authToken1 = 'auth_token_user1_123';
    const scope = nock('https://api.lbry.com');

    scope.post('/user/new').reply(200, { data: { auth_token: authToken1 } });
    scope.post('/user/signin').reply(200, { data: { success: true } });
    scope
      .get('/user/me')
      .query((q) => q && q.auth_token === authToken1)
      .reply(200, { data: { arweave_address: walletAddress } });

    const login1 = await agent.post('/api/auth/odysee/login').send({ email: email1, password });
    expect(login1.status).toBe(200);
    expect(login1.body.success).toBe(true);

    scope.post('/user/signin').reply(400, {
      success: false,
      error: 'current user is already signed in, please sign out first to change users.',
      data: null,
    });

    scope.post('/user/signout').reply(200, { data: { success: true } });

    scope.post('/user/signin').reply(200, { data: { success: true } });
    scope
      .get('/user/me')
      .query((q) => q && q.auth_token === authToken1)
      .reply(200, { data: { arweave_address: walletAddress } });

    const login2 = await agent.post('/api/auth/odysee/login').send({ email: email2, password });
    expect(scope.isDone()).toBe(true);
    expect(login2.status).toBe(200);
    expect(login2.body.success).toBe(true);
  });

  test('magic link login is disabled', async () => {
    const agent = request.agent(app);
    const email = 'magic-disabled@example.com';
    const authToken = 'auth_token_magic_disabled_123';

    const scope = nock('https://api.lbry.com');
    scope.post('/user/new').reply(200, { data: { auth_token: authToken } });

    const login = await agent.post('/api/auth/odysee/login').send({ email, useMagicLink: true });
    expect(login.status).toBe(400);
    expect(login.body.error).toBe('magic_link_disabled');
    expect(scope.isDone()).toBe(true);
  });

  test('odysee verify (GET) is non-authenticated and blocked without browser state', async () => {
    const agent = request.agent(app);
    const authToken = 'auth_token_magic_123';
    const email = 'magic@example.com';
    const verificationToken = 'verify_token_123';

    const resp = await agent.get(
      `/odysee/verify?auth_token=${encodeURIComponent(authToken)}&email=${encodeURIComponent(email)}&verification_token=${encodeURIComponent(verificationToken)}&state=wrong`
    );

    expect(resp.status).toBe(400);
    const cookies = resp.headers['set-cookie'] || [];
    expect(cookies.join('\n')).not.toContain('getty_wallet_session=');
  });

  test('odysee verify requires state cookie + explicit POST confirm', async () => {
    const agent = request.agent(app);
    const email = 'magic-confirm@example.com';
    const password = 'password123';
    const authToken = 'auth_token_magic_confirm_123';
    const verificationToken = 'verify_token_abc';

    const scope = nock('https://api.lbry.com');
    scope.post('/user/new').reply(200, { data: { auth_token: authToken } });
    scope.post('/user/signin').reply(409, { error: 'email verification required' });
    scope
      .get('/user/me')
      .query((q) => q && q.auth_token === authToken)
      .reply(401, { error: 'unauthorized' });
    scope.post('/user_email/resend_token').reply(200, { data: { success: true } });

    const login = await agent.post('/api/auth/odysee/login').send({ email, password });
    expect(login.status).toBe(409);
    expect(login.body.error).toBe('email_verification_required');

    const setCookies = login.headers['set-cookie'] || [];
    const stateCookie = setCookies.find((c) => c.startsWith('getty_odysee_verify_state=')) || '';
    const m = stateCookie.match(/getty_odysee_verify_state=([^;]+)/);
    expect(m).toBeTruthy();
    const state = m[1];

    const page = await agent.get(
      `/odysee/verify?auth_token=${encodeURIComponent(authToken)}&email=${encodeURIComponent(email)}&verification_token=${encodeURIComponent(verificationToken)}&state=${encodeURIComponent(state)}`
    );
    expect(page.status).toBe(200);
    expect(String(page.text || '')).toContain('Confirm email verification');
    const pageCookies = page.headers['set-cookie'] || [];
    expect(pageCookies.join('\n')).not.toContain('getty_wallet_session=');

    scope.post('/user_email/confirm').reply(200, { data: { success: true } });

    const confirm = await agent
      .post('/odysee/verify')
      .type('form')
      .send({
        auth_token: authToken,
        email,
        verification_token: verificationToken,
        state,
      });

    expect(confirm.status).toBe(302);
    expect(confirm.headers.location).toContain('reason=odysee_verified');
    const confirmCookies = confirm.headers['set-cookie'] || [];
    expect(confirmCookies.join('\n')).not.toContain('getty_wallet_session=');
    expect(confirmCookies.join('\n')).toContain('getty_odysee_auth_token=');
    expect(scope.isDone()).toBe(true);
  });
});
