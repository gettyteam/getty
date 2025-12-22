'use strict';

const fs = require('fs');
const path = require('path');

async function loadSecrets() {
  try {
    require('dotenv').config();
  } catch {}

  if (
    process.env.GETTY_SKIP_INFISICAL === '1' ||
    !process.env.INFISICAL_CLIENT_ID ||
    !process.env.INFISICAL_CLIENT_SECRET ||
    !process.env.INFISICAL_PROJECT_ID
  ) {
    return;
  }

  try {
    const { InfisicalSDK } = await import('@infisical/sdk');
    const client = new InfisicalSDK({
      siteUrl: process.env.INFISICAL_URL || 'https://app.infisical.com',
    });
    await client.auth().universalAuth.login({
      clientId: process.env.INFISICAL_CLIENT_ID,
      clientSecret: process.env.INFISICAL_CLIENT_SECRET,
    });
    const { secrets } = await client.secrets().listSecrets({
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
      projectId: process.env.INFISICAL_PROJECT_ID,
    });
    for (const secret of secrets) {
      process.env[secret.secretKey] = secret.secretValue;
    }
  } catch (e) {
    console.error('Failed to load secrets from Infisical:', e.message);
  }
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    let value = true;
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      value = next;
      i += 1;
    }
    args[key] = value;
  }
  return args;
}

function safeReadJson(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!raw || typeof raw !== 'object') throw new Error('Invalid JSON structure');
  return raw;
}

function normalizeSegments(rawSegments) {
  if (!Array.isArray(rawSegments)) return [];
  return rawSegments
    .map((segment) => {
      const start = Number(segment?.start ?? segment?.segment_start ?? segment?.segmentStart);
      if (!Number.isFinite(start)) return null;
      const endValue = segment?.end == null ? null : Number(segment.end);
      const end = Number.isFinite(endValue) ? Math.max(endValue, start) : null;
      return {
        start,
        end,
        source: segment?.source || null,
        ingest_version: segment?.ingest_version || null,
        payload: segment || null,
      };
    })
    .filter(Boolean);
}

function normalizeSamples(rawSamples) {
  if (!Array.isArray(rawSamples)) return [];
  return rawSamples
    .map((entry) => {
      const ts = Number(entry?.ts ?? entry?.sample_at ?? entry?.sampleAt);
      if (!Number.isFinite(ts)) return null;
      const viewers = Number.isFinite(Number(entry?.viewers)) ? Number(entry.viewers) : 0;
      return {
        ts,
        live: !!entry?.live,
        viewers,
        ingest_version: entry?.ingest_version || null,
        payload: entry || null,
      };
    })
    .filter(Boolean);
}

function listTenantIds(rootDir) {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

function resolveHistoryFile(rootDir, tenantId) {
  return path.join(rootDir, tenantId, 'data', 'stream-history.json');
}

(async () => {
  await loadSecrets();

  const { ensureTenant, replaceTenantHistory } = require('../lib/db/stream-history');

  async function main() {
    const args = parseArgs(process.argv.slice(2));
    const root = args.root ? path.resolve(process.cwd(), String(args.root)) : path.join(process.cwd(), 'tenant');
    const onlyTenant = args.tenant ? String(args.tenant) : null;
    const dryRun = args['dry-run'] === true || args.dry === true;
    const ingestVersion = args.ingest ? String(args.ingest) : 'migration-json-bulk';
    const sourceLabel = args.source ? String(args.source) : 'json-import-bulk';

    if (!fs.existsSync(root)) {
      console.error('[bulk-import] tenant root not found:', root);
      process.exit(1);
    }

    const tenantIds = onlyTenant ? [onlyTenant] : listTenantIds(root);
    if (!tenantIds.length) {
      console.warn('[bulk-import] no tenants found under', root);
      return;
    }

    let okCount = 0;
    let skipped = 0;
    let failed = 0;

    for (const tenantId of tenantIds) {
      const filePath = resolveHistoryFile(root, tenantId);
      if (!fs.existsSync(filePath)) {
        skipped++;
        continue;
      }

      try {
        const raw = safeReadJson(filePath);
        const segments = normalizeSegments(raw.segments);
        const samples = normalizeSamples(raw.samples);

        console.warn(
          '[bulk-import] tenant=%s file=%s segments=%d samples=%d',
          tenantId,
          filePath,
          segments.length,
          samples.length
        );

        if (dryRun) {
          okCount++;
          continue;
        }

        await ensureTenant({
          tenantId,
          claimId: null,
          adminNamespace: tenantId,
          pubNamespace: null,
        });

        await replaceTenantHistory({
          tenantId,
          segments,
          samples,
          source: sourceLabel,
          ingestVersion,
        });

        okCount++;
      } catch (err) {
        failed++;
        console.error('[bulk-import] tenant=%s failed: %s', tenantId, err?.message || err);
      }
    }

    console.warn('[bulk-import] done ok=%d skipped=%d failed=%d', okCount, skipped, failed);
    if (failed > 0) process.exitCode = 1;
  }

  if (require.main === module) {
    main().catch((err) => {
      console.error('[bulk-import] fatal:', err);
      process.exit(1);
    });
  }
})();
