const path = require('path');
const { loadTenantConfig, saveTenantConfig } = require('../lib/tenant-config');
const {
  CHANNEL_UPLOAD_HISTORY_LIMIT,
  normalizeChannelClaimId,
  fetchRecentChannelUploads,
  buildUploadPayload,
} = require('./channel-upload-utils');

const GLOBAL_EXT_NOTIF_PATH = path.join(
  process.cwd(),
  'config',
  'external-notifications-config.json'
);
const CHANNEL_UPLOAD_SET = 'getty:channel-upload:namespaces';
const DEFAULT_POLL_MS = Math.max(60000, Number(process.env.CHANNEL_UPLOAD_POLL_MS || 180000));
const MAX_NOTIFICATIONS_PER_TICK = 3;
const FORCED_TENANT_HASH =
  process.env.CHANNEL_UPLOAD_TENANT_HASH ||
  process.env.GETTY_AUTO_LIVE_TENANT_HASH ||
  process.env.GETTY_DEFAULT_TENANT_HASH ||
  null;

function dedupe(ids) {
  const seen = new Set();
  const out = [];
  for (const entry of ids || []) {
    const normalized = typeof entry === 'string' ? entry.trim().toLowerCase() : '';
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
    if (out.length >= CHANNEL_UPLOAD_HISTORY_LIMIT) break;
  }
  return out;
}

async function loadTenantExternalConfig(ns, store) {
  const reqLike = { ns: { admin: ns } };
  try {
    const loaded = await loadTenantConfig(
      reqLike,
      store,
      GLOBAL_EXT_NOTIF_PATH,
      'external-notifications-config.json'
    );
    if (loaded && loaded.data) return loaded.data;
  } catch {}
  if (store) {
    try {
      const raw = await store.get(ns, 'external-notifications-config', null);
      if (
        raw &&
        typeof raw === 'object' &&
        raw.__version &&
        raw.data &&
        typeof raw.data === 'object'
      )
        return raw.data;
      if (raw) return raw;
    } catch {}
  }
  return {};
}

async function persistTenantExternalConfig(ns, store, data) {
  const reqLike = { ns: { admin: ns } };
  await saveTenantConfig(reqLike, store, GLOBAL_EXT_NOTIF_PATH, 'external-notifications-config.json', data);
}

async function processUploadsOnce({
  webhook,
  claimId,
  knownIds,
  send,
  updateState,
}) {
  const normalizedClaim = normalizeChannelClaimId(claimId);
  if (!webhook || !normalizedClaim) return false;
  const uploads = await fetchRecentChannelUploads(normalizedClaim, 8);
  if (!uploads.length) return false;
  const known = new Set(dedupe(knownIds));
  const fresh = uploads
    .filter((upload) => !known.has(upload.claimId))
    .sort((a, b) => (b.releaseMs || 0) - (a.releaseMs || 0));
  const toNotify = fresh.slice(0, MAX_NOTIFICATIONS_PER_TICK);
  if (!toNotify.length) return false;

  let sentAny = false;
  const newIds = [];
  let lastMeta = null;
  for (const upload of toNotify) {
    const payload = buildUploadPayload(upload);
    try {
      console.warn(`[channel-upload] sending notification for ${upload.claimId} to webhook...`);
      const ok = await send(payload, webhook);
      if (ok) {
        console.warn(`[channel-upload] notification sent successfully for ${upload.claimId}`);
        sentAny = true;
        newIds.push(upload.claimId);
        lastMeta = upload;
      } else {
        console.warn(`[channel-upload] notification failed (ok=false) for ${upload.claimId}`);
      }
    } catch (e) {
      console.error('[channel-upload] send failed', e?.message || e);
    }
  }
  if (sentAny) {
    const updatedHistory = dedupe([...newIds.reverse(), ...knownIds]);
    const meta = lastMeta || toNotify[toNotify.length - 1];
    await updateState({
      history: updatedHistory,
      lastPublishedAt: meta?.releaseMs ? new Date(meta.releaseMs).toISOString() : null,
      lastTitle: meta?.title || '',
      lastUrl: meta?.url || '',
    });
  }
  return sentAny;
}

