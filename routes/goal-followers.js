const path = require('path');
const { z } = require('zod');
const { loadTenantConfig, saveTenantConfig } = require('../lib/tenant-config');
const { isOpenTestMode } = require('../lib/test-open-mode');

const CONFIG_FILENAME = 'goal-followers-config.json';

const HOSTED_CURRENT_CACHE_TTL_SECONDS = 60;

function isHexClaimId(value) {
  return typeof value === 'string' && /^[a-f0-9]{40}$/i.test(value.trim());
}

function normalizeHexColor(value, fallback = '#00ff7f') {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();

  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(trimmed)) return trimmed;
  return fallback;
}

function resolveStore(app) {
  try {
    if (app && typeof app.get === 'function') return app.get('store') || null;
  } catch {}
  return null;
}

function resolveAuthSecrets(raw = {}) {
  const envAuthToken = process.env.ODYSEE_ANALYTICS_AUTH_TOKEN || '';
  const envIdToken = process.env.ODYSEE_ANALYTICS_ID_TOKEN || '';
  const envLbryId = process.env.ODYSEE_ANALYTICS_LBRY_ID || '';

  return {
    authToken: envAuthToken || raw.authToken || '',
    idToken: envIdToken || raw.idToken || '',
    lbryId: envLbryId || raw.lbryId || '',
    envOverrides: {
      authToken: !!envAuthToken,
      idToken: !!envIdToken,
      lbryId: !!envLbryId,
    },
  };
}

function getOdyseeDeviceCookieName() {
  try {
    return (process.env.ODYSEE_DEVICE_COOKIE || 'getty_odysee_auth_token').trim();
  } catch {
    return 'getty_odysee_auth_token';
  }
}

function readOdyseeAuthTokenFromCookie(req) {
  try {
    const name = getOdyseeDeviceCookieName();
    const raw = req?.cookies?.[name];
    return typeof raw === 'string' ? raw.trim() : '';
  } catch {
    return '';
  }
}

async function loadOdyseeAuthFromTenant(req, store) {
  try {
    const cfgFile = path.join(process.cwd(), 'config', 'channel-analytics-config.json');
    const loaded = await loadTenantConfig(req, store, cfgFile, 'channel-analytics-config.json');
    const raw = loaded?.data || {};
    const resolved = resolveAuthSecrets(raw);
    if (resolved.authToken) return resolved;
    const cookieToken = readOdyseeAuthTokenFromCookie(req);
    if (cookieToken) {
      return {
        ...resolved,
        authToken: cookieToken,
      };
    }
    return resolved;
  } catch {
    const resolved = resolveAuthSecrets({});
    const cookieToken = readOdyseeAuthTokenFromCookie(req);
    if (cookieToken) {
      return {
        ...resolved,
        authToken: cookieToken,
      };
    }
    return resolved;
  }
}

function normalizeConfig(raw = {}) {
  const base = raw && typeof raw === 'object' ? raw : {};
  const widthRaw = Number(base.width);
  const heightRaw = Number(base.height);
  const borderRadiusRaw = Number(base.borderRadius);
  const titleRaw = typeof base.title === 'string' ? base.title.trim() : '';

  return {
    title: titleRaw ? titleRaw.slice(0, 40) : '',
    goal: Number.isFinite(Number(base.goal)) ? Math.max(1, Math.floor(Number(base.goal))) : 100,
    currentFollowers: Number.isFinite(Number(base.currentFollowers))
      ? Math.max(0, Math.floor(Number(base.currentFollowers)))
      : 0,
    claimId: typeof base.claimId === 'string' ? base.claimId.trim() : '',
    color: normalizeHexColor(base.color, '#00ff7f'),
    bgColor: normalizeHexColor(base.bgColor, '#080c10'),
    borderRadius: Number.isFinite(borderRadiusRaw) ? Math.max(0, Math.min(borderRadiusRaw, 999)) : 16,
    width: Number.isFinite(widthRaw) ? Math.max(1, Math.min(widthRaw, 1920)) : 560,
    height: Number.isFinite(heightRaw) ? Math.max(1, Math.min(heightRaw, 1080)) : 140,
    updatedAt: base.updatedAt || null,
  };
}

function sanitizeConfigForClient(raw = {}, extras = {}) {
  const cfg = normalizeConfig(raw);
  return {
    title: cfg.title,
    goal: cfg.goal,
    claimId: cfg.claimId,
    color: cfg.color,
    bgColor: cfg.bgColor,
    borderRadius: cfg.borderRadius,
    width: cfg.width,
    height: cfg.height,
    currentFollowers: typeof extras.currentFollowers === 'number' ? extras.currentFollowers : cfg.currentFollowers,
    hasAuthToken: !!extras.hasAuthToken,
    updatedAt: cfg.updatedAt,
  };
}

