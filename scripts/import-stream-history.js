'use strict';

/**
 * Imports legacy JSON stream history into PostgreSQL/TimescaleDB.
 */

const fs = require('fs');
const path = require('path');

async function loadSecrets() {
  try {
    require('dotenv').config();
  } catch {}

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

(async () => {
  await loadSecrets();

const { ensureTenant, replaceTenantHistory } = require('../lib/db/stream-history');

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

function resolveSourcePath(tenantId, explicitPath) {
  if (explicitPath) {
    return path.resolve(process.cwd(), explicitPath);
  }
  if (!tenantId) {
    throw new Error('tenantId required when file path not provided');
  }
  return path.join(process.cwd(), 'tenant', tenantId, 'data', 'stream-history.json');
}

function loadHistoryFromFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`History file not found: ${filePath}`);
  }
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid JSON structure');
  }
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

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const tenantId = args.tenant ? String(args.tenant) : null;
    const claimId = args.claim ? String(args.claim) : null;
    const pubNamespace = args.pub ? String(args.pub) : null;
    const dryRun = args['dry-run'] === true || args.dry === true;
    const ingestVersion = args.ingest ? String(args.ingest) : 'migration-json';
    const sourceLabel = args.source ? String(args.source) : 'json-import';

    if (!tenantId) {
      console.error(
        'Usage: node scripts/import-stream-history.js --tenant <tenantId> [--file <path>] [--claim <claimId>] [--dry-run]'
      );
      process.exit(1);
    }

    const filePath = resolveSourcePath(tenantId, args.file);
    const raw = loadHistoryFromFile(filePath);
    const segments = normalizeSegments(raw.segments);
    const samples = normalizeSamples(raw.samples);

    console.warn(
      '[import] tenant=%s file=%s segments=%d samples=%d',
      tenantId,
      filePath,
      segments.length,
      samples.length
    );

    if (dryRun) {
      console.warn('[import] dry run – no changes applied');
      process.exit(0);
    }

    await ensureTenant({
      tenantId,
      claimId,
      adminNamespace: tenantId,
      pubNamespace,
    });

    await replaceTenantHistory({
      tenantId,
      segments,
      samples,
      source: sourceLabel,
      ingestVersion,
    });

    console.warn('[import] completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('[import] failed:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
})();
