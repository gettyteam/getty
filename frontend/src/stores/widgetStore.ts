import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useWidgetStore = defineStore('widgets', () => {
  const lastTip = ref<any>(null);
  const lastTipConfig = ref<any>({});
  const tipGoal = ref<any>(null);
  const activeNotification = ref<any>(null);
  const chatMessages = ref<any[]>([]);
  const raffleState = ref<any>(null);
  const raffleWinner = ref<any>(null);
  const achievements = ref<any[]>([]);
  const achievementConfig = ref<any>({});
  const sharedAudioSettings = ref<any>({ enabled: true, volume: 0.5, audioSource: 'remote' });
  const arPrice = ref<number>(0);
  const isConnected = ref(false);
  const emojiMapping = ref<Record<string, string>>({});
  let ws: WebSocket | null = null;

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
      const el = document.getElementById('dashboard-bootstrap');
      const raw = (el && 'textContent' in el ? (el as any).textContent : '') || '';
      if (!raw) return '';
      const parsed = JSON.parse(raw);
      const token = typeof parsed?.widgetToken === 'string' ? parsed.widgetToken.trim() : '';
      return token;
    } catch {}

    return '';
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

    } catch (e) {
      console.error('Failed to fetch initial widget data', e);
    }
  }

  function initWebSocket() {
    if (ws) return;

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${protocol}://${window.location.host}`);

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
          if (msg.data.tipGoal) {
            tipGoal.value = msg.data.tipGoal;
          }
        } else if (msg.type === 'lastTipConfig' && msg.data) {
          lastTipConfig.value = { ...lastTipConfig.value, ...msg.data };
        } else if (msg.type === 'tip' || msg.type === 'lastTip') {
          lastTip.value = msg.data;
          fetchArPrice();
        } else if (msg.type === 'tipGoal' || msg.type === 'tipGoalUpdate' || msg.type === 'goalUpdate') {
          tipGoal.value = msg.data;
        } else if (msg.type === 'tipNotification') {
          activeNotification.value = { ...msg.data, isDirectTip: true, timestamp: Date.now() };
        } else if (msg.type === 'chatMessage') {
          chatMessages.value.push({ ...msg.data, timestamp: Date.now() });
          if (chatMessages.value.length > 100) {
            chatMessages.value.shift();
          }
          if (msg.data?.credits > 0) {
            activeNotification.value = { ...msg.data, isChatTip: true, timestamp: Date.now() };
          }
        } else if (msg.type === 'raffle_state') {
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
        } else if (msg.type === 'achievement-clear' && msg.data?.id) {
          achievements.value = achievements.value.filter(a => String(a.id) !== String(msg.data.id));
        } else if (msg.type === 'goalAudioSettingsUpdate' && msg.data) {
          sharedAudioSettings.value = { ...sharedAudioSettings.value, ...msg.data };
        }
      } catch (e) {
        console.error('WebSocket message error', e);
      }
    };
  }

  return {
    lastTip,
    lastTipConfig,
    tipGoal,
    activeNotification,
    chatMessages,
    raffleState,
    raffleWinner,
    achievements,
    achievementConfig,
    sharedAudioSettings,
    arPrice,
    isConnected,
    emojiMapping,
    fetchArPrice,
    fetchInitialData,
    initWebSocket
  };
});