function clamp(n, min, max) {
  const value = Number(n);
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function isHostedMode() {
  return !!process.env.REDIS_URL || process.env.GETTY_REQUIRE_SESSION === '1';
}

function getFollowersCurrentCacheKey(ns, claimId) {
  const safeNs = String(ns || '').replace(/[^a-zA-Z0-9:_-]/g, '_');
  const safeClaim = String(claimId || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `getty:goalFollowers:current:${safeNs}:${safeClaim}`;
}

function registerGoalFollowersRoutes(app, strictLimiter, options = {}) {
  const configDir = options.configDir || path.join(process.cwd(), 'config');
  const CONFIG_FILE_PATH = path.join(configDir, CONFIG_FILENAME);
  const wss = options.wss || null;

  const schema = z.object({
    title: z.string().max(40).optional().default(''),
    goal: z.coerce.number().int().positive(),
    claimId: z.string().optional().default(''),
    color: z.string().optional().default('#00ff7f'),
    bgColor: z.string().optional().default('#080c10'),
    borderRadius: z.coerce.number().optional().default(16),
    width: z.coerce.number().optional().default(560),
    height: z.coerce.number().optional().default(140),
  });

  function hasSession(req) {
    return !!(req?.ns?.admin || req?.ns?.pub);
  }

  function hostedRequiresSession() {
    return isHostedMode() && !isOpenTestMode();
  }

  async function resolveNsFromWidgetToken(req) {
    const tokenParam =
      typeof req.query?.widgetToken === 'string' && req.query.widgetToken.trim()
        ? req.query.widgetToken.trim()
        : typeof req.query?.token === 'string' && req.query.token.trim()
          ? req.query.token.trim()
          : '';
    if (!tokenParam) return;
    const store = resolveStore(req.app);
    if (!store) return;
    try {
      const walletHash = await store.get(tokenParam, 'walletHash');
      if (walletHash) {
        req.ns = req.ns || {};
        req.ns.pub = walletHash;
      }
    } catch (e) {
      try {
        console.warn('[goal-followers] Failed to resolve widgetToken:', e.message);
      } catch {}
    }
  }

  app.get('/api/goal-followers', strictLimiter, async (req, res) => {
    try {
      await resolveNsFromWidgetToken(req);
      if (hostedRequiresSession() && !hasSession(req)) {
        return res.status(401).json({ error: 'no_session' });
      }

      const store = resolveStore(req.app);
      const loaded = await loadTenantConfig(req, store, CONFIG_FILE_PATH, CONFIG_FILENAME);
      const cfg = loaded?.data || {};

      const auth = await loadOdyseeAuthFromTenant(req, store);
      const out = sanitizeConfigForClient(cfg, { hasAuthToken: !!auth.authToken });

      const goal = Number(out.goal) || 0;
      const current = Number(out.currentFollowers) || 0;
      const progress = goal > 0 ? Math.min(100, Math.max(0, (current / goal) * 100)) : 0;

      return res.json({ success: true, ...out, progress });
    } catch (err) {
      if (err?.code === 'CONFIGURATION_BLOCKED') {
        return res.status(403).json({
          success: false,
          error: 'CONFIGURATION_BLOCKED',
          message: 'This configuration has been disabled by a moderator.',
          details: err.details || {},
        });
      }
      return res.status(500).json({ error: 'goal_followers_load_failed', details: err?.message });
    }
  });

  app.post('/api/goal-followers', strictLimiter, async (req, res) => {
    try {
      if (hostedRequiresSession() && !hasSession(req)) {
        return res.status(401).json({ error: 'no_session' });
      }

      const parsed = schema.safeParse(req.body || {});
      if (!parsed.success) {
        return res.status(400).json({ error: 'validation_failed', details: parsed.error.flatten() });
      }

      const next = parsed.data;
      const normalized = {
        title: typeof next.title === 'string' ? next.title.trim().slice(0, 40) : '',
        goal: clamp(next.goal, 1, 1_000_000_000),
        claimId: typeof next.claimId === 'string' ? next.claimId.trim() : '',
        color: normalizeHexColor(next.color, '#00ff7f'),
        bgColor: normalizeHexColor(next.bgColor, '#080c10'),
        borderRadius: clamp(next.borderRadius, 0, 999),
        width: clamp(next.width, 1, 1920),
        height: clamp(next.height, 1, 1080),
        updatedAt: new Date().toISOString(),
      };

      if (normalized.claimId && !isHexClaimId(normalized.claimId)) {
        return res.status(400).json({ error: 'invalid_claim_id' });
      }

      const store = resolveStore(req.app);
      await saveTenantConfig(req, store, CONFIG_FILE_PATH, CONFIG_FILENAME, normalized);

      try {
        const nsToken = req?.ns?.admin || req?.ns?.pub || null;
        const cacheEnabled = isHostedMode() && !isOpenTestMode();
        const cacheKey =
          cacheEnabled && nsToken && normalized.claimId
            ? getFollowersCurrentCacheKey(nsToken, normalized.claimId)
            : '';
        if (cacheKey && store && store.redis) {
          await store.redis.del(cacheKey);
        }
      } catch {}

      const auth = await loadOdyseeAuthFromTenant(req, store);
      const out = sanitizeConfigForClient(normalized, { hasAuthToken: !!auth.authToken });

      try {
        const nsToken = req?.ns?.admin || req?.ns?.pub || null;
        const goal = Number(out.goal) || 0;
        const current = Number(out.currentFollowers) || 0;
        const progress = goal > 0 ? Math.min(100, Math.max(0, (current / goal) * 100)) : 0;
        if (nsToken && typeof wss?.broadcast === 'function') {
          wss.broadcast(nsToken, { type: 'goalFollowersUpdate', data: { ...out, progress } });
        }
      } catch {}

      return res.json({ success: true, ...out });
    } catch (err) {
      if (err?.code === 'CONFIGURATION_BLOCKED') {
        return res.status(403).json({
          success: false,
          error: 'CONFIGURATION_BLOCKED',
          message: 'This configuration has been disabled by a moderator.',
          details: err.details || {},
        });
      }
      return res.status(500).json({ error: 'goal_followers_save_failed', details: err?.message });
    }
  });

  app.get('/api/goal-followers/current', strictLimiter, async (req, res) => {
    try {
      await resolveNsFromWidgetToken(req);
      if (hostedRequiresSession() && !hasSession(req)) {
        return res.status(401).json({ error: 'no_session' });
      }

      const store = resolveStore(req.app);
      const loaded = await loadTenantConfig(req, store, CONFIG_FILE_PATH, CONFIG_FILENAME);
      const cfg = normalizeConfig(loaded?.data || {});

      const nsToken = req?.ns?.admin || req?.ns?.pub || null;
      const cacheEnabled = isHostedMode() && !isOpenTestMode();
      const cacheKey =
        cacheEnabled && nsToken && cfg.claimId ? getFollowersCurrentCacheKey(nsToken, cfg.claimId) : '';
      if (cacheKey && store && store.redis) {
        try {
          const cached = await store.redis.get(cacheKey);
          if (cached && cached !== 'null' && cached !== 'undefined') {
            const cachedValue = Number(cached);
            const currentFollowers = Number.isFinite(cachedValue)
              ? Math.max(0, Math.floor(cachedValue))
              : 0;
            return res.json({ active: true, currentFollowers, cached: true });
          }
        } catch {}
      }

      const auth = await loadOdyseeAuthFromTenant(req, store);
      if (!auth.authToken || !cfg.claimId) {
        return res.json({
          active: false,
          reason: !cfg.claimId ? 'missing_claim_id' : 'missing_auth',
          currentFollowers: 0,
        });
      }

      const { fetchChannelSubscriberCount, fetchChannelStats } = require('../services/channel-analytics');
      let count = null;
      let resolvedFromUpstream = false;

      try {
        const direct = await fetchChannelSubscriberCount({
          authToken: auth.authToken,
          claimId: cfg.claimId,
          idToken: auth.idToken || undefined,
          lbryId: auth.lbryId || undefined,
        });
        const numeric = Number(direct);
        if (Number.isFinite(numeric) && numeric >= 0) {
          count = numeric;
          resolvedFromUpstream = true;
        }
      } catch {
        /* noop */
      }

      if (!resolvedFromUpstream) {
        try {
          const stats = await fetchChannelStats({
            authToken: auth.authToken,
            claimId: cfg.claimId,
          });
          const subs = Number(stats?.ChannelSubs);
          if (Number.isFinite(subs) && subs >= 0) {
            count = subs;
            resolvedFromUpstream = true;
          }
        } catch {
          /* noop */
        }
      }

      const prevFollowers = Number.isFinite(Number(cfg.currentFollowers))
        ? Math.max(0, Math.floor(Number(cfg.currentFollowers)))
        : 0;

      if (!resolvedFromUpstream) {
        if (prevFollowers > 0) {
          return res.json({
            active: true,
            currentFollowers: prevFollowers,
            stale: true,
            reason: 'upstream_failed',
          });
        }
        return res.json({
          active: false,
          currentFollowers: 0,
          stale: true,
          reason: 'upstream_failed',
        });
      }

      const currentFollowers = Number.isFinite(Number(count)) ? Math.max(0, Math.floor(Number(count))) : 0;

      if (cacheKey && store && store.redis) {
        try {
          await store.redis.set(cacheKey, String(currentFollowers), 'EX', HOSTED_CURRENT_CACHE_TTL_SECONDS);
        } catch {}
      }

      if (currentFollowers !== prevFollowers) {
        const nextCfg = { ...cfg, currentFollowers, updatedAt: cfg.updatedAt || null };
        await saveTenantConfig(req, store, CONFIG_FILE_PATH, CONFIG_FILENAME, nextCfg);

        try {
          if (nsToken && typeof wss?.broadcast === 'function') {
            wss.broadcast(nsToken, {
              type: 'goalFollowersCurrentUpdate',
              data: { active: true, currentFollowers },
            });
          }
        } catch {}
      }

      return res.json({ active: true, currentFollowers });
    } catch (err) {
      return res.status(502).json({ error: 'followers_fetch_failed', details: err?.message });
    }
  });
}

module.exports = registerGoalFollowersRoutes;
