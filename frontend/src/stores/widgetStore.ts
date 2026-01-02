import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useWidgetStore = defineStore('widgets', () => {
  const lastTip = ref<any>(null);
  const lastTips = ref<any[]>([]);
  const lastTipConfig = ref<any>({});
  const tipGoal = ref<any>(null);
  const activeNotification = ref<any>(null);
  const chatMessages = ref<any[]>([]);
  const chatConfig = ref<any>({});
  const raffleState = ref<any>(null);
  const raffleWinner = ref<any>(null);
  const achievements = ref<any[]>([]);
  const achievementConfig = ref<any>({});
  const sharedAudioSettings = ref<any>({ enabled: true, volume: 0.5, audioSource: 'remote' });
  const arPrice = ref<number>(0);
  const isConnected = ref(false);
  const emojiMapping = ref<Record<string, string>>({});

  const liveviewsStatus = ref<{ live: boolean; viewerCount: number }>({ live: false, viewerCount: 0 });
  const liveviewsLastFetchedAt = ref<number>(0);

  const streamHistoryStatus = ref<{ connected: boolean; live: boolean; reason?: string; lastSampleTs?: number | null }>(
    { connected: false, live: false, reason: 'no_claimid', lastSampleTs: null }
  );
  const streamHistoryStatusLastFetchedAt = ref<number>(0);

  const streamHistoryPerf = ref<any>(null);
  const streamHistoryPerfLastFetchedAt = ref<number>(0);

  const streamHistorySummary = ref<any>(null);
  const streamHistorySummaryLastFetchedAt = ref<number>(0);

  const activitiesTodayCount = ref<number>(0);
  const activitiesTodayDayKey = ref<string>('');
  let ws: WebSocket | null = null;
  let wsNamespace: string = '';
  let wsNamespaceOverride: string = '';
  let __nsOverrideFetchPromise: Promise<string> | null = null;
  let __nsOverrideLastFetchAt = 0;

  function normalizeTip(input: any): any | null {
    if (!input || typeof input !== 'object') return null;
    
    let from = typeof input.from === 'string' && input.from.trim() ? input.from.trim() : '';
    if (!from && typeof input.channelTitle === 'string') from = input.channelTitle.trim();
    if (!from && typeof input.username === 'string') from = input.username.trim();
    if (!from) from = 'Anonymous';

    let amountRaw = (input as any).amount;
    if (amountRaw === undefined || amountRaw === null) {
        amountRaw = (input as any).support_amount;
    }
    if (amountRaw === undefined || amountRaw === null) {
        amountRaw = (input as any).credits;
    }

    const amountNum =
      typeof amountRaw === 'number'
        ? amountRaw
        : typeof amountRaw === 'string'
          ? parseFloat(amountRaw)
          : NaN;
    if (!Number.isFinite(amountNum) || amountNum <= 0) return null;
    const amount = amountNum.toFixed(6);

    const usdRaw = (input as any).usd;
    let usd = typeof usdRaw === 'number' || typeof usdRaw === 'string' ? usdRaw : undefined;
    if (usd === undefined && (input as any).credits) {
      usd = (input as any).credits;
    }

    const message = typeof input.message === 'string' ? input.message : '';
    const timestamp = (input as any).timestamp || (input as any).ts || undefined;
    const source = typeof input.source === 'string' ? input.source : undefined;
    const avatar = typeof input.avatar === 'string' ? input.avatar : undefined;

    return { from, amount, usd, message, timestamp, source, avatar };
  }

  function tipIdentity(tip: any): string {
    const from = typeof tip?.from === 'string' ? tip.from : '';
    const amount = typeof tip?.amount === 'string' ? tip.amount : String(tip?.amount ?? '');
    const timestamp = tip?.timestamp ? String(tip.timestamp) : '';
    const message = typeof tip?.message === 'string' ? tip.message : '';
    return `${timestamp}|${from}|${amount}|${message}`;
  }

  function upsertLastTipHistory(tipLike: any, maxItems = 20): void {
    const tip = normalizeTip(tipLike);
    if (!tip) return;

    const next: any[] = [tip];
    const seen = new Set<string>();
    seen.add(tipIdentity(tip));

    for (const existing of lastTips.value || []) {
      const normalized = normalizeTip(existing);
      if (!normalized) continue;
      const id = tipIdentity(normalized);
      if (seen.has(id)) continue;
      seen.add(id);
      next.push(normalized);
      if (next.length >= maxItems) break;
    }

    lastTips.value = next;
  }

  const RAFFLE_WINNER_KEY = 'raffle-winner-data';
  const RAFFLE_STATE_KEY = 'raffle-active-state';
  const RAFFLE_EXPIRATION_DAYS = 7;

  function getWidgetTokenHint(): string {
    try {
      const params = new URLSearchParams(window.location.search || '');
      const fromQuery = (params.get('widgetToken') || params.get('token') || '').trim();
      if (fromQuery) return fromQuery;
    } catch {}

    try {
      const match = window.location.pathname.match(/^\/user\/([A-Za-z0-9_-]+)/);
      const fromPath = match ? String(match[1] || '').trim() : '';
      if (fromPath) return fromPath;
    } catch {}

    try {
      const el = document.getElementById('dashboard-bootstrap');
      const raw = (el && 'textContent' in el ? (el as any).textContent : '') || '';
      if (!raw) return '';
      const parsed = JSON.parse(raw);
      const token = typeof parsed?.widgetToken === 'string' ? parsed.widgetToken.trim() : '';
      return token;
    } catch {}

    return '';
  }

  function getWebSocketNamespace(): string {
    return wsNamespaceOverride || getWidgetTokenHint();
  }

  async function fetchWebSocketNamespaceOverride(): Promise<string> {
    try {
      const now = Date.now();
      if (__nsOverrideFetchPromise && now - __nsOverrideLastFetchAt < 10000) return __nsOverrideFetchPromise;
      if (now - __nsOverrideLastFetchAt < 10000) return wsNamespaceOverride || '';
      __nsOverrideLastFetchAt = now;

      __nsOverrideFetchPromise = fetch('/api/publicToken', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      })
        .then(async (r) => {
          if (!r.ok) return '';
          const j: any = await r.json().catch(() => null);
          const tok = typeof j?.publicToken === 'string' ? j.publicToken.trim() : '';
          return tok;
        })
        .catch(() => '')
        .finally(() => {
          __nsOverrideFetchPromise = null;
        });

      const tok = await __nsOverrideFetchPromise;
      if (tok) wsNamespaceOverride = tok;
      return tok;
    } catch {
      return '';
    }
  }

  function resolveWebSocketHost(): string {
    try {
      const isDev = !!(import.meta as any)?.env?.DEV;
      const backendPort = String((import.meta as any)?.env?.VITE_BACKEND_PORT || '3000');
      const currentPort = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');

      if (isDev && backendPort && currentPort && backendPort !== currentPort) {
        return `${window.location.hostname}:${backendPort}`;
      }
    } catch {}

    return window.location.host;
  }

  function withWidgetToken(url: string): string {
    try {
      const token = getWidgetTokenHint();
      if (!token) return url;
      const u = new URL(url, window.location.origin);
      if (!u.searchParams.has('widgetToken')) u.searchParams.set('widgetToken', token);
      return u.pathname + u.search + u.hash;
    } catch {
      return url;
    }
  }

  function getLocalDayKey(ts = Date.now()): string {
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function activitiesStorageKey(dayKey: string): string {
    const token = getWidgetTokenHint();
    const scope = token ? `token:${token}` : `host:${window.location.host}`;
    return `getty:recent-events:${scope}:activities:${dayKey}`;
  }

  function ensureActivitiesToday(): void {
    const today = getLocalDayKey();
    if (activitiesTodayDayKey.value && activitiesTodayDayKey.value === today) return;
    activitiesTodayDayKey.value = today;
    activitiesTodayCount.value = 0;
    try {
      const raw = localStorage.getItem(activitiesStorageKey(today));
      const n = raw == null ? 0 : Number(raw);
      activitiesTodayCount.value = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
    } catch {}
  }

  function bumpActivitiesToday(by = 1): void {
    ensureActivitiesToday();
    const inc = Number.isFinite(by) ? Math.floor(by) : 0;
    if (inc <= 0) return;
    activitiesTodayCount.value += inc;
    try {
      localStorage.setItem(activitiesStorageKey(activitiesTodayDayKey.value), String(activitiesTodayCount.value));
    } catch {}
  }

  async function fetchLiveviewsStatus(options: { force?: boolean } = {}) {
    try {
      const now = Date.now();
      const force = !!options.force;
      if (!force && liveviewsLastFetchedAt.value && now - liveviewsLastFetchedAt.value < 5000) return;

      const url = withWidgetToken(`/api/liveviews/status${force ? '?force=1' : ''}`);
      const res = await fetch(url, {
        credentials: 'include',
        cache: 'no-store',
      }).catch(() => null);
      if (!res || !res.ok) return;
      const json: any = await res.json().catch(() => null);
      const live = !!json?.data?.Live;
      const viewerCountRaw = Number(json?.data?.ViewerCount);
      const viewerCount = Number.isFinite(viewerCountRaw) ? viewerCountRaw : 0;
      liveviewsStatus.value = { live, viewerCount };
      liveviewsLastFetchedAt.value = now;
    } catch {}
  }

  function getTzOffsetMinutes(): number {
    try {
      return -new Date().getTimezoneOffset();
    } catch {
      return 0;
    }
  }

  async function fetchStreamHistoryStatus(options: { force?: boolean } = {}) {
    try {
      const now = Date.now();
      const force = !!options.force;
      if (!force && streamHistoryStatusLastFetchedAt.value && now - streamHistoryStatusLastFetchedAt.value < 5000) {
        return;
      }

      const url = withWidgetToken(`/api/stream-history/status${force ? '?force=1' : ''}`);
      const res = await fetch(url, {
        credentials: 'include',
        cache: 'no-store',
      }).catch(() => null);
      if (!res || !res.ok) return;
      const json: any = await res.json().catch(() => null);
      if (!json || typeof json !== 'object') return;

      streamHistoryStatus.value = {
        connected: !!json.connected,
        live: !!json.live,
        reason: typeof json.reason === 'string' ? json.reason : undefined,
        lastSampleTs: typeof json.lastSampleTs === 'number' ? json.lastSampleTs : null,
      };
      streamHistoryStatusLastFetchedAt.value = now;
    } catch {}
  }

  async function fetchStreamHistoryPerformance(options: { force?: boolean } = {}) {
    try {
      const now = Date.now();
      const force = !!options.force;
      if (!force && streamHistoryPerfLastFetchedAt.value && now - streamHistoryPerfLastFetchedAt.value < 15000) return;

      const tz = getTzOffsetMinutes();
      const params = new URLSearchParams({
        period: 'day',
        span: '1',
        tz: String(tz),
      });
      const url = withWidgetToken(`/api/stream-history/performance?${params.toString()}`);
      const res = await fetch(url, {
        credentials: 'include',
        cache: 'no-store',
      }).catch(() => null);
      if (!res || !res.ok) return;
      const json: any = await res.json().catch(() => null);
      if (!json || typeof json !== 'object') return;
      streamHistoryPerf.value = json;
      streamHistoryPerfLastFetchedAt.value = now;
    } catch {}
  }

  async function fetchStreamHistorySummary(
    options: { force?: boolean; period?: string; span?: number } = {}
  ) {
    try {
      const now = Date.now();
      const force = !!options.force;
      if (!force && streamHistorySummaryLastFetchedAt.value && now - streamHistorySummaryLastFetchedAt.value < 15000) {
        return;
      }

      const period = typeof options.period === 'string' && options.period.trim() ? options.period.trim() : 'day';
      const spanNum = Number(options.span ?? 2);
      const span = Number.isFinite(spanNum) ? Math.max(1, Math.min(365, Math.floor(spanNum))) : 2;
      const tz = getTzOffsetMinutes();

      const params = new URLSearchParams({
        period,
        span: String(span),
        tz: String(tz),
      });
      const url = withWidgetToken(`/api/stream-history/summary?${params.toString()}`);
      const res = await fetch(url, {
        credentials: 'include',
        cache: 'no-store',
      }).catch(() => null);
      if (!res || !res.ok) return;
      const json: any = await res.json().catch(() => null);
      if (!json || typeof json !== 'object') return;
      streamHistorySummary.value = json;
      streamHistorySummaryLastFetchedAt.value = now;
    } catch {}
  }

  function loadRaffleData() {
    try {
      const savedWinner = localStorage.getItem(RAFFLE_WINNER_KEY);
      if (savedWinner) {
        const parsed = JSON.parse(savedWinner);
        if (parsed.timestamp && Date.now() - parsed.timestamp < RAFFLE_EXPIRATION_DAYS * 24 * 60 * 60 * 1000) {
          raffleWinner.value = parsed;
        }
      }
      const savedState = localStorage.getItem(RAFFLE_STATE_KEY);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        if (!raffleWinner.value && parsed.timestamp && Date.now() - parsed.timestamp < 30 * 60 * 1000) {
          raffleState.value = parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load raffle data', e);
    }
  }

  async function fetchArPrice() {
    try {
      const res = await fetch('/api/ar-price').catch(() => null);
      if (res && res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.arweave?.usd) {
          arPrice.value = Number(data.arweave.usd);
          return;
        }
      }
      
      const r = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=arweave&vs_currencies=usd'
      );
      const j = await r.json();
      if (j?.arweave?.usd) {
        arPrice.value = Number(j.arweave.usd);
        return;
      }
    } catch (e) {
      console.warn('Failed to fetch AR price', e);
    }

    if (arPrice.value === 0) arPrice.value = 5;
  }

  async function fetchInitialData() {
    try {
      ensureActivitiesToday();

      const res = await fetch(withWidgetToken('/api/modules'), {
        credentials: 'include',
        cache: 'no-store',
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json().catch(() => null);
        if (!data) return;
        if (data.lastTip) {
          lastTipConfig.value = {
            title: data.lastTip.title,
            walletAddress: data.lastTip.walletAddress,
            bgColor: data.lastTip.bgColor,
            fontColor: data.lastTip.fontColor,
            borderColor: data.lastTip.borderColor,
            amountColor: data.lastTip.amountColor,
            iconBgColor: data.lastTip.iconBgColor,
            fromColor: data.lastTip.fromColor,
          };
          if (data.lastTip.lastDonation) {
            lastTip.value = data.lastTip.lastDonation;
          }
        }

        if (data.externalNotifications && Array.isArray(data.externalNotifications.lastTips)) {
          lastTips.value = data.externalNotifications.lastTips.slice(0, 6);
        } else if (data.persistentTips && Array.isArray(data.persistentTips)) {
          lastTips.value = data.persistentTips.slice(0, 6);
        }

        if ((!lastTips.value || lastTips.value.length === 0) && data.lastTip?.lastDonation) {
          upsertLastTipHistory(data.lastTip.lastDonation);
        }
        if (data.tipGoal) {
          tipGoal.value = data.tipGoal;
        }
      } else if (res && !res.ok) {
        console.warn('Failed to fetch /api/modules', res.status);
      }

      const achConfigRes = await fetch(withWidgetToken('/api/achievements/config'), {
        credentials: 'include',
        cache: 'no-store',
      }).catch(() => null);
      if (achConfigRes && achConfigRes.ok) {
        const json = await achConfigRes.json().catch(() => null);
        if (!json) return;
        achievementConfig.value = json.data || {};
      }
      
      const achStatusRes = await fetch(withWidgetToken('/api/achievements/status'), {
        credentials: 'include',
        cache: 'no-store',
      }).catch(() => null);
      if (achStatusRes && achStatusRes.ok) {
        const json = await achStatusRes.json().catch(() => null);
        if (json && Array.isArray(json.notifications)) {
           achievements.value = json.notifications.slice(-20);
        }
      }

      const chatHistoryRes = await fetch(withWidgetToken('/api/chat/history'), {
        credentials: 'include',
        cache: 'no-store',
      }).catch(() => null);
      if (chatHistoryRes && chatHistoryRes.ok) {
        const history = await chatHistoryRes.json().catch(() => null);
        if (Array.isArray(history)) {
          chatMessages.value = history;

          history.forEach(msg => {
             if (msg.credits > 0 || msg.support_amount > 0) {
                 upsertLastTipHistory(msg, 20);
             }
          });
        }
      }

      const chatConfigRes = await fetch(withWidgetToken('/api/chat-config'), {
        credentials: 'include',
        cache: 'no-store',
      }).catch(() => null);
      if (chatConfigRes && chatConfigRes.ok) {
        const cfg = await chatConfigRes.json().catch(() => null);
        if (cfg) {
          chatConfig.value = cfg;
        }
      }

      const audioRes = await fetch(withWidgetToken('/api/goal-audio-settings'), {
        credentials: 'include',
        cache: 'no-store',
      }).catch(() => null);
      if (audioRes && audioRes.ok) {
        const json = await audioRes.json().catch(() => null);
        if (!json) return;
        sharedAudioSettings.value = {
          audioSource: json.audioSource || 'remote',
          hasCustomAudio: !!json.hasCustomAudio,
          enabled: typeof json.enabled === 'boolean' ? json.enabled : true,
          volume: typeof json.volume === 'number' ? json.volume : 0.5,
        };
      }

      const emojiRes = await fetch('/emojis.json').catch(() => null);
      if (emojiRes && emojiRes.ok) {
        emojiMapping.value = await emojiRes.json();
      }

      fetchLiveviewsStatus().catch(() => {});

    } catch (e) {
      console.error('Failed to fetch initial widget data', e);
    }
  }

  function initWebSocket() {
    void (async () => {
      let desiredNamespace = getWebSocketNamespace();

      if (!desiredNamespace) {
        try {
          const tok = await fetchWebSocketNamespaceOverride();
          if (tok) desiredNamespace = tok;
        } catch {}
      }

      const isAlive =
        ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING);
      if (isAlive && wsNamespace === desiredNamespace) return;

      if (ws && wsNamespace !== desiredNamespace) {
        try {
          const oldWs = ws;
          oldWs.onclose = null;
          oldWs.onerror = null;
          oldWs.onmessage = null;

          if (oldWs.readyState === WebSocket.CONNECTING) {
            oldWs.onopen = () => {
              try {
                oldWs.close();
              } catch {}
            };
          } else {
            oldWs.onopen = null;
            oldWs.close();
          }
        } catch {}
        ws = null;
        isConnected.value = false;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const host = resolveWebSocketHost();
      const qs = desiredNamespace ? `?ns=${encodeURIComponent(desiredNamespace)}` : '';
      wsNamespace = desiredNamespace;
      ws = new WebSocket(`${protocol}://${host}${qs}`);

      void fetchWebSocketNamespaceOverride().then((tok) => {
        if (!tok) return;
        if (wsNamespace !== tok) {
          try {
            initWebSocket();
          } catch {}
        }
      });

      ws.onopen = () => {
        isConnected.value = true;
        fetchArPrice();
        fetchInitialData();
        loadRaffleData();
        ws?.send(JSON.stringify({ type: 'get_raffle_state' }));
      };

      ws.onclose = () => {
        isConnected.value = false;
        ws = null;

        setTimeout(initWebSocket, 5000);
      };

      ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        
        if (msg.type === 'init' && msg.data) {
          if (msg.data.lastTip) {

             const payload = msg.data.lastTip.lastDonation || msg.data.lastTip;
             if (payload) lastTip.value = payload;
          }
          if (Array.isArray(msg.data.persistentTips)) {
            lastTips.value = msg.data.persistentTips.slice(0, 20);
            if (!lastTip.value && lastTips.value.length) {
              lastTip.value = lastTips.value[0];
            }
          }
          if (msg.data.tipGoal) {
            tipGoal.value = msg.data.tipGoal;
          }
        } else if (msg.type === 'lastTipConfig' && msg.data) {
          lastTipConfig.value = { ...lastTipConfig.value, ...msg.data };
        } else if (msg.type === 'tip' || msg.type === 'lastTip') {
          lastTip.value = msg.data;
          upsertLastTipHistory(msg.data);
          fetchArPrice();
        } else if (msg.type === 'tipGoal' || msg.type === 'tipGoalUpdate' || msg.type === 'goalUpdate') {
          tipGoal.value = msg.data;
        } else if (msg.type === 'tipNotification') {
          activeNotification.value = { ...msg.data, isDirectTip: true, timestamp: Date.now() };
          upsertLastTipHistory(msg.data);
          bumpActivitiesToday(1);
        } else if (msg.type === 'chatMessage') {
          chatMessages.value.push({ ...msg.data, timestamp: Date.now() });
          if (chatMessages.value.length > 100) {
            chatMessages.value.shift();
          }
          if (msg.data?.credits > 0) {
             upsertLastTipHistory(msg.data, 20);
             activeNotification.value = { ...msg.data, isChatTip: true, timestamp: Date.now() };
             if (arPrice.value === 0) fetchArPrice();
             bumpActivitiesToday(1);
          }
        } else if (msg.type === 'chatConfigUpdate') {
          if (msg.data) {
            chatConfig.value = { ...chatConfig.value, ...msg.data };
          }
        } else if (msg.type === 'raffle_state') {
          bumpActivitiesToday(1);
          if (msg.reset) {
            raffleWinner.value = null;
            raffleState.value = { ...msg, participants: [] };
            localStorage.removeItem(RAFFLE_WINNER_KEY);
            localStorage.removeItem(RAFFLE_STATE_KEY);
          } else {
            raffleState.value = { ...msg, timestamp: Date.now() };

            if (!raffleWinner.value && (msg.active || msg.paused)) {
              localStorage.setItem(RAFFLE_STATE_KEY, JSON.stringify(raffleState.value));
            } else if (!msg.active && !msg.paused) {
              localStorage.removeItem(RAFFLE_STATE_KEY);
            }
          }
        } else if (msg.type === 'raffle_winner') {
          bumpActivitiesToday(1);
          const winnerData = {
            winner: msg.winner,
            prize: msg.prize || msg.winner?.prize,
            command: msg.command || msg.winner?.command,
            imageUrl: msg.imageUrl || msg.winner?.imageUrl,
            timestamp: Date.now()
          };
          raffleWinner.value = winnerData;
          localStorage.setItem(RAFFLE_WINNER_KEY, JSON.stringify(winnerData));

          raffleState.value = null;
          localStorage.removeItem(RAFFLE_STATE_KEY);
        } else if (msg.type === 'init' && msg.data?.raffle) {

           raffleState.value = { ...msg.data.raffle, timestamp: Date.now() };
        } else if (msg.type === 'achievement' && msg.data) {
          achievements.value.push(msg.data);
          if (achievements.value.length > 20) achievements.value.shift();
          bumpActivitiesToday(1);
        } else if (msg.type === 'achievement-clear' && msg.data?.id) {
          achievements.value = achievements.value.filter(a => String(a.id) !== String(msg.data.id));
        } else if (msg.type === 'goalAudioSettingsUpdate' && msg.data) {
          sharedAudioSettings.value = { ...sharedAudioSettings.value, ...msg.data };
        }
      } catch (e) {
        console.error('WebSocket message error', e);
      }
      };
    })();
  }

  return {
    lastTip,
    lastTips,
    lastTipConfig,
    tipGoal,
    activeNotification,
    chatMessages,
    chatConfig,
    raffleState,
    raffleWinner,
    achievements,
    achievementConfig,
    sharedAudioSettings,
    arPrice,
    isConnected,
    emojiMapping,
    liveviewsStatus,
    streamHistoryStatus,
    streamHistoryPerf,
    streamHistorySummary,
    activitiesTodayCount,
    fetchArPrice,
    fetchInitialData,
    fetchLiveviewsStatus,
    fetchStreamHistoryStatus,
    fetchStreamHistoryPerformance,
    fetchStreamHistorySummary,
    initWebSocket
  };
});