function initChannelUploadMonitor({ store, externalNotifications }) {
  console.warn('[channel-upload] initChannelUploadMonitor called');
  if (!externalNotifications || typeof externalNotifications.sendChannelUploadToDiscord !== 'function') {
    console.error('[channel-upload] externalNotifications invalid, aborting monitor');
    return;
  }

  const hosted =
    !!(store && store.redis) &&
    (process.env.GETTY_MULTI_TENANT_WALLET === '1' || process.env.GETTY_REQUIRE_SESSION === '1');

  async function processGlobalOnce() {
    console.warn('[channel-upload] processGlobalOnce tick starting');
    const reqContext = FORCED_TENANT_HASH
      ? { __forceWalletHash: FORCED_TENANT_HASH }
      : {};
    try {
      const loaded = await loadTenantConfig(
        reqContext,
        store,
        GLOBAL_EXT_NOTIF_PATH,
        'external-notifications-config.json'
      );
      let cfg = loaded && loaded.data ? loaded.data : {};
      
      if (
        process.env.NODE_ENV !== 'production' &&
        (!cfg.channelUploadDiscordWebhook || !cfg.channelUploadClaimId) &&
        store &&
        store.kv &&
        store.kv.map
      ) {
        try {
           for (const [key, val] of store.kv.map.entries()) {
              if (key.includes('external-notifications-config')) {
                 const data = val && val.data ? val.data : val;
                 if (data && data.channelUploadDiscordWebhook && data.channelUploadClaimId) {
                    cfg = { ...cfg, ...data };
                    break;
                 }
              }
           }
        } catch (e) {
           console.error('[channel-upload] memory store check failed', e);
        }
      }

      const snapshot = externalNotifications.getConfigSnapshot();
      
      if (!cfg.channelUploadDiscordWebhook && snapshot.channelUploadDiscordWebhook) {
        cfg = { ...snapshot, ...cfg };
      }

      const webhook = cfg.channelUploadDiscordWebhook || snapshot.channelUploadDiscordWebhook;
      const claimId = cfg.channelUploadClaimId || snapshot.channelUploadClaimId;
      
      if (webhook && claimId) {
        const known = Array.isArray(cfg.channelUploadNotifiedClaimIds)
          ? cfg.channelUploadNotifiedClaimIds
          : (Array.isArray(snapshot.channelUploadNotifiedClaimIds) ? snapshot.channelUploadNotifiedClaimIds : []);

        await processUploadsOnce({
          webhook,
          claimId,
          knownIds: known,
          send: (payload, override) =>
            externalNotifications.sendChannelUploadToDiscord(payload, override),
          updateState: async ({ history, lastPublishedAt, lastTitle, lastUrl }) => {
            cfg.channelUploadNotifiedClaimIds = history;
            cfg.channelUploadLastPublishedAt = lastPublishedAt;
            cfg.channelUploadLastTitle = lastTitle;
            cfg.channelUploadLastUrl = lastUrl;

            await saveTenantConfig(
              reqContext,
              store,
              GLOBAL_EXT_NOTIF_PATH,
              'external-notifications-config.json',
              cfg
            );

            externalNotifications.channelUploadNotifiedClaimIds = history;
            externalNotifications.channelUploadLastPublishedAt = lastPublishedAt;
            externalNotifications.channelUploadLastTitle = lastTitle;
            externalNotifications.channelUploadLastUrl = lastUrl;
          },
        });
      } else {
        try {
           const fs = require('fs');
           if (fs.existsSync(GLOBAL_EXT_NOTIF_PATH)) {
              const raw = fs.readFileSync(GLOBAL_EXT_NOTIF_PATH, 'utf8');
              const json = JSON.parse(raw);
              if (json.channelUploadDiscordWebhook) {
                 cfg.channelUploadDiscordWebhook = json.channelUploadDiscordWebhook;
                 cfg.channelUploadClaimId = json.channelUploadClaimId;
                 if (json.channelUploadNotifiedClaimIds) cfg.channelUploadNotifiedClaimIds = json.channelUploadNotifiedClaimIds;
                 
                 if (cfg.channelUploadDiscordWebhook && cfg.channelUploadClaimId) {
                    await processUploadsOnce({
                        webhook: cfg.channelUploadDiscordWebhook,
                        claimId: cfg.channelUploadClaimId,
                        knownIds: Array.isArray(cfg.channelUploadNotifiedClaimIds) ? cfg.channelUploadNotifiedClaimIds : [],
                        send: (payload, override) => externalNotifications.sendChannelUploadToDiscord(payload, override),
                        updateState: async ({ history, lastPublishedAt, lastTitle, lastUrl }) => {
                          cfg.channelUploadNotifiedClaimIds = history;
                          cfg.channelUploadLastPublishedAt = lastPublishedAt;
                          cfg.channelUploadLastTitle = lastTitle;
                          cfg.channelUploadLastUrl = lastUrl;
                          await saveTenantConfig(
                            reqContext,
                            store,
                            GLOBAL_EXT_NOTIF_PATH,
                            'external-notifications-config.json',
                            cfg
                          );
                          externalNotifications.channelUploadNotifiedClaimIds = history;
                          externalNotifications.channelUploadLastPublishedAt = lastPublishedAt;
                          externalNotifications.channelUploadLastTitle = lastTitle;
                          externalNotifications.channelUploadLastUrl = lastUrl;
                        },
                    });
                    return;
                 }
              }
           }
        } catch {}
        return;
      }
    } catch (e) {
      console.error('[channel-upload] global poll failed', e?.message || e);
    } finally {
      console.warn('[channel-upload] processGlobalOnce tick finished');
    }
  }

  async function processNamespace(ns) {
    try {
      const cfg = await loadTenantExternalConfig(ns, store);
      const webhook = cfg.channelUploadDiscordWebhook;
      const claimId = cfg.channelUploadClaimId;
      if (!webhook || !claimId) {
        if (store?.redis) await store.redis.srem(CHANNEL_UPLOAD_SET, ns);
        return;
      }
      const known = Array.isArray(cfg.channelUploadNotifiedClaimIds)
        ? cfg.channelUploadNotifiedClaimIds
        : [];
      await processUploadsOnce({
        webhook,
        claimId,
        knownIds: known,
        send: (payload, override) =>
          externalNotifications.sendChannelUploadToDiscord(payload, override),
        updateState: async ({ history, lastPublishedAt, lastTitle, lastUrl }) => {
          cfg.channelUploadNotifiedClaimIds = history;
          cfg.channelUploadLastPublishedAt = lastPublishedAt;
          cfg.channelUploadLastTitle = lastTitle;
          cfg.channelUploadLastUrl = lastUrl;
          await persistTenantExternalConfig(ns, store, cfg);
        },
      });
    } catch (e) {
      console.error('[channel-upload] ns poll failed', ns, e?.message || e);
    }
  }

  async function processHostedOnce() {
    if (!store?.redis) return;
    try {
      const namespaces = await store.redis.smembers(CHANNEL_UPLOAD_SET);
      if (!Array.isArray(namespaces) || !namespaces.length) return;

      const CONCURRENCY = 5;
      for (let i = 0; i < namespaces.length; i += CONCURRENCY) {
        const chunk = namespaces.slice(i, i + CONCURRENCY);
        await Promise.all(chunk.map((ns) => processNamespace(ns)));
      }
    } catch (e) {
      console.error('[channel-upload] hosted poll failed', e?.message || e);
    }
  }

  if (hosted) {
    setTimeout(() => {
      processHostedOnce();
    }, 15000).unref?.();
    setInterval(() => {
      processHostedOnce();
    }, DEFAULT_POLL_MS).unref?.();
  } else {
    setTimeout(() => {
      processGlobalOnce();
    }, 10000).unref?.();
    setInterval(() => {
      processGlobalOnce();
    }, DEFAULT_POLL_MS).unref?.();
  }
}

module.exports = { initChannelUploadMonitor, processUploadsOnce };
