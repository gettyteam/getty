const path = require('path');

const { canWriteConfig } = require('../lib/authz');
const { loadConfigWithFallback, saveTenantAwareConfig } = require('../lib/tenant');
const { saveTenantConfig } = require('../lib/tenant-config');

const CONFIG_FILENAME = 'dashboard-preferences.json';
const GLOBAL_CONFIG_PATH = path.join(process.cwd(), 'config', CONFIG_FILENAME);

function normalizeViewMode(raw) {
  if (raw === true) return 'custom';
  if (raw === false) return 'classic';
  if (typeof raw !== 'string') return null;
  const v = raw.trim().toLowerCase();
  if (v === 'custom') return 'custom';
  if (v === 'classic') return 'classic';
  return null;
}

function asFiniteNumber(v, fallback = null) {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return n;
}

function clampInt(n, min, max) {
  const v = Math.trunc(n);
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

function sanitizeLayoutItem(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const i = typeof raw.i === 'string' ? raw.i.slice(0, 80) : null;
  const id = typeof raw.id === 'string' ? raw.id.slice(0, 80) : null;
  const type = typeof raw.type === 'string' ? raw.type.slice(0, 40) : null;

  const x = asFiniteNumber(raw.x);
  const y = asFiniteNumber(raw.y);
  const w = asFiniteNumber(raw.w);
  const h = asFiniteNumber(raw.h);

  if (!i || !type) return null;
  if ([x, y, w, h].some((n) => n === null)) return null;

  const xI = clampInt(x, 0, 11);
  const yI = clampInt(y, 0, 5000);
  const wI = clampInt(w, 1, 12);
  const hI = clampInt(h, 1, 5000);

  const isMinimized = raw.isMinimized === true;

  const props = raw.props && typeof raw.props === 'object' && !Array.isArray(raw.props) ? raw.props : {};
  const settings =
    raw.settings && typeof raw.settings === 'object' && !Array.isArray(raw.settings) ? raw.settings : {};

  return { id: id || undefined, i, type, x: xI, y: yI, w: wI, h: hI, isMinimized, props, settings };
}

function sanitizeLayout(rawLayout) {
  if (!Array.isArray(rawLayout)) return null;

  const MAX_ITEMS = 120;
  const cleaned = [];

  for (const item of rawLayout.slice(0, MAX_ITEMS)) {
    const out = sanitizeLayoutItem(item);
    if (out) cleaned.push(out);
  }

  return cleaned;
}

function resolveNamespace(req) {
  const ns = (req && req.ns && (req.ns.admin || req.ns.pub)) || null;
  return typeof ns === 'string' && ns.trim() ? ns.trim() : null;
}

function registerDashboardPreferencesRoutes(app, limiter, options = {}) {
  const { store } = options;

  const hasRedisStore = !!(store && store.redis && typeof store.getConfig === 'function');

  app.get('/api/dashboard/preferences', limiter, async (req, res) => {
    try {
      if (!canWriteConfig(req)) return res.status(403).json({ error: 'forbidden' });

      const ns = resolveNamespace(req);
      if (!ns) return res.status(401).json({ error: 'unauthorized' });

      let existing = null;

      if (hasRedisStore) {
        existing = await store.getConfig(ns, CONFIG_FILENAME, null);
      } else {
        const wrapped = loadConfigWithFallback(req, GLOBAL_CONFIG_PATH, CONFIG_FILENAME);
        existing = wrapped && wrapped.data ? wrapped.data : null;
      }

      const payload = existing && typeof existing === 'object' ? existing : {};
      return res.json(payload);
    } catch (e) {
      console.warn('[dashboard-preferences] get failed', e);
      return res.status(500).json({ error: 'internal_error' });
    }
  });

  app.put('/api/dashboard/preferences', limiter, async (req, res) => {
    try {
      if (!canWriteConfig(req)) return res.status(403).json({ error: 'forbidden' });

      const ns = resolveNamespace(req);
      if (!ns) return res.status(401).json({ error: 'unauthorized' });

      const body = req && req.body && typeof req.body === 'object' ? req.body : {};

      const viewMode = normalizeViewMode(body.viewMode);
      const customLayout = sanitizeLayout(body.customLayout);

      if (viewMode === null && customLayout === null) {
        return res.status(400).json({ error: 'invalid_payload' });
      }

      const updatedAt = Date.now();

      let next = null;

      if (hasRedisStore && typeof store.setConfig === 'function') {
        const current = (await store.getConfig(ns, CONFIG_FILENAME, {})) || {};
        next = {
          ...(current && typeof current === 'object' ? current : {}),
          ...(viewMode !== null ? { viewMode } : {}),
          ...(customLayout !== null ? { customLayout } : {}),
          updatedAt,
        };

        const ok = await store.setConfig(ns, CONFIG_FILENAME, next);
        if (!ok) return res.status(500).json({ error: 'store_write_failed' });

        if (process.env.GETTY_MULTI_TENANT_WALLET === '1') {
          try {
            await saveTenantConfig(req, null, GLOBAL_CONFIG_PATH, CONFIG_FILENAME, next);
          } catch (e) {
            console.warn('[dashboard-preferences] tenant-disk mirror failed', e?.message || e);
          }
        }
      } else {
        const result = saveTenantAwareConfig(req, GLOBAL_CONFIG_PATH, CONFIG_FILENAME, (current) => {
          const base = current && typeof current === 'object' ? current : {};
          return {
            ...base,
            ...(viewMode !== null ? { viewMode } : {}),
            ...(customLayout !== null ? { customLayout } : {}),
            updatedAt,
          };
        });
        next = result && result.data ? result.data : null;
      }

      return res.json(next || { ok: true, updatedAt });
    } catch (e) {
      console.warn('[dashboard-preferences] put failed', e);
      return res.status(500).json({ error: 'internal_error' });
    }
  });
}

module.exports = registerDashboardPreferencesRoutes;
