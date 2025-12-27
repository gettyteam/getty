import './chat.css';

let activityEffectApp = null;
async function tryMountActivityEffect() {
    try {
        const { mountChatActivityEffect } = await import('./mountActivityEffect.js');
        activityEffectApp = mountChatActivityEffect({
            windowMs: 120000,
            threshold: 5,
            maxMessages: 25,
            highlightDurationMs: 30000,
            announce: false,
        });
        return true;
    } catch (err) {
        try {
            window.__gettyChatActivityMountError = String(err?.message || err);
        } catch {}
        try {
            if (import.meta?.env?.DEV) console.error('[chat widget] activity effect mount failed:', err);
        } catch {}
        return false;
    }
}

function unmountActivityEffect() {
    try {
        if (activityEffectApp && typeof activityEffectApp.unmount === 'function') {
            activityEffectApp.unmount();
        }
    } catch {}
    activityEffectApp = null;
    try {
        const host = document.getElementById('getty-chat-activity-root');
        if (host && host.parentNode) host.parentNode.removeChild(host);
    } catch {}
    try {
        window.__gettyChatActivityMounted = false;
        window.__gettyChatActivityApp = null;
    } catch {}
}

document.addEventListener('DOMContentLoaded', async () => {
    const chatContainer = document.getElementById('chat-container');
    if (!chatContainer) {
        return;
    }

    const isDev = import.meta.env.DEV;
    const debugLog = isDev
        ? (...args) => {
            console.warn('[chat widget]', ...args);
        }
        : () => {};
    const backendPort = import.meta.env.VITE_BACKEND_PORT || '3000';
    let wsPortOverride = null;
    let attemptedDevFallback = false;

    let messageCount = 0;
    let isAutoScroll = true;
    const isHorizontal = window.location.search.includes('horizontal=1') || window.location.hash.includes('horizontal');

    let horizontalScrollPending = false;
    let horizontalScrollBehavior = 'auto';
    function scheduleHorizontalScrollToEnd(behavior = 'auto') {
        if (!isHorizontal || !chatContainer) return;
        horizontalScrollBehavior = behavior;

        let reducedMotion = false;
        try {
            reducedMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
        } catch { /* ignore */ }
        if (reducedMotion) horizontalScrollBehavior = 'auto';

        if (horizontalScrollPending) return;
        horizontalScrollPending = true;
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                horizontalScrollPending = false;
                const maxLeft = Math.max(0, chatContainer.scrollWidth - chatContainer.clientWidth);
                try {
                    if (typeof chatContainer.scrollTo === 'function') {
                        chatContainer.scrollTo({ left: maxLeft, behavior: horizontalScrollBehavior });
                    } else {
                        chatContainer.scrollLeft = maxLeft;
                    }
                } catch {
                    chatContainer.scrollLeft = maxLeft;
                }
            });
        });
    }

    let EMOJI_MAPPING = {};
    try {
        const response = await fetch(`/emojis.json?nocache=${Date.now()}`);
        EMOJI_MAPPING = await response.json();
    } catch (e) {
        console.error('Error loading emojis:', e);
    }

    const DEFAULT_AVATAR_URL = 'https://thumbnails.odycdn.com/optimize/s:0:0/quality:85/plain/https://player.odycdn.com/speech/spaceman-png:2.png';
    const DEFAULT_AVATAR_BG_COLORS = [
        '#00bcd4', '#ff9800', '#8bc34a', '#e91e63', '#9c27b0',
        '#3f51b5', '#ff5722', '#4caf50', '#2196f3', '#ffc107'
    ];
    let randomAvatarBgPerMessage = false;
    try {
        const ls = localStorage.getItem('chat_avatar_random_bg');
        if (ls === '1' || ls === '0') randomAvatarBgPerMessage = (ls === '1');
    } catch {}
    {
        const urlParams = new URLSearchParams(window.location.search);
        const randomParam = urlParams.get('avatarRandom') || urlParams.get('randomAvatarBg');
        if (randomParam === '1') randomAvatarBgPerMessage = true;
        if (randomParam === '0') randomAvatarBgPerMessage = false;
        if (window.location.hash.includes('avatarRandom')) randomAvatarBgPerMessage = true;
    }
    const urlParams = new URLSearchParams(window.location.search);
    let token = urlParams.get('token');
    if (token && token.includes('?')) {
        token = token.split('?')[0];
    }

    let activityEffectEnabled = true;

    async function fetchChatConfig() {
        try {
            const res = await fetch(`/api/chat-config?nocache=${Date.now()}${token ? `&token=${encodeURIComponent(token)}` : ''}`);
            return await res.json();
        } catch {
            return null;
        }
    }

    function applyActivityEffectEnabled(nextEnabled) {
        const enabled = typeof nextEnabled === 'boolean' ? nextEnabled : true;
        activityEffectEnabled = enabled;
        if (!activityEffectEnabled) {
            unmountActivityEffect();
            return;
        }
        if (!activityEffectApp) {
            try { void tryMountActivityEffect(); } catch {}
        }
    }

    try {
        const cfg = await fetchChatConfig();
        if (cfg) {
            if (typeof cfg.activityEffectEnabled === 'boolean') {
                activityEffectEnabled = !!cfg.activityEffectEnabled;
            }
            if (
                (typeof randomAvatarBgPerMessage !== 'boolean' || randomAvatarBgPerMessage === false) &&
                typeof cfg.avatarRandomBg === 'boolean' &&
                localStorage.getItem('chat_avatar_random_bg') === null
            ) {
                randomAvatarBgPerMessage = !!cfg.avatarRandomBg;
            }
        }
    } catch {}

    applyActivityEffectEnabled(activityEffectEnabled);
    function resolveSocketHost() {
        if (wsPortOverride) {
            return `${window.location.hostname}:${wsPortOverride}`;
        }
        return window.location.host;
    }

    const buildWsUrl = () => {
        const protocol = location.protocol === 'https:' ? 'wss://' : 'ws://';
        return protocol + resolveSocketHost() + (token ? `?ns=${encodeURIComponent(token)}` : '');
    };

    let ws;
    let reconnectInterval;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 10;
    const reconnectDelay = 5000; // 5 seconds

    let ttsEnabled = true;
    let ttsAllChat = false;
    let ttsLanguage = 'en';

    function stripEmojis(text) {
      if (!text) return '';
      let cleaned = text.replace(/:[^:\s]+:/g, '');
      cleaned = cleaned.replace(/<stkr>.*?<\/stkr>/g, '');
    cleaned = cleaned.replace(/<img[^>]*class="(?:comment-emoji|comment-sticker)[^>]*>/gi, '');
      cleaned = cleaned.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '');
      cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
      return cleaned;
    }
    function selectVoice(utterance, voices) {
      if (ttsLanguage === 'en') { const english = voices.filter(v => v.lang.startsWith('en')); if (english.length) utterance.voice = english[0]; }
      else { const spanish = voices.filter(v => v.lang.includes('es')); if (spanish.length) utterance.voice = spanish[0]; }
    }
    function speakMessage(text) {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return; const cleaned = stripEmojis(text); if (!cleaned) return; window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(cleaned); u.volume = 0.9; u.rate = 1; u.pitch = 0.9; let voices = window.speechSynthesis.getVoices(); if (voices.length === 0) { window.speechSynthesis.onvoiceschanged = () => { voices = window.speechSynthesis.getVoices(); selectVoice(u, voices); window.speechSynthesis.speak(u); }; } else { selectVoice(u, voices); window.speechSynthesis.speak(u); }
    }
    async function loadTtsSettings() {
    try { const s = await fetch('/api/tts-setting'); if (s.ok) { const j = await s.json(); debugLog('Chat TTS settings:', j); ttsEnabled = !!j.ttsEnabled; ttsAllChat = !!j.ttsAllChat; } const l = await fetch('/api/tts-language'); if (l.ok) { const j2 = await l.json(); ttsLanguage = j2.ttsLanguage || 'en'; } } catch {}
    }
    loadTtsSettings();

    function connectWebSocket() {
        if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
            return; // Already connected or connecting
        }

        const wsUrl = buildWsUrl();
        try {
            debugLog('Connecting to WebSocket:', wsUrl);
        } catch {}

        try {
            ws = new WebSocket(wsUrl);
        } catch (err) {
            console.error('WebSocket init error:', err);
            if (reconnectAttempts < maxReconnectAttempts) {
                setTimeout(() => {
                    reconnectAttempts++;
                    connectWebSocket();
                }, reconnectDelay);
            }
            return;
        }

        ws.onopen = () => {
            debugLog('WebSocket connected');
            reconnectAttempts = 0;
            if (reconnectInterval) {
                clearInterval(reconnectInterval);
                reconnectInterval = null;
            }
        };

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.type === 'ttsSettingUpdate') {
                    if (Object.prototype.hasOwnProperty.call(msg.data || {}, 'ttsEnabled')) ttsEnabled = !!msg.data.ttsEnabled;
                    if (Object.prototype.hasOwnProperty.call(msg.data || {}, 'ttsAllChat')) ttsAllChat = !!msg.data.ttsAllChat;
                    return;
                }
                if (msg.type === 'ttsLanguageUpdate' && msg.data?.ttsLanguage) {
                    ttsLanguage = msg.data.ttsLanguage;
                    return;
                }
                if (msg.type === 'chatConfigUpdate') {
                    fetchAndApplyTheme();
                    applyChatColors();

                    try {
                        if (Object.prototype.hasOwnProperty.call(msg.data || {}, 'activityEffectEnabled')) {
                            applyActivityEffectEnabled(!!msg.data.activityEffectEnabled);
                        }
                    } catch {}

                    (async () => {
                        try {
                            const cfg = await fetchChatConfig();
                            if (cfg && typeof cfg.avatarRandomBg === 'boolean') {
                                randomAvatarBgPerMessage = !!cfg.avatarRandomBg;
                            }
                            if (cfg && typeof cfg.activityEffectEnabled === 'boolean') {
                                applyActivityEffectEnabled(!!cfg.activityEffectEnabled);
                            }
                        } catch {/* ignore */}
                    })();
                    return;
                }
                if (msg.type === 'chatActivityPreview' && msg.data) {
                    try {
                        const d = msg.data || {};
                        const userKey = String(d.userKey || d.username || '').trim();
                        if (userKey) {
                            window.dispatchEvent(
                                new CustomEvent('getty:chat-activity-preview', {
                                    detail: { userKey, progress: d.progress, reset: !!d.reset, streak: !!d.streak },
                                })
                            );
                        }
                    } catch {}
                    return;
                }
                if (msg.type === 'chatMessage' && msg.data) addMessage(msg.data);
                else if (msg.type === 'chat') addMessage(msg);
                else if (msg.type === 'init' && msg.data?.chatHistory) {
                    msg.data.chatHistory.forEach(m => addMessage(m));
                } else if (msg.type === 'batch' && Array.isArray(msg.messages)) {
                    msg.messages.forEach(m => addMessage(m));
                }
            } catch (e) {
                console.error('Error processing message:', e);
            }
        };

        ws.onclose = () => {
            debugLog('WebSocket closed, attempting to reconnect...');
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
            if (reconnectAttempts < maxReconnectAttempts) {
                setTimeout(() => {
                    reconnectAttempts++;
                    connectWebSocket();
                }, reconnectDelay);
            } else {
                console.error('Max reconnect attempts reached');
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    connectWebSocket();

    const CYBERPUNK_PALETTE = [
        { bg: 'rgba(17, 255, 121)', text: '#000', border: 'rgba(17, 255, 121, 0.9)' },
        { bg: 'rgba(255, 17, 121)', text: '#fff', border: 'rgba(255, 17, 121, 0.9)' },
        { bg: 'rgba(121, 17, 255)', text: '#fff', border: 'rgba(121, 17, 255, 0.9)' },
        { bg: 'rgba(17, 121, 255)', text: '#fff', border: 'rgba(36, 98, 165, 0.9)' },
        { bg: 'rgba(255, 231, 17)', text: '#000', border: 'rgba(255, 231, 17, 0.9)' },
        { bg: 'rgba(21, 25, 40)', text: '#fff', border: 'rgba(19, 19, 19, 0.9)' }
    ];

    const isOBSWidget = window.location.pathname.includes('/widgets/');
    let chatColors = {};
    let serverHasTheme = false;
    function getNonce() {
        try {
            const m = document.querySelector('meta[property="csp-nonce"]');
            return (m && (m.nonce || m.getAttribute('nonce'))) || document.head?.dataset?.cspNonce || '';
        } catch { return ''; }
    }
    function ensureStyleTag(id) {
        let tag = document.getElementById(id);
        if (!tag) {
            tag = document.createElement('style');
            tag.id = id;
            const n = getNonce();
            if (n) tag.setAttribute('nonce', n);
            document.head.appendChild(tag);
        } else {
            try {
                const n = getNonce();
                if (n && !tag.getAttribute('nonce')) tag.setAttribute('nonce', n);
            } catch {}
        }
        return tag;
    }
    function setCssVar(name, value) {
        try {
            const tag = ensureStyleTag('chat-theme-inline-vars');
            const current = tag.textContent || '';
            const re = new RegExp(`${name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*:\\s*[^;]+;?`, 'i');
            const decl = value ? `${name}: ${value};` : '';
                const base = /:root\s*\{[\s\S]*?\}/.test(current) ? current : ':root{}';
                const updated = base.replace(/:root\s*\{([\s\S]*?)\}/, (m, body) => {
                const body2 = re.test(body) ? body.replace(re, decl) : (decl ? (body + (body.trim()? ' ' : '') + decl) : body);
                return `:root{${body2}}`;
            });
            tag.textContent = updated;
        } catch {}
    }

    function updateDonationVars() {
        try {
            const themeStyleTag = document.getElementById('chat-theme-style');
            const anyThemeActive = serverHasTheme ||
                !!(themeStyleTag && typeof themeStyleTag.textContent === 'string' && themeStyleTag.textContent.trim().length > 0);
            if (anyThemeActive) return;
        } catch {}

        const DEFAULT_BG = '#131313';
        const DEFAULT_TEXT = '#ddb826';
        const customBg = (chatColors.donationBgColor || '').toLowerCase();
        const customText = (chatColors.donationColor || '').toLowerCase();
        setCssVar('--donation-bg', customBg && customBg !== DEFAULT_BG ? customBg : '');
        setCssVar('--donation-text', customText && customText !== DEFAULT_TEXT ? customText : '');
    }

    async function loadColors() {
        if (!isOBSWidget) return;
        try {
            const res = await fetch(`/api/modules?nocache=${Date.now()}${token ? `&token=${encodeURIComponent(token)}` : ''}`);
            const data = await res.json();
            if (data.chat) {
                chatColors = {
                    bgColor: data.chat.bgColor,
                    msgBgColor: data.chat.msgBgColor,
                    msgBgAltColor: data.chat.msgBgAltColor,
                    borderColor: data.chat.borderColor,
                    textColor: data.chat.textColor,
                    usernameColor: data.chat.usernameColor,
                    usernameBgColor: data.chat.usernameBgColor,
                    donationColor: data.chat.donationColor,
                    donationBgColor: data.chat.donationBgColor
                };
            }
    } catch { /* ignore */ }
    }

    function setIfCustomVar(varName, value, defaultValue) {
        try { setCssVar(varName, (value && value !== defaultValue) ? value : ''); } catch {}
    }

    function applyMessageThemeAdjustments() {
        if (!isOBSWidget) return;

        if (isHorizontal && isAutoScroll) {
            scheduleHorizontalScrollToEnd('auto');
        }

        const themeStyleTag = document.getElementById('chat-theme-style');
        const anyThemeActive = serverHasTheme ||
            !!(themeStyleTag && typeof themeStyleTag.textContent === 'string' && themeStyleTag.textContent.trim().length > 0);
        if (anyThemeActive) {
            return;
        }

        const isLightThemeActive = chatContainer?.classList.contains('theme-light');

        if (!isLightThemeActive) {
            setIfCustomVar('--bg-message', chatColors.msgBgColor, '#0a0e12');
            setIfCustomVar('--bg-message-alt', chatColors.msgBgAltColor, '#0d1114');
        }
        setIfCustomVar('--border', chatColors.borderColor, '#161b22');
        setIfCustomVar('--text', chatColors.textColor, '#e6edf3');

    }

    function buildDefaultGettyThemeCss() {
        const base = `:root { --bg-main: #080c10; --bg-message: #0a0e12; --bg-message-alt: #0a0e12; --text: #e6edf3; --username: #fff; --donation: #ddb826; --donation-bg: #ececec; }
	.message { background: #0a0e12 !important; border-radius: 4px; padding: 12px; margin-bottom: 6px; box-sizing: border-box; color: #fff !important; }
	.message.odd { background: #0a0e12 !important; }
	.message-username.cyberpunk { color: #fff; font-weight: 600; }
	.message-text-inline { color: #fff !important; font-weight: 600; }
	.message.has-donation { background: #ececec !important; }
	.message.has-donation .message-username { color: #111 !important; }
	.message.has-donation .message-text-inline { color: #111 !important; }
	.message-donation { background: #ddb826 !important; color: #111 !important; }`;

        const badgesVertical = CYBERPUNK_PALETTE
            .map(
                (p, i) =>
                    `\n#chat-container:not(.horizontal-chat) .message-username.cyberpunk.cp-${i + 1} { color: ${p.text} !important; background: ${p.bg} !important; text-shadow: 0 0 8px ${p.border} !important; }`
            )
            .join('');

        const badgesHorizontal = CYBERPUNK_PALETTE
            .map(
                (p, i) =>
                    `\n#chat-container.horizontal-chat .message-username.cyberpunk.cp-${i + 1} { color: ${p.text} !important; background: ${p.bg} !important; text-shadow: 0 0 8px ${p.border} !important; }`
            )
            .join('');

        return base + badgesVertical + badgesHorizontal;
    }
    const DEFAULT_GETTY_THEME_CSS = buildDefaultGettyThemeCss();
    const DEFAULT_GETTY_IS_LIGHT = false;
    function bootstrapDefaultThemeIfNeeded() {
        try {
            const local = (localStorage.getItem('chatLiveThemeCSS') || '').trim();
            if (local) return false;
            try { localStorage.setItem('chatLiveThemeCSS', DEFAULT_GETTY_THEME_CSS); } catch {}
        } catch {
            /* ignore */
        }
        applyChatTheme(DEFAULT_GETTY_THEME_CSS, DEFAULT_GETTY_IS_LIGHT);
        return true;
    }

    async function applyChatColors() {
        if (!isOBSWidget) return;
        await loadColors();

        const themeStyle = document.getElementById('chat-theme-style');
        const themeActive = !!(
            themeStyle &&
            typeof themeStyle.textContent === 'string' &&
            themeStyle.textContent.trim().length > 0
        );
        updateDonationVars();

        if (themeActive) {
            setCssVar('--chat-bg', '');
            return;
        }
        if (chatColors.bgColor === 'transparent') {
            setCssVar('--chat-bg', '');
        } else {
            setCssVar('--chat-bg', (chatColors.bgColor || '#0f1419'));
        }
    }

    bootstrapDefaultThemeIfNeeded();
    applyChatColors();

    function addMessage(msg) {
        const messageEl = document.createElement('div');
        messageEl.classList.add('message');
        const msgIndex = messageCount++;
        if (msgIndex % 2) messageEl.classList.add('odd');

        const userKey = String(
            (msg && (msg.userId || msg.channelName || msg.channelTitle))
                ? (msg.userId || msg.channelName || msg.channelTitle)
                : 'Anonymous'
        );
        const messageId = `${Date.now()}-${msgIndex}`;
        try {
            messageEl.dataset.userId = userKey;
            messageEl.dataset.messageId = messageId;
        } catch {}

        const header = document.createElement('div');
        header.className = 'message-header';

        const username = (msg.channelTitle || 'Anonymous');

        {
            const avatar = document.createElement('div');
            avatar.className = 'message-avatar';
            const img = document.createElement('img');
            const hasCustom = typeof msg.avatar === 'string' && msg.avatar.trim().length > 0;
            const initialSrc = hasCustom ? msg.avatar : DEFAULT_AVATAR_URL;
            img.src = initialSrc;
            img.alt = username;

            let bgIdxForThisMsg = 0;
            try {
                if (randomAvatarBgPerMessage) {
                    bgIdxForThisMsg = Math.floor(Math.random() * DEFAULT_AVATAR_BG_COLORS.length);
                } else {
                    bgIdxForThisMsg = Math.abs(username.split('').reduce((a, c) => c.charCodeAt(0) + ((a << 5) - a), 0)) % DEFAULT_AVATAR_BG_COLORS.length;
                }
            } catch { bgIdxForThisMsg = 0; }

            if (!hasCustom) {
                try { avatar.classList.add(`avatar-bg-${bgIdxForThisMsg}`); } catch {}
            }

            img.onerror = () => {
                if (img.src !== DEFAULT_AVATAR_URL) {
                    img.onerror = null;
                    img.src = DEFAULT_AVATAR_URL;
                    try { avatar.classList.add(`avatar-bg-${bgIdxForThisMsg}`); } catch {}
                } else {
                    img.classList.add('avatar-img-hidden');
                    try { avatar.classList.add(`avatar-bg-${bgIdxForThisMsg}`); } catch {}
                }
            };
            avatar.appendChild(img);
            header.appendChild(avatar);
        }

        const userContainer = document.createElement('div');
        userContainer.className = 'message-user-container';
    const displayUsername = username.length > 17 ? username.slice(0, 17) : username;

        const usernameElement = document.createElement('span');
        usernameElement.className = 'message-username cyberpunk';
    usernameElement.textContent = displayUsername;

        const membershipIcons = [
            'crown', 'star', 'hamburger', 'heart', 'tongue',
            'astro', 'laugh', 'lemon', 'serious', 'cool', 'fire',
            'rocket', 'creamy', 'unicorn', 'pizza', 'whale'
        ];
        let hash = 0;
        for (let i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + ((hash << 5) - hash);
        }
        const iconIndex = Math.abs(hash) % membershipIcons.length;
        const iconType = membershipIcons[iconIndex];
        const iconElement = document.createElement('span');
        iconElement.className = `membership-icon ${iconType}`;
        usernameElement.insertBefore(iconElement, usernameElement.firstChild);

        const cpIndex = Math.abs(hash) % CYBERPUNK_PALETTE.length;
        usernameElement.classList.add(`cp-${cpIndex + 1}`);
        userContainer.appendChild(usernameElement);

        const cleanMessage = (msg.message || '').replace(/&lt;stkr&gt;(.*?)&lt;\/stkr&gt;/g, '<stkr>$1</stkr>');
        const hasSticker = /<stkr>/.test(cleanMessage);
        const normalText = cleanMessage.replace(/<stkr>.*?<\/stkr>/g, '').trim();

        if (msg.credits > 0) {
            const isDonationOnly = !normalText.length && !hasSticker && !/:([^\s:]+):/.test(cleanMessage);
            messageEl.classList.add('has-donation');
            
            if (isDonationOnly) {
                messageEl.classList.add('donation-only');
            }
        }

        if (normalText.length > 0 || (!normalText.length && (hasSticker || /:[^\s:]+:/.test(cleanMessage)))) {
            const textElement = document.createElement('span');
            textElement.className = msg.credits > 0 ? 'message-text-inline has-donation' : 'message-text-inline';
            textElement.innerHTML = formatText(normalText.length > 0 ? normalText : cleanMessage);
            userContainer.appendChild(textElement);

            if (ttsEnabled && ttsAllChat && (normalText || cleanMessage)) {
                speakMessage(normalText || cleanMessage);
            }
        }

        header.appendChild(userContainer);

        if (msg.credits > 0) {
            const donation = document.createElement('span');
            donation.className = 'message-donation highlight';
            donation.textContent = `$${msg.credits} USD`;
            header.appendChild(donation);

            const confettiContainer = document.createElement('div');
            confettiContainer.className = 'confetti-container';

            for (let i = 0; i < 200; i++) {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                const posClass = `pos-${Math.floor(Math.random()*20)}`; confetti.classList.add(posClass);
                const sizeBucket = Math.floor(Math.random()*5); confetti.classList.add(`size-${sizeBucket}`);
                const colorIdx = Math.floor(Math.random()*6); confetti.classList.add(`color-${colorIdx}`);
                const durBucket = Math.floor(Math.random()*9); confetti.classList.add(`dur-${durBucket}`);
                const delayBucket = Math.floor(Math.random()*11); confetti.classList.add(`delay-${delayBucket}`);
                if (Math.random() > 0.5) confetti.classList.add('round');
                confettiContainer.appendChild(confetti);
            }
            messageEl.appendChild(confettiContainer);
            setTimeout(() => {
                donation.classList.remove('highlight');
                confettiContainer.classList.add('fade-out');
                setTimeout(() => confettiContainer.remove(), 1000);
            }, 20000);
        }

        messageEl.appendChild(header);

        try {
            const slot = document.createElement('div');
            slot.className = 'chat-activity-slot';
            slot.id = `chat-activity-slot-${messageId}`;
            slot.setAttribute('aria-hidden', 'true');
            messageEl.appendChild(slot);
        } catch {}

        if (hasSticker) {
            const stickerContainer = document.createElement('div');
            stickerContainer.className = 'message-sticker-container';
            const stickersOnly = cleanMessage.match(/<stkr>.*?<\/stkr>/g)?.join('') || '';
            stickerContainer.innerHTML = formatText(stickersOnly);
            messageEl.appendChild(stickerContainer);
        }

        const isDashboard = /index\.html$|\/$/.test(window.location.pathname);
        if (isDashboard) {
            chatContainer.insertBefore(messageEl, chatContainer.firstChild);
            if (isAutoScroll && !isHorizontal) chatContainer.scrollTop = 0;
        } else {
            chatContainer.appendChild(messageEl);
            if (isAutoScroll && !isHorizontal) chatContainer.scrollTop = chatContainer.scrollHeight;
        }

        try {
            window.dispatchEvent(
                new CustomEvent('getty:chat-message-added', {
                    detail: { userKey, messageId, username, at: Date.now() },
                })
            );
        } catch {}

        if (isHorizontal && isAutoScroll) {
            scheduleHorizontalScrollToEnd('smooth');
        }

        const themeStyle = document.getElementById('chat-theme-style');
        const isMinimalista = themeStyle && typeof themeStyle.textContent === 'string' && themeStyle.textContent.includes('THEME_ID:MINIMALISTA_AUTO10S');

        if (isMinimalista) {
            messageEl.addEventListener('animationend', (e) => {
                if (e && e.animationName === 'fadeOut') {
                    if (messageEl.parentNode) messageEl.parentNode.removeChild(messageEl);
                }
            });

            if (isHorizontal) {
                setTimeout(() => {
                    if (messageEl.parentNode) messageEl.parentNode.removeChild(messageEl);
                }, 10200);
            }

            setTimeout(() => {
                if (!messageEl.isConnected) return;
                const animName = getComputedStyle(messageEl).animationName || '';
                if (isHorizontal || (typeof animName === 'string' && animName.toLowerCase().includes('fadeout'))) {
                    if (messageEl.parentNode) messageEl.parentNode.removeChild(messageEl);
                }
            }, 11000);
        }

        applyMessageThemeAdjustments();
    }

    window.addMessage = addMessage;

    function formatText(text) {
        if (!text) return '';
        let formatted = escapeHtml(text);

        formatted = formatted.replace(/<stkr>(.*?)<\/stkr>/g, (match, url) => {
            try {
                const decodedUrl = decodeURIComponent(url);
                if (decodedUrl.match(/^https?:\/\//i)) {
                    return `<img src="${decodedUrl}" alt="Sticker" class="comment-sticker" loading="lazy" />`;
                }
                return match;
            } catch {
                return match;
            }
        });

        if (Object.keys(EMOJI_MAPPING).length > 0) {
            for (const [code, url] of Object.entries(EMOJI_MAPPING)) {
                const isSticker = url.includes('/stickers/');
                const className = isSticker ? 'comment-sticker' : 'comment-emoji';
                const escapedCode = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                formatted = formatted.replace(
                    new RegExp(escapedCode, 'g'),
                    `<img src="${url}" alt="${code}" class="${className}" loading="lazy" />`
                );
            }
        }
        return formatted;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML
            .replace(/&lt;stkr&gt;/g, '<stkr>')
            .replace(/&lt;\/stkr&gt;/g, '</stkr>');
    }

    chatContainer.addEventListener('scroll', () => {
        if (isHorizontal) {
            isAutoScroll = (chatContainer.scrollWidth - chatContainer.scrollLeft) <= (chatContainer.clientWidth + 2);
        } else {
            isAutoScroll = (chatContainer.scrollHeight - chatContainer.scrollTop) <= (chatContainer.clientHeight + 2);
        }
    });

    if (isHorizontal) {
        chatContainer.classList.add('horizontal-chat');
        if (isAutoScroll) scheduleHorizontalScrollToEnd('auto');
    }

    function applyChatTheme(themeCSS, isLightTheme) {
        const styleTag = ensureStyleTag('chat-theme-style');

        styleTag.textContent = themeCSS;
        if (chatContainer) {
            chatContainer.classList.add('theme-active');
            chatContainer.classList.remove('chat-default');
            if (isLightTheme) {
                chatContainer.classList.add('theme-light');
            } else {
                chatContainer.classList.remove('theme-light');
            }
        }
    }

    let lastThemeCSS = '';
    async function fetchAndApplyTheme() {
        try {
            const res = await fetch(`/api/chat-config?nocache=${Date.now()}${token ? `&token=${encodeURIComponent(token)}` : ''}`);
            const config = await res.json();
            const serverCSS = (config.themeCSS || '').trim();
            let isLightTheme =
                !!serverCSS &&
                (serverCSS.includes('--text: #1f2328') || serverCSS.includes('--text: #111'));

            serverHasTheme = !!serverCSS;

            if (serverHasTheme) {
                await loadColors();
                const hasExplicitUserColors = !!(chatColors.usernameColor || chatColors.usernameBgColor);

                const donationOverrideCss = '';
                const extraCss = hasExplicitUserColors
                    ? `\n.message-username.cyberpunk { color: ${chatColors.usernameColor || '#ffffff'} !important; background: ${chatColors.usernameBgColor || '#11ff79'} !important; }`
                    : CYBERPUNK_PALETTE
                        .map(
                            (p, i) =>
                                `\n.message-username.cyberpunk.cp-${i + 1} { color: ${p.text} !important; background: ${p.bg} !important; text-shadow: 0 0 8px ${p.border} !important; }`
                        )
                        .join('');

                const finalCss = serverCSS + extraCss + (donationOverrideCss ? `\n${donationOverrideCss}` : '');
                if (finalCss !== lastThemeCSS) {
                    lastThemeCSS = finalCss;
                    applyChatTheme(finalCss, isLightTheme);
                }

                try {
                    const localAuto = (localStorage.getItem('chatLiveThemeCSS') || '').match(
                        /\/\* AUTO_FONT_SIZES_START \*\/[\s\S]*?\/\* AUTO_FONT_SIZES_END \*\//
                    );
                    if (localAuto && !/AUTO_FONT_SIZES_START/.test(finalCss)) {
                        const merged = finalCss + '\n' + localAuto[0];
                        if (merged !== lastThemeCSS) {
                            lastThemeCSS = merged;
                            applyChatTheme(merged, isLightTheme);
                        }
                    }
                } catch {}

                updateDonationVars();
                return;
            }

            const local = (localStorage.getItem('chatLiveThemeCSS') || '').trim();
            const themeStyleTag = document.getElementById('chat-theme-style');
            const styleEmpty = !themeStyleTag || !(themeStyleTag.textContent || '').trim();

            if (local) {
                const sizeBlockMatch = local.match(
                    /\/\* AUTO_FONT_SIZES_START \*\/[\s\S]*?\/\* AUTO_FONT_SIZES_END \*\//
                );
                let combined = local;
                if (!sizeBlockMatch) {
                    const existing = (lastThemeCSS || '').match(
                        /\/\* AUTO_FONT_SIZES_START \*\/[\s\S]*?\/\* AUTO_FONT_SIZES_END \*\//
                    );
                    if (existing) combined += '\n' + existing[0];
                }

                isLightTheme = combined.includes('--text: #1f2328') || combined.includes('--text: #111');
                if (combined !== lastThemeCSS || styleEmpty) {
                    lastThemeCSS = combined;
                    applyChatTheme(combined, isLightTheme);
                }
                updateDonationVars();
                return;
            }

            try { localStorage.setItem('chatLiveThemeCSS', DEFAULT_GETTY_THEME_CSS); } catch {}
            if (DEFAULT_GETTY_THEME_CSS !== lastThemeCSS || styleEmpty) {
                lastThemeCSS = DEFAULT_GETTY_THEME_CSS;
                applyChatTheme(DEFAULT_GETTY_THEME_CSS, DEFAULT_GETTY_IS_LIGHT);
            }
            updateDonationVars();
        } catch {
            /* ignore */
        }
    }

    fetchAndApplyTheme();
    setInterval(fetchAndApplyTheme, 15000);

    try {
        const initialVars = (localStorage.getItem('chatLiveThemeVars') || '').trim();
        if (initialVars) {
            let tag = ensureStyleTag('chat-theme-size-vars');
            tag.textContent = /}\s*$/.test(initialVars) ? initialVars : (initialVars + '}');
        }
    } catch {/* ignore */}

    window.addEventListener('storage', function(e) {
        if (e.key !== 'chatLiveThemeCSS') return;
        if (serverHasTheme) return;
        const local = (e.newValue || '').trim();
        if (!local) return;

    const sizeBlockMatch = local.match(/\/\* AUTO_FONT_SIZES_START \*\/[\s\S]*?\/\* AUTO_FONT_SIZES_END \*\//);
        let finalCss = local;
        if (!sizeBlockMatch) {
            const existing = (lastThemeCSS || '').match(/\/\* AUTO_FONT_SIZES_START \*\/[\s\S]*?\/\* AUTO_FONT_SIZES_END \*\//);
            if (existing) finalCss += '\n' + existing[0];
        }
        const themeStyleTag = document.getElementById('chat-theme-style');
        const styleEmpty = !themeStyleTag || !(themeStyleTag.textContent || '').trim();
        if (finalCss !== lastThemeCSS || styleEmpty) {
            lastThemeCSS = finalCss;
            const isLight = finalCss.includes('--text: #1f2328') || finalCss.includes('--text: #111');
            applyChatTheme(finalCss, isLight);
        }
    });

    window.addEventListener('storage', function(e) {
        if (e.key !== 'chatLiveThemeVars') return;
        if (serverHasTheme) return;
        const vars = (e.newValue || '').trim();
        if (!vars) return;
    let tag = ensureStyleTag('chat-theme-size-vars');
        tag.textContent = /}\s*$/.test(vars) ? vars : (vars + '}');
    });

    function showStreakNotification(userKey, userName) {
        try {
            const audio = new Audio('https://7uajfnf5p4jmr6upjjpido2x7nzwnkuehwm43wjio3g23j24tgxa.arweave.net/_QCStL1_Esj6j0pegbtX-3NmqoQ9mc3ZKHbNradcma4');
            audio.volume = 1;
            audio.play().catch(() => {});
        } catch {}

        const messageEl = document.createElement('div');
        messageEl.classList.add('message', 'streak-notification');
        
        const content = document.createElement('div');
        content.className = 'streak-content';
        
        const icon = document.createElement('div');
        icon.className = 'streak-icon';
        
        const flameDiv = document.createElement('div');
        flameDiv.className = 'chat-activity-flame blue';
        flameDiv.style.setProperty('--intensity', '1');
        
        flameDiv.innerHTML = `
                <svg class="chat-activity-flame__svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
                    <defs>
                        <linearGradient id="__gettyFlameGradBlue" x1="0" y1="1" x2="0" y2="0">
                            <stop offset="0%" stop-color="rgba(0, 80, 255, 1)" />
                            <stop offset="55%" stop-color="rgba(0, 140, 255, 1)" />
                            <stop offset="100%" stop-color="rgba(150, 200, 255, 1)" />
                        </linearGradient>
                    </defs>
                    <path class="chat-activity-flame__outer" fill="url(#__gettyFlameGradBlue)" d="M33 2c2 10-3 15-7 20-5 6-7 10-6 16 1 9 9 17 18 17 10 0 18-8 18-18 0-11-8-17-12-25-2-4-4-7-3-10-4 2-6 6-8 10z" />
                    <path class="chat-activity-flame__inner" fill="rgba(255,255,255,0.9)" d="M33 20c1 6-2 9-4 12-3 3-4 6-3 9 1 5 5 9 10 9 6 0 10-4 10-10 0-6-4-9-7-13-1-2-2-4-2-7-2 1-3 3-4 5z" />
                </svg>`;
        
        icon.appendChild(flameDiv);
        
        const text = document.createElement('div');
        text.className = 'streak-text';
        text.innerHTML = `<strong>${userName || userKey}</strong> has reached the chat message streak and is on fire! Congratulations! 🎉`;
        
        content.appendChild(icon);
        content.appendChild(text);
        messageEl.appendChild(content);
        
        const chatContainer = document.getElementById('chat-container');
        if (chatContainer) {
             const isDashboard = /index\.html$|\/$/.test(window.location.pathname);
             if (isDashboard) {
                chatContainer.insertBefore(messageEl, chatContainer.firstChild);
             } else {
                chatContainer.appendChild(messageEl);
                if (isHorizontal) {
                    scheduleHorizontalScrollToEnd('smooth');
                } else {
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                }
             }
        }
    }

    window.addEventListener('getty:chat-streak-reached', (e) => {
        const { userKey, username } = e.detail || {};
        if (userKey) {
            showStreakNotification(userKey, username);
        }
    });
});
