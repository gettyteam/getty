const DEFAULT_WUZZY_ENDPOINT =
  (import.meta.env.VITE_WUZZY_GQL_ENDPOINT && import.meta.env.VITE_WUZZY_GQL_ENDPOINT.trim()) ||
  'https://arweave-search.goldsky.com/graphql';

const DEFAULT_PAGE_SIZE = 30;
const DEFAULT_GIF_TYPES = ['image/gif'];
const DEFAULT_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];
const DEFAULT_AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg'];
export const MAX_WUZZY_AUDIO_DURATION_SECONDS = 20;
const DURATION_TAG_KEYWORDS = ['duration', 'length', 'audio-duration', 'clip-length', 'second'];

function sanitizeQuery(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/\s+/g, ' ').trim();
}

function buildTagFilters(queryString, contentTypes = DEFAULT_GIF_TYPES) {
  const filters = [];
  if (Array.isArray(contentTypes) && contentTypes.length) {
    filters.push({
      name: 'Content-Type',
      values: contentTypes,
    });
  }
  const sanitized = sanitizeQuery(queryString);
  if (sanitized) {
    const terms = sanitized
      .split(' ')
      .map((term) => term.trim())
      .filter(Boolean)
      .slice(0, 5);
    if (terms.length) {
      filters.push({
        values: terms,
        match: 'FUZZY_AND',
      });
    }
  }
  return filters;
}

function parseClockDuration(value) {
  const segments = value.split(':').map((segment) => Number(segment));
  if (!segments.length || segments.some((segment) => Number.isNaN(segment))) return null;
  if (segments.length === 2) {
    return segments[0] * 60 + segments[1];
  }
  if (segments.length === 3) {
    return segments[0] * 3600 + segments[1] * 60 + segments[2];
  }
  return null;
}

function coerceDuration(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const direct = Number(trimmed);
    if (Number.isFinite(direct)) return direct;
    const asFloat = Number.parseFloat(trimmed);
    if (Number.isFinite(asFloat)) return asFloat;
    if (trimmed.includes(':')) {
      const clock = parseClockDuration(trimmed);
      if (clock !== null) return clock;
    }
  }
  return null;
}

function parseDurationValue(tag = {}) {
  if (!tag || typeof tag.name !== 'string') return null;
  const lowerName = tag.name.toLowerCase();
  if (!DURATION_TAG_KEYWORDS.some((keyword) => lowerName.includes(keyword))) {
    return null;
  }
  const raw = coerceDuration(tag.value);
  if (!Number.isFinite(raw) || raw <= 0) return null;
  if (lowerName.includes('ms') || lowerName.includes('millis')) {
    return raw / 1000;
  }
  if (lowerName.includes('minute')) {
    return raw * 60;
  }
  if (raw > 600 && !lowerName.includes('second')) {
    return raw / 1000;
  }
  return raw;
}

function extractDurationSeconds(tags = []) {
  for (const tag of tags) {
    const parsed = parseDurationValue(tag);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return null;
}

function mapTransactionNode(edge) {
  const node = edge?.node || {};
  const tags = Array.isArray(node.tags) ? node.tags : [];
  const tagByName = (name) =>
    tags.find((tag) => tag && typeof tag.name === 'string' && tag.name.toLowerCase() === name);
  const fileNameTag = tagByName('file-name') || tagByName('title');
  const widthTag = tagByName('image-width');
  const heightTag = tagByName('image-height');
  const contentTypeTag = tagByName('content-type');

  const id = node.id || '';
  const sizeRaw = node?.data?.size;
  const size = Number.parseInt(sizeRaw, 10);
  return {
    id,
    cursor: edge?.cursor || null,
    url: id ? `https://arweave.net/${id}` : '',
    size: Number.isFinite(size) ? size : 0,
    owner: node?.owner?.address || '',
    blockHeight: node?.block?.height || null,
    tags,
    originalName: fileNameTag?.value || '',
    width: widthTag ? Number.parseInt(widthTag.value, 10) || 0 : 0,
    height: heightTag ? Number.parseInt(heightTag.value, 10) || 0 : 0,
    contentType: contentTypeTag?.value || '',
    durationSeconds: extractDurationSeconds(tags),
  };
}

async function searchWuzzyAssets({
  query = '',
  cursor = null,
  signal,
  pageSize,
  contentTypes = DEFAULT_GIF_TYPES,
} = {}) {
  const body = {
    query: `
      query WuzzyAssetSearch($first: Int!, $after: String, $queryTags: [TagFilter!]) {
        transactions(first: $first, after: $after, tags: $queryTags, sort: HEIGHT_DESC) {
          pageInfo {
            hasNextPage
          }
          edges {
            cursor
            node {
              id
              data {
                size
              }
              owner {
                address
              }
              block {
                height
              }
              tags {
                name
                value
              }
            }
          }
        }
      }
    `,
    variables: {
      first: pageSize || DEFAULT_PAGE_SIZE,
      after: cursor || null,
      queryTags: buildTagFilters(query, contentTypes),
    },
  };

  const response = await fetch(DEFAULT_WUZZY_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    throw new Error(`wuzzy_search_failed_${response.status}`);
  }

  const payload = await response.json();
  if (payload?.errors?.length) {
    const message = payload.errors.map((err) => err?.message).join(', ');
    throw new Error(message || 'wuzzy_search_error');
  }

  const data = payload?.data?.transactions;
  const edges = Array.isArray(data?.edges) ? data.edges : [];
  return {
    edges: edges.map(mapTransactionNode),
    pageInfo: data?.pageInfo || { hasNextPage: false },
  };
}

export function searchWuzzyGifs(options = {}) {
  return searchWuzzyAssets({ ...options, contentTypes: DEFAULT_GIF_TYPES });
}

export function searchWuzzyImages(options = {}) {
  return searchWuzzyAssets({ ...options, contentTypes: DEFAULT_IMAGE_TYPES });
}

export function searchWuzzyAudio(options = {}) {
  const { maxDurationSeconds = MAX_WUZZY_AUDIO_DURATION_SECONDS, ...rest } = options;
  return searchWuzzyAssets({ ...rest, contentTypes: DEFAULT_AUDIO_TYPES }).then((result) => {
    if (!Number.isFinite(maxDurationSeconds) || maxDurationSeconds <= 0) {
      return result;
    }
    const filteredEdges = result.edges.filter(
      (edge) =>
        !Number.isFinite(edge.durationSeconds) || edge.durationSeconds <= maxDurationSeconds
    );
    return {
      ...result,
      edges: filteredEdges,
    };
  });
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
