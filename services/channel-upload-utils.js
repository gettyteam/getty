const {
  fetchChannelStreams,
  isClaimId,
  buildOdyseeContentUrl,
} = require('./channel-analytics');

const CHANNEL_UPLOAD_HISTORY_LIMIT = 25;

function normalizeChannelClaimId(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (!isClaimId(trimmed)) return '';
  return trimmed.toLowerCase();
}

function pickDescription(raw = {}) {
  const candidates = [
    raw.value?.description,
    raw.value?.content_description,
    raw.value?.description_text,
    raw.meta?.description,
  ];
  for (const entry of candidates) {
    if (!entry || typeof entry !== 'string') continue;
    const cleaned = entry.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleaned) return cleaned;
  }
  return '';
}

function pickThumbnail(raw = {}) {
  const candidates = [
    raw.value?.thumbnail?.url,
    raw.value?.cover?.url,
    raw.thumbnail_url,
  ];
  for (const url of candidates) {
    if (url && /^https?:\/\//i.test(url)) return url;
  }
  return '';
}

function pickChannelSource(raw = {}) {
  return (
    raw.signing_channel ||
    raw.publisher ||
    raw.value?.signing_channel ||
    raw.value?.publisher ||
    null
  );
}

function normalizeChannelHandleCandidate(candidate) {
  if (!candidate || typeof candidate !== 'string') return '';
  let trimmed = candidate.trim();
  if (!trimmed) return '';
  trimmed = trimmed.replace(/^lbry:\/\//i, '');
  const match = trimmed.match(/@[^/#?\s]+/);
  if (match && match[0]) return match[0];
  const noHash = trimmed.split('#')[0];
  const plain = noHash.startsWith('@') ? noHash.slice(1) : noHash;
  if (/^[a-z0-9_-]+$/i.test(plain)) return `@${plain}`;
  return '';
}

function pickChannelHandle(raw = {}) {
  const channel = pickChannelSource(raw);
  const candidates = [
    channel?.name,
    channel?.value?.name,
    channel?.value?.canonical_url,
    channel?.value?.permanent_url,
    channel?.canonical_url,
    channel?.permanent_url,
    channel?.short_url,
    raw.canonical_url,
    raw.permanent_url,
    raw.short_url,
  ];
  for (const candidate of candidates) {
    const handle = normalizeChannelHandleCandidate(candidate);
    if (handle) return handle;
  }
  return '';
}

function pickChannelTitle(raw = {}) {
  const channel = pickChannelSource(raw);
  const candidates = [
    channel?.value?.title,
    channel?.meta?.title,
    channel?.title,
    channel?.value?.name,
  ];
  for (const entry of candidates) {
    if (!entry || typeof entry !== 'string') continue;
    const trimmed = entry.trim();
    if (trimmed) return trimmed;
  }
  return '';
}

function sanitizeUploadUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  const odyseeMatch = trimmed.match(/^https?:\/\/odysee\.com\/(.+)/i);
  if (odyseeMatch && odyseeMatch[1]) {
    const rebuilt = buildOdyseeContentUrl(odyseeMatch[1]);
    if (rebuilt) return rebuilt;
  }
  const normalized = buildOdyseeContentUrl(trimmed);
  if (normalized) return normalized;
  return trimmed;
}

function mapStreamToUpload(stream) {
  if (!stream || typeof stream !== 'object') return null;
  const claimId = stream.claimId || stream.raw?.claim_id || '';
  if (!claimId) return null;
  const releaseMs = Number.isFinite(stream.releaseMs) ? stream.releaseMs : null;
  const raw = stream.raw || {};
  const title =
    raw.value?.title ||
    raw.meta?.title ||
    stream.title ||
    raw.value?.name ||
    'New upload on Odysee';
  const description = pickDescription(raw);
  const url = sanitizeUploadUrl(
    raw.canonical_url || raw.permanent_url || raw.short_url || raw.value?.canonical_url || ''
  );
  const thumbnailUrl = pickThumbnail(raw);
  const channelHandle = pickChannelHandle(raw);
  const channelTitle = pickChannelTitle(raw);
  return {
    claimId,
    title,
    description,
    releaseMs,
    url,
    thumbnailUrl,
    channelHandle,
    channelTitle,
  };
}

async function fetchRecentChannelUploads(claimId, limit = 5) {
  const normalized = normalizeChannelClaimId(claimId);
  if (!normalized) return [];
  try {
    const result = await fetchChannelStreams(normalized, Math.max(1, limit));
    console.warn('[channel-upload] API result for claimId', normalized, ':', result);
    const streams = Array.isArray(result?.streams) ? result.streams : [];
    return streams
      .map((stream) => mapStreamToUpload(stream))
      .filter((entry) => entry && entry.claimId);
  } catch {
    return [];
  }
}

function buildUploadPayload(upload) {
  if (!upload) return null;
  return {
    title: upload.title,
    description: upload.description,
    url: upload.url,
    thumbnailUrl: upload.thumbnailUrl,
    publishTimestamp: upload.releaseMs || undefined,
    channelHandle: upload.channelHandle || '',
    channelTitle: upload.channelTitle || '',
  };
}

module.exports = {
  CHANNEL_UPLOAD_HISTORY_LIMIT,
  normalizeChannelClaimId,
  fetchRecentChannelUploads,
  mapStreamToUpload,
  buildUploadPayload,
  sanitizeUploadUrl,
};
