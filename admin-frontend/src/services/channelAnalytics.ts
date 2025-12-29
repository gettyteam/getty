import api from './api';

export type ChannelAnalyticsRange = 'day' | 'week' | 'month' | 'halfyear' | 'year';

export interface ChannelAnalyticsTotals {
  videos: number;
  views: number;
  subscribers: number;
  likes: number;
  dislikes: number;
}

export interface ChannelAnalyticsBar {
  key: string;
  label: string;
  start: string | null;
  end: string | null;
  videos: number;
  views: number;
}

export interface ChannelAnalyticsOverview {
  totals: ChannelAnalyticsTotals;
  bars: ChannelAnalyticsBar[];
  range: { key: ChannelAnalyticsRange; start: string | null; end: string | null };
  updatedAt: string;
  highlights: ChannelAnalyticsHighlights | null;
}

export interface ChannelAnalyticsOverviewEnvelope {
  data: ChannelAnalyticsOverview;
  stale?: boolean;
  fetchedAt?: string | null;
  cacheFallback?: boolean;
}

export interface ChannelAnalyticsHighlightVideo {
  uri: string | null;
  title: string | null;
  views: number | null;
  change: number | null;
  url: string | null;
}

export interface ChannelAnalyticsHighlights {
  channelUri: string | null;
  subs: number | null;
  subsChange: number | null;
  views: number | null;
  viewsChange: number | null;
  topAllTime: ChannelAnalyticsHighlightVideo | null;
  topNew: ChannelAnalyticsHighlightVideo | null;
  topCommented: ChannelAnalyticsHighlightVideo | null;
}

export interface ChannelIdentityPreview {
  claimId: string | null;
  name: string | null;
  title: string | null;
  thumbnailUrl: string | null;
}

export interface ChannelAnalyticsConfigResponse {
  channelHandle: string;
  claimId: string;
  hasAuthToken: boolean;
  authFormEnabled?: boolean;
  envOverrides?: {
    claimId?: boolean;
    authToken?: boolean;
  };
  updatedAt: string | null;
  lastResolvedHandle: string;
  lastResolvedAt: string | null;
  channelIdentity: ChannelIdentityPreview | null;
}

export interface ChannelAnalyticsConfigPayload {
  channelHandle?: string;
  claimId?: string;
  authToken?: string;
  clearAuthToken?: boolean;
}

const __inflight = new Map<string, Promise<any>>();
const __lastOk = new Map<string, { ts: number; value: any }>();
const __COOLDOWN_MS = 1500;

function withDedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const cached = __lastOk.get(key);
  if (cached && now - cached.ts < __COOLDOWN_MS) {
    return Promise.resolve(cached.value as T);
  }

  const inflight = __inflight.get(key);
  if (inflight) return inflight as Promise<T>;

  const p = (async () => {
    const value = await fn();
    __lastOk.set(key, { ts: Date.now(), value });
    return value;
  })()
    .finally(() => {
      __inflight.delete(key);
    });

  __inflight.set(key, p);
  return p;
}

function extractOverviewEnvelope(responseData: any): ChannelAnalyticsOverviewEnvelope | null {
  if (!responseData) return null;
  if (responseData.data && responseData.data.totals && responseData.data.bars) {
    return responseData as ChannelAnalyticsOverviewEnvelope;
  }

  if (responseData.totals && responseData.bars && responseData.range) {
    return { data: responseData as ChannelAnalyticsOverview };
  }
  return null;
}

export async function fetchChannelAnalyticsEnvelope(range: ChannelAnalyticsRange) {
  const key = `channelAnalytics:overview:${String(range)}`;
  return withDedupe(key, async () => {
    const response = await api.get('/api/channel-analytics/overview', { params: { range } });
    const envelope = extractOverviewEnvelope(response?.data);
    if (!envelope) {
      return { data: response?.data?.data as ChannelAnalyticsOverview } as ChannelAnalyticsOverviewEnvelope;
    }
    return envelope;
  });
}

export async function fetchChannelAnalytics(range: ChannelAnalyticsRange) {
  const envelope = await fetchChannelAnalyticsEnvelope(range);
  return envelope.data;
}

export async function fetchChannelAnalyticsConfig() {
  const key = 'channelAnalytics:config';
  return withDedupe(key, async () => {
    const response = await api.get('/config/channel-analytics-config.json');
    return response.data as ChannelAnalyticsConfigResponse;
  });
}

export async function saveChannelAnalyticsConfig(payload: ChannelAnalyticsConfigPayload) {
  const response = await api.post('/config/channel-analytics-config.json', {
    channelHandle: payload.channelHandle?.trim() || undefined,
    claimId: payload.claimId?.trim() || undefined,
    authToken: payload.authToken?.trim() || undefined,
    clearAuthToken: payload.clearAuthToken ? '1' : undefined,
  });
  return response?.data?.config as ChannelAnalyticsConfigResponse;
}
