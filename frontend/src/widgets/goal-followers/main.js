import './goal-followers.css';

import enTranslations from 'shared-i18n/en.json';
import esTranslations from 'shared-i18n/es.json';

const FALLBACK_TRANSLATIONS = {
  en: enTranslations,
  es: esTranslations,
};

function normalizeLanguageCode(lang) {
  if (!lang || typeof lang !== 'string') return 'en';
  return lang.toLowerCase().split('-')[0] || 'en';
}

let currentLanguage = normalizeLanguageCode(document.documentElement?.lang || 'en');

function setCurrentLanguage(lang) {
  currentLanguage = normalizeLanguageCode(lang);
}

function refreshLanguageFromGlobals() {
  try {
    if (window.__i18n && typeof window.__i18n.current === 'string') {
      setCurrentLanguage(window.__i18n.current);
      return;
    }
  } catch {}
  try {
    if (window.languageManager && typeof window.languageManager.current === 'string') {
      setCurrentLanguage(window.languageManager.current);
      return;
    }
  } catch {}
}

const getI18nText = (key, fallback) => {
  const defaultText = typeof fallback === 'string' && fallback.trim() ? fallback : key;
  try {
    if (window.__i18n && typeof window.__i18n.t === 'function') {
      const v = window.__i18n.t(key);
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    if (window.languageManager && typeof window.languageManager.getText === 'function') {
      const value = window.languageManager.getText(key);
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
  } catch {}

  const lang = FALLBACK_TRANSLATIONS[currentLanguage] ? currentLanguage : 'en';
  const bundle = FALLBACK_TRANSLATIONS[lang] || {};
  if (bundle && Object.prototype.hasOwnProperty.call(bundle, key)) {
    const v = bundle[key];
    if (typeof v === 'string' && v.trim()) return v;
  }
  if (
    lang !== 'en' &&
    FALLBACK_TRANSLATIONS.en &&
    Object.prototype.hasOwnProperty.call(FALLBACK_TRANSLATIONS.en, key)
  ) {
    const v = FALLBACK_TRANSLATIONS.en[key];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return defaultText;
};

function getNonce() {
  try {
    const meta = document.querySelector('meta[property="csp-nonce"]');
    if (meta && (meta.nonce || meta.getAttribute('nonce'))) {
      return meta.nonce || meta.getAttribute('nonce');
    }
    if (document.head && document.head.dataset && document.head.dataset.cspNonce) {
      return document.head.dataset.cspNonce;
    }
  } catch {}
  return '';
}

function ensureStyleTag(id) {
  let tag = document.getElementById(id);
  if (!tag) {
    tag = document.createElement('style');
    tag.id = id;
    const nonce = getNonce();
    if (nonce) tag.setAttribute('nonce', nonce);
    document.head.appendChild(tag);
  } else {
    try {
      const nonce = getNonce();
      if (nonce && !tag.getAttribute('nonce')) tag.setAttribute('nonce', nonce);
    } catch {}
  }
  return tag;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function clamp(n, min, max) {
  const v = Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.min(max, Math.max(min, v));
}

function parseWidgetToken() {
  try {
    const url = new URL(window.location.href);
    return url.searchParams.get('widgetToken') || url.searchParams.get('token') || '';
  } catch {
    return '';
  }
}

function setCssVars(cfg) {
  try {
    const tag = ensureStyleTag('goal-followers-inline-vars');
    const decl = [];
    if (cfg && typeof cfg === 'object') {
      if (cfg.color) decl.push(`--gf-progress:${String(cfg.color)};`);
      if (cfg.bgColor) decl.push(`--gf-card-bg:${String(cfg.bgColor)};`);
      decl.push(`--gf-radius:${Number(cfg.borderRadius) || 16}px;`);
      decl.push(`--gf-width:${clamp(cfg.width, 1, 1920)}px;`);
      decl.push(`--gf-height:${clamp(cfg.height, 1, 1080)}px;`);
    }
    tag.textContent = decl.length ? `#goal-followers-widget.gf-root{${decl.join('')}}` : '';
  } catch {}
}

function setFillPct(pct) {
  try {
    const tag = ensureStyleTag('goal-followers-inline-progress');
    const value = clamp(pct, 0, 100).toFixed(1);
    tag.textContent = `#goal-followers-widget .gf-fill{width:${value}%;}`;
  } catch {}
}

function createConfetti(container, count = 60) {
  const colors = ['#00ff7f', '#7c3aed', '#22c55e', '#38bdf8', '#f59e0b', '#fb7185'];
  const rect = container.getBoundingClientRect();
  const batchId = `gf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const rules = [];
  const nodes = [];

  for (let i = 0; i < count; i += 1) {
    const node = document.createElement('div');
    const cls = `gf-confetti-${batchId}-${i}`;
    node.className = `gf-confetti ${cls}`;

    const startX = Math.random() * rect.width;
    const dx = (Math.random() - 0.5) * rect.width * 0.9;
    const dy = rect.height + 180 + Math.random() * 180;
    const rot = 180 + Math.random() * 540;
    const delay = Math.random() * 0.18;
    const bg = colors[Math.floor(Math.random() * colors.length)];

    rules.push(
      `#goal-followers-widget .${cls}{left:${startX.toFixed(2)}px;top:-20px;background:${bg};--dx:${dx.toFixed(2)}px;--dy:${dy.toFixed(2)}px;--rot:${rot.toFixed(2)}deg;animation-delay:${delay.toFixed(3)}s;}`
    );

    container.appendChild(node);
    nodes.push(node);
  }

  try {
    const tag = ensureStyleTag('goal-followers-confetti');
    tag.dataset.batchId = batchId;
    tag.textContent = rules.join('\n');
  } catch {}

  setTimeout(() => {
    try {
      nodes.forEach((n) => n.remove());
    } catch {}
    try {
      const tag = document.getElementById('goal-followers-confetti');
      if (tag && tag.dataset && tag.dataset.batchId === batchId) {
        tag.textContent = '';
      }
    } catch {}
  }, 2600);
}

function withWidgetToken(url, widgetToken) {
  if (!widgetToken) return url;
  if (url.includes('widgetToken=')) return url;
  const sep = url.includes('?') ? '&' : '?';
  const parts = [`widgetToken=${encodeURIComponent(widgetToken)}`];
  if (!url.includes('token=')) parts.push(`token=${encodeURIComponent(widgetToken)}`);
  return `${url}${sep}${parts.join('&')}`;
}

async function safeFetchJson(url, widgetToken) {
  try {
    const res = await fetch(withWidgetToken(url, widgetToken), { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function loadAudioSettings(widgetToken) {
  const settings = await safeFetchJson(`/api/goal-followers-audio-settings`, widgetToken);
  if (!settings) return { enabled: false, volume: 0.8 };
  return {
    enabled: settings.enabled !== false,
    volume: typeof settings.volume === 'number' ? clamp(settings.volume, 0, 1) : 0.8,
    hasCustomAudio: !!settings.hasCustomAudio,
  };
}

async function playGoalSound(widgetToken, audioState) {
  if (!audioState || !audioState.enabled) return;
  const payload = await safeFetchJson(`/api/goal-followers-audio`, widgetToken);
  if (!payload || !payload.url) return;

  const audio = new Audio(payload.url);
  audio.volume = clamp(audioState.volume, 0, 1);
  await audio.play();
}

async function main() {
  const mount = document.getElementById('goal-followers-widget');
  if (!mount) return;

  if (window.__goal_followers_widget_started) return;
  window.__goal_followers_widget_started = true;

  const widgetToken = parseWidgetToken();
  const celebrationKey = 'goalFollowersCelebration';

  let cfg = null;
  let hasReached = false;
  let audioState = await loadAudioSettings(widgetToken);
  let playingLock = false;

  let lastStatus = { active: false };

  let ws = null;
  let wsConnected = false;
  let reconnectTimer = null;
  let reconnectDelay = 1000;

  const render = (state) => {
    lastStatus = state || { active: false };
    if (!state || !state.active) {
      setFillPct(0);
      mount.className = 'gf-root';
      mount.innerHTML = `
        <div class="gf-card">
          <div class="gf-title">${escapeHtml(
            getI18nText('goalFollowersPending', 'Configuration pending')
          )}</div>
          <div class="gf-status">${escapeHtml(
            getI18nText(
              'goalFollowersPendingHint',
              'Log in/configure Odysee and select your channel'
            )
          )}</div>
          <div class="gf-track"><div class="gf-fill"></div></div>
        </div>
      `;
      return;
    }

    const title =
      (cfg && cfg.title && String(cfg.title).trim()) ||
      getI18nText('goalFollowersDefaultTitle', "Let's reach the follower goal!");
    const goal = Number(cfg?.goal) || 1;
    const current = Number(state.currentFollowers) || 0;
    const pct = clamp((current / goal) * 100, 0, 100);

    setFillPct(pct);

    mount.className = `gf-root ${pct >= 100 ? 'gf-celebrating' : ''}`;
    mount.innerHTML = `
      <div class="gf-card">
        <div class="gf-title">${escapeHtml(title)}</div>
        <div class="gf-row">
          <div class="gf-current">${escapeHtml(current.toLocaleString())}</div>
          <div class="gf-target">/ ${escapeHtml(goal.toLocaleString())} ${escapeHtml(
            getI18nText('goalFollowersLabel', 'Followers')
          )}</div>
        </div>
        <div class="gf-track">
          <div class="gf-fill"></div>
          <div class="gf-percent">${pct.toFixed(1)}%</div>
        </div>
        <div class="gf-status">${escapeHtml(
          pct >= 100
            ? getI18nText('goalFollowersCompleted', 'Goal completed')
            : getI18nText('goalFollowersInProgress', 'In progress')
        )}</div>
      </div>
    `;
  };

  const rerenderForLanguage = () => {
    try {
      refreshLanguageFromGlobals();
      render(lastStatus);
    } catch {}
  };

  if (typeof MutationObserver === 'function') {
    try {
      const langObserver = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.type === 'attributes' && m.attributeName === 'lang') {
            try {
              const newLang = m.target?.getAttribute?.('lang');
              if (newLang) setCurrentLanguage(newLang);
            } catch {}
            rerenderForLanguage();
            break;
          }
        }
      });
      langObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    } catch {}
  }

  try {
    window.addEventListener('storage', (event) => {
      if (!event) return;
      if (
        event.key === 'getty-language' ||
        event.key === 'lang' ||
        event.key === 'language' ||
        event.key === 'i18nextLng'
      ) {
        if (typeof event.newValue === 'string' && event.newValue) {
          setCurrentLanguage(event.newValue);
        }
        rerenderForLanguage();
      }
    });
  } catch {}

  try {
    if (window.__i18n && typeof window.__i18n.setLanguage === 'function' && !window.__i18n.__goalFollowersHooked) {
      const originalSetLanguage = window.__i18n.setLanguage.bind(window.__i18n);
      window.__i18n.setLanguage = async function patchedSetLanguage(lang) {
        const result = await originalSetLanguage(lang);
        try {
          setCurrentLanguage(lang);
          rerenderForLanguage();
        } catch {}
        return result;
      };
      try { setCurrentLanguage(window.__i18n.current); } catch {}
      window.__i18n.__goalFollowersHooked = true;
    }
  } catch {}

  try {
    if (
      window.languageManager &&
      typeof window.languageManager.updatePageLanguage === 'function' &&
      !window.languageManager.__goalFollowersHooked
    ) {
      const originalUpdate = window.languageManager.updatePageLanguage.bind(window.languageManager);
      window.languageManager.updatePageLanguage = function patchedUpdatePageLanguage(...args) {
        const result = originalUpdate(...args);
        try {
          refreshLanguageFromGlobals();
          rerenderForLanguage();
        } catch {}
        return result;
      };
      try { refreshLanguageFromGlobals(); } catch {}
      window.languageManager.__goalFollowersHooked = true;
    }
  } catch {}

  const clearCelebration = () => {
    try {
      localStorage.removeItem(celebrationKey);
    } catch {}
  };

  const markCelebrated = () => {
    try {
      localStorage.setItem(celebrationKey, String(Date.now()));
    } catch {}
  };

  const alreadyCelebrated = () => {
    try {
      return !!localStorage.getItem(celebrationKey);
    } catch {
      return false;
    }
  };

  const loadConfig = async () => {
    const data = await safeFetchJson(`/api/goal-followers`, widgetToken);
    if (!data || !data.success) return null;
    return data;
  };

  const loadCurrent = async () => {
    return await safeFetchJson(`/api/goal-followers/current`, widgetToken);
  };

  const computeReached = (status) => {
    if (!status || !status.active) return false;
    const goal = Number(cfg?.goal) || 1;
    const current = Number(status.currentFollowers) || 0;
    return goal > 0 && current >= goal;
  };

  const handleStatus = async (status) => {
    render(status);

    const reached = computeReached(status);
    if (reached && !hasReached) {
      hasReached = true;
      if (!alreadyCelebrated()) {
        createConfetti(mount, 80);
        if (!playingLock) {
          playingLock = true;
          try {
            audioState = await loadAudioSettings(widgetToken);
            await playGoalSound(widgetToken, audioState);
          } finally {
            playingLock = false;
          }
        }
        markCelebrated();
      }
    }

    if (!reached && hasReached) {
      hasReached = false;
      clearCelebration();
    }
  };

  const buildWsUrls = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const primary = `${protocol}//${host}/?widgetToken=${encodeURIComponent(widgetToken)}&token=${encodeURIComponent(widgetToken)}`;

    try {
      const port = window.location.port;
      const hostname = window.location.hostname;
      if (port === '5173' || port === '5174' || port === '3000') {
        const fallback = `${protocol}//${hostname}:7999/?widgetToken=${encodeURIComponent(widgetToken)}&token=${encodeURIComponent(widgetToken)}`;
        return [primary, fallback];
      }
    } catch {}

    return [primary];
  };

  const scheduleReconnect = () => {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      reconnectDelay = Math.min(15000, reconnectDelay * 1.5);
      connectWebSocket();
    }, reconnectDelay);
  };

  const connectWebSocket = () => {
    if (!widgetToken) return;
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

    const urls = buildWsUrls();
    let attemptIndex = 0;

    const tryConnect = () => {
      const url = urls[Math.min(attemptIndex, urls.length - 1)];
      attemptIndex += 1;

      try {
        ws = new WebSocket(url);
      } catch {
        scheduleReconnect();
        return;
      }

      ws.onopen = async () => {
        wsConnected = true;
        reconnectDelay = 1000;
        try {
          await tick();
        } catch {}
      };

      ws.onmessage = async (event) => {
        let msg;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }

        if (!msg || typeof msg.type !== 'string') return;

        if (msg.type === 'goalFollowersAudioSettingsUpdate' && msg.data) {
          try {
            audioState = {
              enabled: msg.data.enabled !== false,
              volume: typeof msg.data.volume === 'number' ? clamp(msg.data.volume, 0, 1) : audioState.volume,
              hasCustomAudio: !!msg.data.hasCustomAudio,
            };
          } catch {}
          return;
        }

        if (msg.type === 'goalFollowersUpdate' && msg.data) {
          cfg = msg.data;
          setCssVars(cfg);
          try {
            const status = await loadCurrent();
            if (status) await handleStatus(status);
          } catch {}
          return;
        }

        if (msg.type === 'goalFollowersCurrentUpdate' && msg.data) {
          try {
            await handleStatus({ active: true, currentFollowers: msg.data.currentFollowers });
          } catch {}
          return;
        }

        if (msg.type === 'init' && msg.data && msg.data.goalFollowers) {
          try {
            cfg = msg.data.goalFollowers;
            setCssVars(cfg);
            if (typeof cfg.currentFollowers === 'number') {
              await handleStatus({ active: true, currentFollowers: cfg.currentFollowers });
            }
          } catch {}
        }
      };

      ws.onclose = () => {
        wsConnected = false;
        if (urls.length > 1 && attemptIndex < urls.length) {
          tryConnect();
          return;
        }
        scheduleReconnect();
      };

      ws.onerror = () => {
        try {
          ws.close();
        } catch {}
      };
    };

    tryConnect();
  };

  const tick = async () => {
    const nextCfg = await loadConfig();
    if (!nextCfg) {
      cfg = null;
      await handleStatus({ active: false });
      return;
    }
    cfg = nextCfg;
    setCssVars(cfg);

    const status = await loadCurrent();
    if (!status) {
      await handleStatus({ active: false });
      return;
    }

    await handleStatus(status);
  };

  await tick();

  connectWebSocket();

  const FALLBACK_TICK_MS = 15000;
  const CURRENT_POLL_MS = 60000;

  setInterval(async () => {
    if (wsConnected) return;
    await tick();
  }, FALLBACK_TICK_MS);

  setInterval(async () => {
    if (!cfg) return;
    const status = await loadCurrent();
    if (status) await handleStatus(status);
  }, CURRENT_POLL_MS);
}

main();
