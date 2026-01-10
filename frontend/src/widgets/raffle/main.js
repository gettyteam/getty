import 'primeicons/primeicons.css';
import './raffle.css';
import enTranslations from 'shared-i18n/en.json';
import esTranslations from 'shared-i18n/es.json';

const FALLBACK_TRANSLATIONS = {
  en: enTranslations,
  es: esTranslations
};

let currentLanguage = 'en';
try {
  const p = new URLSearchParams(window.location.search);
  const l = p.get('lang');
  if (l && (l === 'es' || l === 'en')) {
    currentLanguage = l;
  }
} catch {}

const STORAGE_KEY = 'raffle-winner-data';
const ACTIVE_STATE_KEY = 'raffle-active-state';
const EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;
const ACTIVE_CACHE_MS = 30 * 60 * 1000;

const storage = (() => {
  try {
    const testKey = '__raffle_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch {
    return null;
  }
})();

const storageGet = (key) => {
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

const storageSet = (key, value) => {
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch {}
};

const storageRemove = (key) => {
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {}
};

const getI18nText = (key, fallback) => {
  const defaultText = typeof fallback === 'string' && fallback.trim() ? fallback : key;
  try {
    if (window.languageManager && typeof window.languageManager.getText === 'function') {
      const value = window.languageManager.getText(key);
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }
  } catch {}

  const lang = currentLanguage;
  const bundle = FALLBACK_TRANSLATIONS[lang] || FALLBACK_TRANSLATIONS.en;
  
  if (bundle && Object.prototype.hasOwnProperty.call(bundle, key)) {
    return bundle[key];
  }
  
  if (lang !== 'en' && FALLBACK_TRANSLATIONS.en && Object.prototype.hasOwnProperty.call(FALLBACK_TRANSLATIONS.en, key)) {
    return FALLBACK_TRANSLATIONS.en[key];
  }

  return defaultText;
};

const isDev = import.meta.env.DEV;
const backendPort = import.meta.env.VITE_BACKEND_PORT || '3000';
let wsPortOverride = null;
let attemptedDevFallback = false;

let container = null;
let contentRoot = null;
let ws = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 8;
const reconnectDelayBase = 1000;

let raffleData = {
  winner: null,
  prize: null,
  command: null,
  imageUrl: null,
  timestamp: null,
  participants: []
};
let lastActiveState = null;

const params = new URLSearchParams(window.location.search);
const tokenParam = (() => {
  try {
    return params.get('token') || params.get('widgetToken') || '';
  } catch {
    return '';
  }
})();

const withWidgetToken = (url) => {
  if (!tokenParam) return url;
  if (/^https?:/i.test(url)) {
    try {
      const parsed = new URL(url);
      if (!parsed.searchParams.has('widgetToken')) {
        parsed.searchParams.set('widgetToken', tokenParam);
      }
      return parsed.toString();
    } catch {
      return url;
    }
  }
  if (url.includes('widgetToken=')) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}widgetToken=${encodeURIComponent(tokenParam)}`;
};

const safeFetchJson = async (url, options = {}) => {
  try {
    const response = await fetch(withWidgetToken(url), { cache: 'no-store', ...options });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
};

const parseTimestamp = (input) => {
  if (!input) return null;
  if (typeof input === 'number') {
    const ms = input > 1e12 ? input : input * 1000;
    return new Date(ms);
  }
  try {
    const date = new Date(input);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

const SPACEMAN_AVATAR = 'https://thumbnails.odycdn.com/optimize/s:0:0/quality:85/plain/https://player.odycdn.com/speech/spaceman-png:2.png';

const formatTimestamp = (value) => {
  const date = parseTimestamp(value);
  if (!date) return '';
  try {
    const datePart = date.toLocaleDateString();
    const timePart = date.toLocaleTimeString();
    return `${datePart} ${timePart}`;
  } catch {
    return date.toISOString();
  }
};

const truncateName = (name) => {
  if (!name) return '';
  return name.length > 12 ? `${name.slice(0, 12)}…` : name;
};

const escapeHtml = (unsafe) => {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const getParticipantInfo = (entry) => {
  let name = 'Spaceman';
  let avatar = SPACEMAN_AVATAR;

  if (entry) {
    if (typeof entry === 'string') {
      name = entry.length > 24 ? `${entry.slice(0, 21)}…` : entry;
    } else if (typeof entry === 'object') {
      const candidate = entry.username || entry.name || entry.displayName;
      if (typeof candidate === 'string' && candidate.trim()) {
        name = truncateName(candidate.trim());
      }
      if (entry.avatar || entry.profilePicture) {
        avatar = entry.avatar || entry.profilePicture;
      }
    }
  }
  return { name, avatar };
};

const renderWidget = (props) => {
  const {
    active,
    paused,
    prize,
    command,
    imageUrl,
    participantsCount,
    winnersCount,
    recentWinners,
    statusMessage,
    statusClass,
    participants
  } = props;

  const isInitialRender = !contentRoot.querySelector('.giveaway-widget');

  const currentMode = recentWinners && recentWinners.length > 0 ? 'winner' : 'active';
  const needsFullRender = isInitialRender;

  if (needsFullRender) {
    const html = `
    <div class="giveaway-widget" data-mode="${currentMode}">
        <div class="raffle-widget-header">
            <div class="header-content">
                <div>
                    <div class="raffle-widget-title">${getI18nText('raffleTitle', 'GIVEAWAY')}</div>
                    <div class="raffle-widget-subtitle">${getI18nText('raffleSubtitle', 'Win amazing prizes!')}</div>
                </div>
            </div>
            <div class="live-badge${active && !paused ? '' : ' hidden'}">
                <i class="pi pi-circle-fill"></i> LIVE
            </div>
        </div>
        
        <div class="raffle-widget-body">
            <div class="prize-section">
                <div class="prize-name">${prize || getI18nText('raffleLoading', 'Loading...')}</div>
                
                <div class="prize-image${imageUrl ? '' : ' hidden'}">
                    ${imageUrl ? `<img src="${imageUrl}" alt="Prize" />` : `
                    <div class="image-placeholder">
                        <i class="pi pi-image"></i>
                        <div>Prize Image</div>
                    </div>`}
                </div>
            </div>
            
            <div class="participants-section">
                <div class="participants-count">
                    <div class="count-label">${getI18nText('raffleParticipants', 'Participants')}</div>
                    <div class="count-value">${participantsCount.toLocaleString()}</div>
                </div>
                <div class="winners-count">
                    <div class="winners-label">${getI18nText('raffleWinners', 'Winners')}</div>
                    <div class="winners-value">${winnersCount}</div>
                </div>
            </div>
            
            <div class="entry-section${currentMode === 'active' ? '' : ' hidden'}">
                <div class="command-hint">${getI18nText('raffleCommandHint', 'Type this command in chat to enter:')}</div>
                <div class="command-box">
                    <span class="command-prefix">!</span>
                    <span class="command">${(command || '!giveaway').replace(/^!/, '')}</span>
                </div>
                <div class="enter-info">
                    <i class="pi pi-ticket"></i>
                    <span>${getI18nText('raffleEnterBtn', 'Enter Giveaway')}</span>
                </div>
                <!-- Participant List Container -->
                <div class="participants-list-container">
                   <div class="participants-list-title">${getI18nText('raffleEntries', 'Recent Participants')}</div>
                   <div class="participants-list"></div>
                </div>
            </div>
            
            <div class="recent-winners${currentMode === 'winner' ? '' : ' hidden'}">
                <div class="winners-title">${getI18nText('raffleRecentWinners', 'Recent Winners')}</div>
                <div class="winner-list">
                    <!-- Specific winner list content injected below -->
                </div>
            </div>
        </div>
        
        <div class="raffle-widget-footer">
            <div class="status-message ${statusClass}">
                <i class="status-icon pi ${statusClass === 'active' ? 'pi-check-circle' : statusClass === 'paused' ? 'pi-pause' : 'pi-times-circle'}"></i> 
                <span class="status-text">${statusMessage}</span>
            </div>
        </div>
    </div>
    `;

    contentRoot.innerHTML = html;
  } else {
    const widget = contentRoot.querySelector('.giveaway-widget');
    if (widget && widget.dataset.mode !== currentMode) {
        widget.dataset.mode = currentMode;
    }
    
    const entrySection = contentRoot.querySelector('.entry-section');
    const recentWinnersSection = contentRoot.querySelector('.recent-winners');
    
    if (entrySection) {
        if (currentMode === 'active') entrySection.classList.remove('hidden');
        else entrySection.classList.add('hidden');
    }
    
    if (recentWinnersSection) {
        if (currentMode === 'winner') recentWinnersSection.classList.remove('hidden');
        else recentWinnersSection.classList.add('hidden');
    }
  }

  const liveBadge = contentRoot.querySelector('.live-badge');
  if (liveBadge) {
      if (active && !paused) liveBadge.classList.remove('hidden');
      else liveBadge.classList.add('hidden');
  }

  const prizeName = contentRoot.querySelector('.prize-name');
  if (prizeName && prizeName.textContent !== (prize || getI18nText('raffleLoading', 'Loading...'))) {
      prizeName.textContent = prize || getI18nText('raffleLoading', 'Loading...');
  }
  
  const prizeImageContainer = contentRoot.querySelector('.prize-image');
  if (prizeImageContainer) {
      if (imageUrl) {
          if (prizeImageContainer.classList.contains('hidden')) prizeImageContainer.classList.remove('hidden');
          const img = prizeImageContainer.querySelector('img');
          if (img) {
             if (img.src !== imageUrl) img.src = imageUrl;
          } else {
             prizeImageContainer.innerHTML = `<img src="${imageUrl}" alt="Prize" />`;
          }
      } else {
          if (!prizeImageContainer.classList.contains('hidden')) prizeImageContainer.classList.add('hidden');
      }
  }

  const countValue = contentRoot.querySelector('.participants-section .count-value');
  if (countValue) countValue.textContent = participantsCount.toLocaleString();

  const winnersValue = contentRoot.querySelector('.participants-section .winners-value');
  if (winnersValue) winnersValue.textContent = winnersCount;

  const commandEl = contentRoot.querySelector('.command');
  if (commandEl) {
      const cmdText = (command || '!giveaway').replace(/^!/, '');
      if (commandEl.textContent !== cmdText) commandEl.textContent = cmdText;
  }

  if (currentMode === 'active') {
      const listContainer = contentRoot.querySelector('.participants-list');
      if (listContainer) {
          const displayedText = listContainer.dataset.signature;
          const newSignature = participants.length + '-' + (participants[0]?.username || '');
          
          if (displayedText !== newSignature) {
              const recentParticipants = participants.slice(0, 10);
              listContainer.innerHTML = recentParticipants.map(p => {
                const info = getParticipantInfo(p);
                return `
                <div class="participant-pill">
                   <img src="${info.avatar}" class="participant-avatar" alt="" onerror="this.src='${SPACEMAN_AVATAR}'" />
                   <span class="participant-name">${escapeHtml(info.name)}</span>
                </div>
              `}).join('');
              listContainer.dataset.signature = newSignature;
          }
      }
  }

  if (currentMode === 'winner') {
      const winnerListV = contentRoot.querySelector('.winner-list');
      if (winnerListV) {
          const winnerHtml = recentWinners.map(w => {
            const avatar = w.avatar || SPACEMAN_AVATAR;
            
            return `
            <div class="winner-item">
                <img src="${avatar}" class="winner-avatar-img" alt="" onerror="this.src='${SPACEMAN_AVATAR}'" />
                <div class="winner-name">${escapeHtml(w.name)}</div>
                <div class="winner-time">${escapeHtml(w.time || getI18nText('justNow', 'Just now'))}</div>
            </div>
          `}).join('');
          if (winnerListV.innerHTML !== winnerHtml) {
              winnerListV.innerHTML = winnerHtml;
          }
      }
  }

  const statusMsgEl = contentRoot.querySelector('.status-message');
  if (statusMsgEl) {
      statusMsgEl.className = `status-message ${statusClass}`;
      const icon = statusMsgEl.querySelector('.status-icon');
      if (icon) {
          icon.className = `status-icon pi ${statusClass === 'active' ? 'pi-check-circle' : statusClass === 'paused' ? 'pi-pause' : 'pi-times-circle'}`;
      }
      const text = statusMsgEl.querySelector('.status-text');
      if (text) text.textContent = statusMessage;
  }
};

const renderRaffleContent = () => {
  if (!contentRoot) return;

  const isActive = lastActiveState && lastActiveState.enabled && (lastActiveState.active || lastActiveState.paused);
  const hasWinner = raffleData.winner && (
    (Array.isArray(raffleData.winner) && raffleData.winner.length > 0) ||
    (typeof raffleData.winner === 'string' && raffleData.winner.trim()) ||
    (typeof raffleData.winner === 'object' && (raffleData.winner.name || raffleData.winner.username))
  );

  let props = {
    active: false,
    paused: false,
    prize: '',
    command: (window.lastRaffleCommand || '').replace(/^!/, ''),
    imageUrl: '',
    participantsCount: 0,
    winnersCount: 0,
    recentWinners: [],
    statusMessage: getI18nText('raffleInactive', 'Giveaway is inactive'),
    statusClass: 'ended',
    participants: []
  };

  if (hasWinner) {
    const winnerNames = Array.isArray(raffleData.winner) ? raffleData.winner : [raffleData.winner];
    props.active = false;
    props.prize = raffleData.prize;
    props.command = (raffleData.command || '').replace(/^!/, '');
    props.imageUrl = raffleData.imageUrl;
    props.recentWinners = winnerNames.map(entry => {
      const info = getParticipantInfo(entry);
      return {
        name: info.name,
        avatar: info.avatar,
        time: formatTimestamp(raffleData.timestamp)
      };
    });

    if (lastActiveState && typeof lastActiveState.totalWinners === 'number') {
       props.winnersCount = lastActiveState.totalWinners + winnerNames.length;
    } else {
       props.winnersCount = winnerNames.length;
    }

    props.statusMessage = getI18nText('raffleEnded', 'Giveaway has ended');
    props.statusClass = 'ended';
  } else if (isActive) {
    props.active = lastActiveState.active;
    props.paused = lastActiveState.paused;
    props.prize = lastActiveState.prize;
    props.command = (lastActiveState.command || '').replace(/^!/, '');
    props.imageUrl = lastActiveState.imageUrl;
    props.participantsCount = (lastActiveState.participants || []).length;
    props.participants = lastActiveState.participants || [];
    props.winnersCount = lastActiveState.totalWinners || 0;

    if (props.paused) {
      props.statusMessage = getI18nText('rafflePaused', 'Giveaway is paused');
      props.statusClass = 'paused';
    } else {
      props.statusMessage = getI18nText('raffleActive', 'Giveaway is active');
      props.statusClass = 'active';
    }
  }

  renderWidget(props);
};

const loadSavedData = () => {
  const saved = storageGet(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.timestamp && (Date.now() - parsed.timestamp) < EXPIRATION_MS) {
        raffleData = { ...raffleData, ...parsed };
        if (parsed.command) {
          window.lastRaffleCommand = parsed.command;
        }
        return true;
      }
    } catch (error) {
      console.error('Failed to parse saved raffle winner:', error);
    }
  }

  const active = storageGet(ACTIVE_STATE_KEY);
  if (active) {
    try {
      const parsed = JSON.parse(active);
      if (parsed && parsed.timestamp && (Date.now() - parsed.timestamp) < ACTIVE_CACHE_MS) {
        lastActiveState = parsed;
        if (parsed.command) {
          window.lastRaffleCommand = parsed.command;
        }
        renderRaffleContent();
        return false;
      }
    } catch (error) {
      console.error('Failed to parse saved raffle state:', error);
    }
  }
  return false;
};

const saveWinnerData = (winner, prize, command, imageUrl) => {
  raffleData = {
    winner,
    prize,
    command,
    imageUrl,
    timestamp: Date.now(),
    participants: raffleData.participants
  };
  if (command) {
    window.lastRaffleCommand = command;
  }
  try {
    storageSet(STORAGE_KEY, JSON.stringify(raffleData));
  } catch {}
};

const handleWinner = (payload) => {
  if (!payload) return;

  let names = [];
  let prize = '';
  let command = '';
  let imageUrl = '';

  if (Array.isArray(payload.winner)) {
    names = payload.winner.filter(Boolean);
    prize = payload.prize || '';
    command = payload.command || '';
    imageUrl = payload.imageUrl || '';
  } else if (typeof payload.winner === 'string') {
    names = [payload.winner];
    prize = payload.prize || '';
    command = payload.command || '';
    imageUrl = payload.imageUrl || '';
  } else if (payload.winner && typeof payload.winner === 'object') {
    const winner = payload.winner;
    names = [winner.winner || winner.username || winner.name || ''];
    prize = winner.prize || payload.prize || '';
    command = winner.command || payload.command || '';
    imageUrl = winner.imageUrl || payload.imageUrl || '';

    const wObj = {
      name: winner.winner || winner.username || winner.name || '',
      avatar: winner.avatar || winner.profilePicture || ''
    };
    if (wObj.name) names = [wObj];
    else names = [];
    
  }

  names = names.filter(n => n && (typeof n === 'string' ? n : n.name));
  if (!names.length) return;

  saveWinnerData(names.length === 1 ? names[0] : names, prize, command, imageUrl);
  renderRaffleContent();
};

const updateRaffleState = (state, isRestore = false) => {
  if (!state || typeof state !== 'object') return;
  if (typeof state.command === 'string') {
    window.lastRaffleCommand = state.command;
  }

  if (state.command && raffleData.command && state.command !== raffleData.command) {
    raffleData = {
      winner: null,
      prize: null,
      command: state.command,
      imageUrl: null,
      timestamp: null,
      participants: []
    };
    storageRemove(STORAGE_KEY);
  }

  if (!isRestore && !raffleData.winner && state.enabled && (state.active || state.paused)) {
    try {
      storageSet(ACTIVE_STATE_KEY, JSON.stringify({ ...state, timestamp: Date.now() }));
    } catch {}
  }

  if (!state.enabled || (!state.active && !state.paused)) {
    storageRemove(ACTIVE_STATE_KEY);
    lastActiveState = null;
  } else {
    lastActiveState = state;
  }

  if (Array.isArray(state.participants)) {
    raffleData.participants = state.participants.slice(0, 200);
  }
  if (state.prize) raffleData.prize = state.prize;
  if (state.command) raffleData.command = state.command;
  if (state.imageUrl) raffleData.imageUrl = state.imageUrl;

  renderRaffleContent();
};

const resolveSocketHost = () => {
  if (wsPortOverride) {
    return `${window.location.hostname}:${wsPortOverride}`;
  }
  return window.location.host;
};

const buildWsUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
  const host = resolveSocketHost();
  const query = new URLSearchParams();
  if (tokenParam) {
    query.set('token', tokenParam);
    query.set('widgetToken', tokenParam);
  }
  const qs = query.toString();
  return qs ? `${protocol}${host}?${qs}` : `${protocol}${host}`;
};

const scheduleReconnect = () => {
  if (reconnectAttempts >= maxReconnectAttempts) {
    return;
  }
  reconnectAttempts += 1;
  const delay = reconnectDelayBase * Math.pow(2, reconnectAttempts - 1);
  setTimeout(connectWebSocket, delay);
};

const connectWebSocket = () => {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const url = buildWsUrl();
  try {
    ws = new WebSocket(url);
  } catch (error) {
    console.error('Raffle widget WebSocket init failed:', error);
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    reconnectAttempts = 0;
    try {
      ws.send(JSON.stringify({ type: 'get_raffle_state' }));
    } catch {}
  };

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      if (!message) return;

      if (message.type === 'raffle_state') {
        if (message.reset === true) {
          storageRemove(STORAGE_KEY);
          raffleData = {
            winner: null,
            prize: null,
            command: message.command || '!giveaway',
            imageUrl: null,
            timestamp: null,
            participants: []
          };
        }
        updateRaffleState(message);
        return;
      }

      if (message.type === 'init' && message.data && message.data.raffle) {
        updateRaffleState(message.data.raffle, true);
        return;
      }

      if (message.type === 'raffle_winner') {
        handleWinner(message);
        return;
      }
    } catch (error) {
      console.error('Raffle widget message error:', error);
    }
  };

  ws.onerror = (error) => {
    console.error('Raffle widget WebSocket error:', error);
  };

  ws.onclose = () => {
    if (
      isDev &&
      !attemptedDevFallback &&
      !wsPortOverride &&
      window.location.port &&
      window.location.port !== backendPort
    ) {
      attemptedDevFallback = true;
      wsPortOverride = backendPort;
      reconnectAttempts = 0;
      setTimeout(connectWebSocket, 200);
      return;
    }
    scheduleReconnect();
  };
};

const initLanguage = async () => {
  try {
    const res = await fetch(withWidgetToken('/api/language'));
    if (res.ok) {
      const data = await res.json();
      if (data && data.currentLanguage) {
        currentLanguage = data.currentLanguage;
      }
    }
  } catch (e) {
    console.warn('Failed to fetch language settings', e);
  }
};

const fetchInitialState = async () => {
  const state = await safeFetchJson('/api/raffle/state');
  if (state && typeof state === 'object') {
    updateRaffleState(state, true);
  }
};

const init = async () => {
  container = document.getElementById('raffleContainer');
  contentRoot = document.getElementById('raffleContentContainer');

  if (!container || !contentRoot) {
    console.error('Raffle widget container not found');
    return;
  }

  await initLanguage();
  loadSavedData();
  renderRaffleContent();
  fetchInitialState();
  connectWebSocket();

  window.addEventListener('beforeunload', () => {
    try {
      if (ws) ws.close();
    } catch {}
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
