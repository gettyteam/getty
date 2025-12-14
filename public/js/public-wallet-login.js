(function ensureWalletLoginCss() {
  try {
    if (!document.querySelector('link[data-wallet-login-css]')) {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = '/css/wallet-login.css';
      l.setAttribute('data-wallet-login-css', '1');
      document.head.appendChild(l);
    }
  } catch {}
})();

class WanderWalletLogin {
  constructor() {
    this.isConnected = false;
    this.arweaveAddress = null;
    this.session = null;
    this.lastBalance = null;
    this.balanceFetchInFlight = false;
    this.balanceLastFetchTs = 0;
    this.widgetToken = null;

    const ArweaveLib = typeof globalThis !== 'undefined' ? globalThis.Arweave : undefined;
    this.arweave = ArweaveLib
      ? ArweaveLib.init({ host: 'arweave.net', port: 443, protocol: 'https' })
      : this.createArweaveShim();
    this.ui = { installBanner: null };
    this.elements = {
      loginBtn: null,
      logoutBtn: null,
      userInfo: null,
      addressEl: null,
      balanceEl: null,
      statusDot: null,
      btnLabel: null,
    };
    this.btnLabelMeta = null;

    this.locale = this.detectLocale();
    this.messages = this.loadSharedMessages(this.locale);
    this.t = (k) => {
      if (this.messages && this.messages[k]) return this.messages[k];

      try {
        if (window.__i18n && typeof window.__i18n.t === 'function') {
          const v = window.__i18n.t(k);
          if (v && v !== k) return v;
        }
      } catch {}

      try {
        const globalStore = window.__i18n && window.__i18n[this.locale];
        if (globalStore && globalStore[k]) return globalStore[k];
      } catch {}

      return k;
    };

    try {
      if (window.__i18n && typeof window.__i18n.setLanguage === 'function') {
        window.__i18n.setLanguage(this.locale);
      }
    } catch {}

    this.pendingLandingStatusMessage = null;
    this.pendingReconnectState = null;
    this.landingReady = false;
    this.landingReadyListenerAttached = false;
    this.lastReconnectReason = '';

    this.__loginChooserEl = null;
    this.__loginChooserMode = null;

    this.init();
  }

  persistWidgetToken(widgetToken, expiresAt) {
    if (!widgetToken) return;
    this.widgetToken = widgetToken;
    if (!this.session) this.session = {};
    this.session.widgetToken = widgetToken;
    try {
      localStorage.setItem('getty_widget_token', widgetToken);
    } catch {}
    try {
      let expiresAtDate = null;
      if (expiresAt) {
        try {
          const parsed = new Date(expiresAt);
          if (Number.isFinite(parsed.getTime())) expiresAtDate = parsed;
        } catch {}
      }
      const expiry = (
        expiresAtDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      ).toUTCString();
      const secure = location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `getty_widget_token=${encodeURIComponent(widgetToken)}; expires=${expiry}; Path=/; SameSite=Lax${secure}`;
    } catch {}
  }

  clearWidgetToken() {
    this.widgetToken = null;
    if (this.session) {
      try {
        delete this.session.widgetToken;
      } catch {}
    }
    try {
      localStorage.removeItem('getty_widget_token');
    } catch {}
    try {
      const secure = location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `getty_widget_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; SameSite=Lax${secure}`;
    } catch {}
  }

  readPersistedWidgetToken() {
    try {
      const match =
        window.location.pathname &&
        window.location.pathname.match(/\/user\/([A-Za-z0-9_-]{12,120})/);
      if (match && match[1]) return match[1];
    } catch {}
    try {
      const stored = localStorage.getItem('getty_widget_token');
      if (stored) return stored;
    } catch {}
    try {
      const cookieMatch = document.cookie.match(/(?:^|;)\s*getty_widget_token=([^;]+)/);
      if (cookieMatch && cookieMatch[1]) return decodeURIComponent(cookieMatch[1]);
    } catch {}
    return null;
  }

  getWidgetToken() {
    if (this.session && this.session.widgetToken) return this.session.widgetToken;
    if (this.widgetToken) return this.widgetToken;
    const persisted = this.readPersistedWidgetToken();
    if (persisted) this.widgetToken = persisted;
    return persisted;
  }

  init() {
    this.elements.loginBtn =
      document.getElementById('public-wallet-login') || document.getElementById('wanderLoginBtn');
    this.elements.logoutBtn = document.getElementById('logoutBtn');
    this.elements.userInfo = document.getElementById('userInfo');
    this.elements.addressEl = document.getElementById('arweaveAddress');
    this.elements.balanceEl = document.getElementById('arweaveBalance');
    this.elements.inlineBalance = document.getElementById('login-balance');
    this.elements.openAdmin = document.getElementById('open-admin');
    this.elements.logoutInline = document.getElementById('logout-inline');
    this.elements.langInline = document.getElementById('language-selector-inline');
    this.elements.langBtn = document.getElementById('lang-btn');
    this.elements.langMenu = document.getElementById('lang-menu');
    this.elements.langBtnLabel = document.getElementById('lang-btn-label');
    this.elements.statusDot = document.querySelector('.connection-status .status-dot');
    this.elements.btnLabel = this.elements.loginBtn
      ? this.elements.loginBtn.querySelector('.btn-label')
      : null;
    if (this.elements.btnLabel && !this.btnLabelMeta) {
      this.btnLabelMeta = {
        i18n: this.elements.btnLabel.getAttribute('data-i18n') || null,
        defaultLabel: this.elements.btnLabel.getAttribute('data-default-label') || null,
        fallbackText: this.elements.btnLabel.textContent || '',
      };
    }
    this.safeAttach(this.elements.loginBtn, 'click', () => void this.handleLoginClick().catch(() => {}));
    this.safeAttach(this.elements.logoutBtn, 'click', () => this.logout());
    this.safeAttach(this.elements.logoutInline, 'click', () => this.logout());
    this.safeAttach(this.elements.openAdmin, 'click', () => {
      try {
        window.open('/admin/', '_self');
      } catch {
        window.location.href = '/admin/';
      }
    });

    this.setupLangMenuBridge();

    this.handleReasonParam();

    if (this.elements.langBtn && this.elements.langBtn.classList.contains('hidden')) {
      const origFn = this.updateUI.bind(this);
      this.updateUI = async (...args) => {
        const res = await origFn(...args);
        try {
          if (this.elements.langBtn.dataset.visible === 'true') {
            this.elements.langBtn.classList.add('flex');
          }
        } catch {}
        return res;
      };
    }

    this.bootstrapSession();
    this.startWalletInjectionWatcher();
    this.ensureInstallBanner();

    try {
      const storedLang = (localStorage.getItem('lang') || this.locale || 'en').toLowerCase();
      if (this.elements.langBtnLabel) {
        this.elements.langBtnLabel.textContent = storedLang.toUpperCase();
      }
    } catch {}

    try {
      window.addEventListener('storage', (e) => {
        if (e && e.key === 'getty_logout') {
          this.isConnected = false;
          this.arweaveAddress = null;
          this.session = null;
          localStorage.removeItem('wanderWalletConnected');
          localStorage.removeItem('arweaveAddress');

          setTimeout(() => {
            window.location.href = '/';
          }, 100);
        }
      });
    } catch {}

    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('logout') === 'true') {
        this.isConnected = false;
        this.arweaveAddress = null;
        this.session = null;
        localStorage.removeItem('wanderWalletConnected');
        localStorage.removeItem('arweaveAddress');

        const newUrl = window.location.pathname + (window.location.hash || '');
        window.history.replaceState({}, document.title, newUrl);
        window.location.href = '/';
      }
    } catch (e) {
      console.warn('[wander-login] failed to check logout URL parameter', e);
    }
  }

  setupLangMenuBridge() {
    const { langBtn, langMenu, langBtnLabel } = this.elements;
    if (!langBtn) return;

    const revealButton = () => {
      try {
        langBtn.classList.remove('hidden');
        langBtn.dataset.visible = 'true';
        if (!langBtn.classList.contains('flex') && !langBtn.classList.contains('inline-flex')) {
          langBtn.classList.add('flex');
        }
      } catch {}
    };

    const updateLabel = (lang) => {
      if (!langBtnLabel || !lang) return;
      try {
        langBtnLabel.textContent = lang.toUpperCase();
      } catch {}
    };

    if (!langMenu) {
      revealButton();
      return;
    }

    const bindLegacyMenu = () => {
      if (!langMenu) return;
      // Skip legacy binding if another owner already marked it as bound
      if (langBtn.dataset.langMenuBound === 'true' || langMenu.dataset.langMenuBound === 'true')
        return;
      if (langBtn.dataset.langMenuBridge === 'legacy') return;
      langBtn.dataset.langMenuBridge = 'legacy';
      langBtn.dataset.langMenuBound = 'true';
      langMenu.dataset.langMenuBound = 'true';
      revealButton();

      this.safeAttach(langBtn, 'click', (e) => {
        e.preventDefault();
        const isHidden = langMenu.classList.contains('hidden');
        if (isHidden) {
          langMenu.classList.remove('hidden');
          langBtn.setAttribute('aria-expanded', 'true');
          const closer = (ev) => {
            if (!langMenu.contains(ev.target) && ev.target !== langBtn) {
              langMenu.classList.add('hidden');
              langBtn.setAttribute('aria-expanded', 'false');
              window.removeEventListener('click', closer);
            }
          };
          setTimeout(() => window.addEventListener('click', closer), 0);
        } else {
          langMenu.classList.add('hidden');
          langBtn.setAttribute('aria-expanded', 'false');
        }
      });

      langMenu.querySelectorAll('[data-lang]').forEach((btn) => {
        this.safeAttach(btn, 'click', () => {
          const lang = btn.getAttribute('data-lang');
          if (!lang) return;
          try {
            localStorage.setItem('lang', lang);
            localStorage.setItem('admin_locale', lang);
          } catch {}
          updateLabel(lang);
          window.location.reload();
        });
      });
    };

    const applyController = (controller) => {
      if (!controller) {
        bindLegacyMenu();
        return;
      }

      revealButton();
      try {
        controller.refresh?.();
      } catch {}

      const currentLang =
        typeof controller.getCurrentLanguage === 'function'
          ? controller.getCurrentLanguage()
          : null;
      if (currentLang) updateLabel(currentLang);

      langBtn.dataset.langMenuBound = 'true';
      if (langMenu) langMenu.dataset.langMenuBound = 'true';
    };

    const handleReady = (event) => {
      applyController(event?.detail || window.__gettyLangMenu);
    };

    const changeListener = (event) => {
      const lang = event?.detail?.language;
      if (lang) updateLabel(lang);
    };

    window.addEventListener('getty:lang-menu-change', changeListener);

    if (window.__gettyLangMenu) {
      applyController(window.__gettyLangMenu);
      return;
    }

    window.addEventListener('getty:lang-menu-ready', handleReady, { once: true });

    setTimeout(() => {
      if (!window.__gettyLangMenu) {
        bindLegacyMenu();
      }
    }, 1500);
  }

  handleReasonParam() {
    try {
      const params = new URLSearchParams(window.location.search);
      const reason = params.get('reason');
      if (!reason) return;
      if (
        reason !== 'expired-token' &&
        reason !== 'invalid-token' &&
        reason !== 'odysee_verified' &&
        reason !== 'wallet_address_required'
      )
        return;

      if (reason === 'odysee_verified') {
        try {
          this.maybeToast(this.t('publicAuth.odyseeVerified') || 'Email verified. Finishing sign-in…', 'ok');
        } catch {}

        params.delete('reason');
        const nextUrl =
          window.location.pathname +
          (params.toString() ? `?${params.toString()}` : '') +
          (window.location.hash || '');
        window.history.replaceState({}, document.title, nextUrl);
        return;
      }

      if (reason === 'wallet_address_required') {
        const walletAddress = params.get('walletAddress') || '';

        params.delete('reason');
        params.delete('walletAddress');
        const nextUrl =
          window.location.pathname +
          (params.toString() ? `?${params.toString()}` : '') +
          (window.location.hash || '');
        window.history.replaceState({}, document.title, nextUrl);

        setTimeout(() => {
          try {
            this.showLoginChooser();
            const root = this.__loginChooserEl;
            if (!root) return;
            this.__setChooserStep(root, 'odysee');

            const walletEl = root.querySelector('[data-field="walletAddress"]');
            if (walletEl && walletAddress) {
              try {
                walletEl.value = walletAddress;
              } catch {}
            }

            const errBox = root.querySelector('[data-role="error"]');
            if (errBox) {
              const msg =
                this.t('publicAuth.walletAddressRequired') ||
                'Please enter your Arweave wallet address to complete sign-in.';
              errBox.textContent = msg;
              errBox.classList.remove('hidden');
            }

            const emailEl = root.querySelector('[data-field="email"]');
            try {
              (walletEl || emailEl)?.focus?.();
            } catch {}
          } catch {}
        }, 0);
        return;
      }

      const message = this.resolveLandingReconnectMessage(reason);

      this.resetSessionState({ broadcast: false, showReconnect: true, reason, message });

      params.delete('reason');
      const nextUrl =
        window.location.pathname +
        (params.toString() ? `?${params.toString()}` : '') +
        (window.location.hash || '');
      window.history.replaceState({}, document.title, nextUrl);
    } catch (error) {
      try {
        console.warn('[wander-login] failed to handle reason param', error?.message || error);
      } catch {}
    }
  }

  resolveLandingReconnectMessage(reason) {
    const isInvalid = reason === 'invalid-token';
    const key = isInvalid ? 'welcomeTokenInvalid' : 'welcomeTokenExpired';
    const fallback = isInvalid
      ? 'We could not open your dashboard. Please log in again.'
      : 'Session expired. Please log in again to refresh your dashboard link.';
    return this.translateLanding(key, fallback);
  }

  shouldOfferReconnect() {
    if (this.isConnected) return true;
    if (this.widgetToken) return true;
    try {
      if (localStorage.getItem('wanderWalletConnected') === 'true') return true;
    } catch {}
    try {
      const stored = this.readPersistedWidgetToken();
      return Boolean(stored);
    } catch {}
    return false;
  }

  translateLanding(key, fallback) {
    try {
      if (window.__i18n && typeof window.__i18n.t === 'function') {
        const value = window.__i18n.t(key);
        if (value && value !== key) return value;
      }
    } catch {}
    return fallback !== undefined ? fallback : key;
  }

  ensureLandingReadyListener() {
    if (this.landingReadyListenerAttached) return;
    this.landingReadyListenerAttached = true;

    const onReady = () => {
      this.landingReady = true;
      this.flushLandingReadyQueue();
    };

    window.addEventListener('getty-landing-vue-ready', onReady, { once: true });

    if (!window.__GETTY_LANDING_VUE_READY__) {
      window.__GETTY_LANDING_VUE_READY__ = () => {
        try {
          onReady();
        } catch {}
      };
    } else {
      const prev = window.__GETTY_LANDING_VUE_READY__;
      window.__GETTY_LANDING_VUE_READY__ = (...args) => {
        try {
          prev(...args);
        } catch {}
        try {
          onReady();
        } catch {}
      };
    }
  }

  flushLandingReadyQueue() {
    if (this.pendingLandingStatusMessage) {
      const msg = this.pendingLandingStatusMessage;
      this.pendingLandingStatusMessage = null;
      this.showLandingStatusMessage(msg);
    }
    if (this.pendingReconnectState) {
      const state = { ...this.pendingReconnectState };
      this.pendingReconnectState = null;
      this.exposeReconnectState(state.reason);
    }
  }

  showLandingStatusMessage(message) {
    if (!message) return;
    const statusEl = document.getElementById('landing-session-status');
    if (!statusEl) {
      this.pendingLandingStatusMessage = message;
      this.ensureLandingReadyListener();
      return;
    }
    statusEl.textContent = message;
    statusEl.classList.remove('hidden');
    statusEl.dataset.visible = 'true';
    try {
      statusEl.setAttribute('role', 'alert');
    } catch {}
  }

  exposeReconnectState(reason) {
    const heroBtn = document.getElementById('public-wallet-login-hero');
    if (!heroBtn) {
      this.pendingReconnectState = { reason: reason || '' };
      this.ensureLandingReadyListener();
    }
    if (heroBtn) {
      const label = this.translateLanding('welcomeLogin', this.t('loginLabel'));
      heroBtn.textContent = label;
      heroBtn.setAttribute('aria-label', label);
      heroBtn.setAttribute('data-i18n', 'welcomeLogin');
      heroBtn.setAttribute('data-default-label', label);
      heroBtn.dataset.state = 'reconnect';
      heroBtn.setAttribute('data-reason', reason || '');
    }

    if (this.elements.loginBtn) {
      this.elements.loginBtn.dataset.state = 'logged-out';
    }

    if (this.elements.statusDot) {
      this.elements.statusDot.classList.remove('connected');
      this.elements.statusDot.classList.add('disconnected');
    }
  }

  safeAttach(el, ev, fn) {
    if (el)
      try {
        el.addEventListener(ev, fn);
      } catch {}
  }

  createArweaveShim() {
    const WINSTON_PER_AR = 1e12;
    return {
      wallets: {
        getBalance: function (address) {
          if (!address) return Promise.resolve('0');
          try {
            return fetch('https://arweave.net/wallet/' + address + '/balance', {
              cache: 'no-store',
            })
              .then(function (r) {
                if (!r || !r.ok) return '0';
                return r.text();
              })
              .catch(function () {
                return '0';
              });
          } catch {
            return Promise.resolve('0');
          }
        },
      },
      ar: {
        winstonToAr(winston) {
          try {
            const n = parseFloat(winston || '0');
            if (!isFinite(n)) return '0';
            return (n / WINSTON_PER_AR).toString();
          } catch {
            return '0';
          }
        },
      },
    };
  }

  async bootstrapSession() {
    let allowLegacyFallback = false;
    try {
      const meResponse = await this.fetchMe();
      if (meResponse && meResponse.status === 200 && meResponse.data && meResponse.data.address) {
        const me = { ...meResponse.data };
        const storedToken = this.readPersistedWidgetToken();
        if (storedToken) {
          this.widgetToken = storedToken;
          me.widgetToken = me.widgetToken || storedToken;
        }
        this.session = me;
        this.arweaveAddress = me.address;
        this.isConnected = true;

        const activeWidgetToken = this.getWidgetToken();
        if (!activeWidgetToken) {
          const reason =
            this.lastReconnectReason === 'invalid-token' ? 'invalid-token' : 'expired-token';
          const message = this.resolveLandingReconnectMessage(reason);
          this.resetSessionState({
            broadcast: false,
            showReconnect: true,
            reason,
            message,
          });
          return;
        }

        this.lastReconnectReason = '';

        await this.updateUI();

        this.scheduleBalanceFetch();
        return;
      }

      if (meResponse && meResponse.status === 404) {
        allowLegacyFallback = true;
      } else if (meResponse && meResponse.status === 401) {
        const offerReconnect = this.shouldOfferReconnect();
        this.resetSessionState({
          broadcast: false,
          showReconnect: offerReconnect,
          reason: offerReconnect ? 'expired-token' : '',
          message: offerReconnect ? this.resolveLandingReconnectMessage('expired-token') : '',
        });
        return;
      } else {
        const offerReconnect = this.shouldOfferReconnect();
        this.resetSessionState({
          broadcast: false,
          showReconnect: offerReconnect,
          reason: offerReconnect ? 'expired-token' : '',
          message: offerReconnect ? this.resolveLandingReconnectMessage('expired-token') : '',
        });
        return;
      }
    } catch (error) {
      console.warn(
        '[wander-login] failed to bootstrap session, forcing reconnect',
        error?.message || error
      );
      const offerReconnect = this.shouldOfferReconnect();
      this.resetSessionState({
        broadcast: false,
        showReconnect: offerReconnect,
        reason: offerReconnect ? 'expired-token' : '',
        message: offerReconnect ? this.resolveLandingReconnectMessage('expired-token') : '',
      });
      return;
    }

    if (allowLegacyFallback) {
      this.checkLegacyLocalSession();
    }
  }

  checkLegacyLocalSession() {
    const isConn = localStorage.getItem('wanderWalletConnected') === 'true';
    const addr = localStorage.getItem('arweaveAddress');
    if (isConn && addr) {
      this.isConnected = true;
      this.arweaveAddress = addr;
      const storedToken = this.readPersistedWidgetToken();
      if (!this.session) this.session = {};
      this.session.address = addr;
      if (storedToken) {
        this.widgetToken = storedToken;
        this.session.widgetToken = storedToken;
      }
      this.getBalance().then((b) => this.updateUI(b));
    } else {
      this.updateUI();
    }
  }

  async handleLoginClick() {
    if (!this.elements.loginBtn) return;
    if (this.isConnected) {
      const token = this.getWidgetToken();
      if (token) {
        this.navigateToDashboard(token);
      } else {
        this.showUserDashboard();
      }
      return;
    }

    this.showLoginChooser();
  }

  showLoginChooser() {
    try {
      if (this.__loginChooserEl) {
        this.__loginChooserEl.classList.remove('hidden');
        return;
      }

      const overlay = document.createElement('div');
      overlay.className = 'getty-login-chooser-overlay';
      overlay.innerHTML = `
        <div class="getty-login-chooser" role="dialog" aria-modal="true">
          <div class="getty-login-chooser__head">
            <button class="getty-login-chooser__back is-hidden" type="button" data-act="back" disabled aria-label="${this.t(
              'publicAuth.back'
            )}" title="${this.t('publicAuth.back')}">‹</button>
            <div class="getty-login-chooser__title">${this.t('walletLogin')}</div>
            <button class="getty-login-chooser__close" type="button" aria-label="${this.t('commonClose')}">×</button>
          </div>
          <div class="getty-login-chooser__body" data-step="choose">
            <button class="getty-login-chooser__btn" type="button" data-act="wander">
              <span class="getty-login-chooser__btnMain">
                <span class="getty-login-chooser__btnIcon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 130 78" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M89.3721 39.8985L66.4471 10.8297C65.4813 9.57643 64.5342 9.37175 63.4969 10.7178L40.5366 39.8512L62.7595 59.9368L64.9176 13.9193L67.0756 59.9368L89.3721 39.8985Z" fill="url(#getty-wander-paint0)"/>
                    <path d="M105.651 69.9407L128.95 20.2211C129.45 19.132 128.256 18.0437 127.218 18.6416L92.3794 38.6657L69.7344 64.176L105.651 69.9407Z" fill="url(#getty-wander-paint1)"/>
                    <path d="M24.1509 69.9407L0.851883 20.2211C0.352089 19.132 1.54565 18.0437 2.58412 18.6416L37.4226 38.6657L60.0676 64.176L24.1509 69.9407Z" fill="url(#getty-wander-paint2)"/>
                    <defs>
                      <linearGradient id="getty-wander-paint0" x1="64.7823" y1="59.9368" x2="64.7823" y2="9.79541" gradientUnits="userSpaceOnUse">
                        <stop stop-color="#6B57F9"/>
                        <stop offset="1" stop-color="#9787FF"/>
                      </linearGradient>
                      <linearGradient id="getty-wander-paint1" x1="79.0015" y1="49.711" x2="110.284" y2="67.4809" gradientUnits="userSpaceOnUse">
                        <stop stop-color="#6B57F9"/>
                        <stop offset="1" stop-color="#9787FF"/>
                      </linearGradient>
                      <linearGradient id="getty-wander-paint2" x1="50.8005" y1="49.711" x2="19.5178" y2="67.4809" gradientUnits="userSpaceOnUse">
                        <stop stop-color="#6B57F9"/>
                        <stop offset="1" stop-color="#9787FF"/>
                      </linearGradient>
                    </defs>
                  </svg>
                </span>
                <span class="getty-login-chooser__btnText">${this.t('publicAuth.wander')}</span>
              </span>
              <span class="muted">${this.t('publicAuth.wanderSubtitle')}</span>
            </button>
            <button class="getty-login-chooser__btn" type="button" data-act="odysee">
              <span class="getty-login-chooser__btnMain">
                <span class="getty-login-chooser__btnIcon" aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 103.3 103.3">
                    <defs>
                      <linearGradient id="getty-odysee-linear-gradient" x1="37.9" x2="110.84" y1="5.54" y2="180.15" gradientTransform="translate(-9 -8.35)" gradientUnits="userSpaceOnUse">
                        <stop offset="0" stop-color="#ef1970"/>
                        <stop offset=".14" stop-color="#f23b5c"/>
                        <stop offset=".44" stop-color="#f77d35"/>
                        <stop offset=".7" stop-color="#fcad18"/>
                        <stop offset=".89" stop-color="#fecb07"/>
                        <stop offset="1" stop-color="#ffd600"/>
                      </linearGradient>
                    </defs>
                    <circle cx="51.65" cy="51.65" r="51.65" fill="url(#getty-odysee-linear-gradient)"/>
                    <path d="M11.92 38.22a.95.95 0 1 0-.3 1.31.95.95 0 0 0 .3-1.31" fill="#fff"/>
                    <path d="M67.44 13.37a.95.95 0 1 0-.3 1.31.95.95 0 0 0 .3-1.31" fill="#fff"/>
                    <path d="M78.91 50.65a1.11 1.11 0 1 0 1.33-.84 1.11 1.11 0 0 0-1.33.84" fill="#fff"/>
                    <path d="M62.35 87.65a.86.86 0 1 0 1-.65.86.86 0 0 0-1 .65" fill="#fff"/>
                    <path d="M19.18 21.16a.52.52 0 1 0 .63-.39.52.52 0 0 0-.63.39" fill="#fff"/>
                    <path d="M21.86 69.96a.73.73 0 1 0-.59.85.73.73 0 0 0 .59-.85" fill="#fff"/>
                    <path d="M43.75 10.14s-8.16 2.24-7.53 10.89c.56 7.67 4.65 11.85 13.14 8.65s9.93-5.45 7.85-11.85-4.49-10.73-13.46-7.69" fill="none"/>
                    <path d="M91.45 83.65c-.32-.6-6.45-10-7.21-17.9-.56-5.47-7.71-11.54-12-14.73a3.11 3.11 0 0 1-.24-4.75c4.23-4 11.69-11.8 14.05-15.92a31.3 31.3 0 0 0 3.44-13.89 52 52 0 0 0-9.82-8.22c-3.48 1.72-4.42 7.07-5.95 13.3-2.08 8.49-7 7.53-9 7.53s-.8-3-5.45-16.34-16.74-10-25.93-4.5c-11.68 7-6.47 21.93-3.58 31.55-1.64 1.58-7.81 2.81-13.42 5.83C9.39 49.35 2.28 55.36.43 58.12a51.3 51.3 0 0 0 2.62 11 5.9 5.9 0 0 0 1.38.95c3.29 1.53 8.13-1.09 12.71-5.84a23.3 23.3 0 0 1 4.57-3.53 49 49 0 0 1 11.77-5.53s4.49 6.89 8.65 15.06-4.49 10.89-5.45 10.89-14.59-1.27-11.55 10.26 19.7 7.37 28.19 1.76 6.41-23.87 6.41-23.87c8.33-1.28 10.89 7.53 11.69 12s-1 12.33 7.37 12.5a10.5 10.5 0 0 0 3.47-.54A52 52 0 0 0 91 85.06a2.9 2.9 0 0 0 .45-1.41m-42.09-54c-8.49 3.2-12.58-1-13.14-8.65-.63-8.65 7.53-10.89 7.53-10.89 9-3 11.37 1.28 13.46 7.69s.64 8.68-7.85 11.85" fill="#fff"/>
                    <path d="m97.44 50.39-1.17-2.32-2.55-.53 2.32-1.17.52-2.55 1.18 2.32 2.55.52-2.32 1.18z" fill="#fff" transform="translate(-9 -8.35)"/>
                    <path d="M54.25 19.36a5.4 5.4 0 0 1 .38 3.6" fill="#f9f9f9"/>
                    <path d="M54.63 24.06h-.21a1.09 1.09 0 0 1-.86-1.27 4.36 4.36 0 0 0-.31-3 1.09 1.09 0 0 1 2-.84 6.46 6.46 0 0 1 .44 4.23 1.09 1.09 0 0 1-1.06.88" fill="#fff"/>
                    <path d="M51.56 13.33a6.1 6.1 0 0 1 .81 1.24" fill="#f9f9f9"/>
                    <path d="M52.36 15.65a1.09 1.09 0 0 1-1-.56 6.7 6.7 0 0 0-.64-1 1.1 1.1 0 0 1 0-1.52 1.07 1.07 0 0 1 1.49 0 6.8 6.8 0 0 1 1 1.49 1.09 1.09 0 0 1-.85 1.59" fill="#fff"/>
                  </svg>
                </span>
                <span class="getty-login-chooser__btnText">${this.t('publicAuth.odysee')}</span>
              </span>
              <span class="muted">${this.t('publicAuth.odyseeSubtitle')}</span>
            </button>
          </div>
          <div class="getty-login-chooser__body hidden" data-step="odysee">
            <div class="getty-login-chooser__hint">${this.t('publicAuth.odyseeHint')}</div>
            <div class="getty-login-chooser__odyseeLayout">
              <form data-role="odysee-form">
              <label class="getty-login-chooser__label">${this.t('publicAuth.emailLabel')}</label>
              <input class="getty-login-chooser__input" type="email" autocomplete="username" data-field="email" placeholder="${this.t('publicAuth.emailPlaceholder')}" />
              <div data-role="password-block">
                <label class="getty-login-chooser__label">${this.t('publicAuth.passwordLabel')}</label>
                <input class="getty-login-chooser__input" type="password" autocomplete="current-password" data-field="password" placeholder="${this.t('publicAuth.passwordPlaceholder')}" />
              </div>
              <label class="getty-login-chooser__label">${this.t('publicAuth.walletAddressOptionalLabel')}</label>
              <input class="getty-login-chooser__input" type="text" autocomplete="off" data-field="walletAddress" placeholder="${this.t('publicAuth.walletAddressOptionalPlaceholder')}" />
              <div class="getty-login-chooser__hint hidden" data-role="magic-link-note">${this.t(
                'publicAuth.magicLinkWaiting'
              )}</div>
              <div class="getty-login-chooser__row">
                <button class="getty-login-chooser__btn small center" type="button" data-act="magic-link" title="${this.t('publicAuth.magicLinkTooltip')}">
                  <span class="getty-login-chooser__btnIcon" aria-hidden="true"><i class="pi pi-envelope"></i></span>
                  <span data-role="magic-link-label">${this.t('publicAuth.useMagicLink')}</span>
                </button>
                <a class="getty-login-chooser__btn small center" data-role="create-account" href="https://odysee.com/$/signup" target="_blank" rel="noopener noreferrer">
                  <span class="getty-login-chooser__btnIcon" aria-hidden="true"><i class="pi pi-user-plus"></i></span>
                  ${this.t('publicAuth.createAccount')}
                </a>
              </div>
              <div data-role="connect-odysee-block">
                <button class="getty-login-chooser__btn center" type="submit" data-act="connect-odysee">
                  <span class="getty-login-chooser__btnIcon" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 103.3 103.3">
                      <defs>
                        <linearGradient id="getty-odysee-linear-gradient-2" x1="37.9" x2="110.84" y1="5.54" y2="180.15" gradientTransform="translate(-9 -8.35)" gradientUnits="userSpaceOnUse">
                          <stop offset="0" stop-color="#ef1970"/>
                          <stop offset=".14" stop-color="#f23b5c"/>
                          <stop offset=".44" stop-color="#f77d35"/>
                          <stop offset=".7" stop-color="#fcad18"/>
                          <stop offset=".89" stop-color="#fecb07"/>
                          <stop offset="1" stop-color="#ffd600"/>
                        </linearGradient>
                      </defs>
                      <circle cx="51.65" cy="51.65" r="51.65" fill="url(#getty-odysee-linear-gradient-2)"/>
                      <path d="M11.92 38.22a.95.95 0 1 0-.3 1.31.95.95 0 0 0 .3-1.31" fill="#fff"/>
                      <path d="M67.44 13.37a.95.95 0 1 0-.3 1.31.95.95 0 0 0 .3-1.31" fill="#fff"/>
                      <path d="M78.91 50.65a1.11 1.11 0 1 0 1.33-.84 1.11 1.11 0 0 0-1.33.84" fill="#fff"/>
                      <path d="M62.35 87.65a.86.86 0 1 0 1-.65.86.86 0 0 0-1 .65" fill="#fff"/>
                      <path d="M19.18 21.16a.52.52 0 1 0 .63-.39.52.52 0 0 0-.63.39" fill="#fff"/>
                      <path d="M21.86 69.96a.73.73 0 1 0-.59.85.73.73 0 0 0 .59-.85" fill="#fff"/>
                      <path d="M43.75 10.14s-8.16 2.24-7.53 10.89c.56 7.67 4.65 11.85 13.14 8.65s9.93-5.45 7.85-11.85-4.49-10.73-13.46-7.69" fill="none"/>
                      <path d="M91.45 83.65c-.32-.6-6.45-10-7.21-17.9-.56-5.47-7.71-11.54-12-14.73a3.11 3.11 0 0 1-.24-4.75c4.23-4 11.69-11.8 14.05-15.92a31.3 31.3 0 0 0 3.44-13.89 52 52 0 0 0-9.82-8.22c-3.48 1.72-4.42 7.07-5.95 13.3-2.08 8.49-7 7.53-9 7.53s-.8-3-5.45-16.34-16.74-10-25.93-4.5c-11.68 7-6.47 21.93-3.58 31.55-1.64 1.58-7.81 2.81-13.42 5.83C9.39 49.35 2.28 55.36.43 58.12a51.3 51.3 0 0 0 2.62 11 5.9 5.9 0 0 0 1.38.95c3.29 1.53 8.13-1.09 12.71-5.84a23.3 23.3 0 0 1 4.57-3.53 49 49 0 0 1 11.77-5.53s4.49 6.89 8.65 15.06-4.49 10.89-5.45 10.89-14.59-1.27-11.55 10.26 19.7 7.37 28.19 1.76 6.41-23.87 6.41-23.87c8.33-1.28 10.89 7.53 11.69 12s-1 12.33 7.37 12.5a10.5 10.5 0 0 0 3.47-.54A52 52 0 0 0 91 85.06a2.9 2.9 0 0 0 .45-1.41m-42.09-54c-8.49 3.2-12.58-1-13.14-8.65-.63-8.65 7.53-10.89 7.53-10.89 9-3 11.37 1.28 13.46 7.69s.64 8.68-7.85 11.85" fill="#fff"/>
                      <path d="m97.44 50.39-1.17-2.32-2.55-.53 2.32-1.17.52-2.55 1.18 2.32 2.55.52-2.32 1.18z" fill="#fff" transform="translate(-9 -8.35)"/>
                      <path d="M54.25 19.36a5.4 5.4 0 0 1 .38 3.6" fill="#f9f9f9"/>
                      <path d="M54.63 24.06h-.21a1.09 1.09 0 0 1-.86-1.27 4.36 4.36 0 0 0-.31-3 1.09 1.09 0 0 1 2-.84 6.46 6.46 0 0 1 .44 4.23 1.09 1.09 0 0 1-1.06.88" fill="#fff"/>
                      <path d="M51.56 13.33a6.1 6.1 0 0 1 .81 1.24" fill="#f9f9f9"/>
                      <path d="M52.36 15.65a1.09 1.09 0 0 1-1-.56 6.7 6.7 0 0 0-.64-1 1.1 1.1 0 0 1 0-1.52 1.07 1.07 0 0 1 1.49 0 6.8 6.8 0 0 1 1 1.49 1.09 1.09 0 0 1-.85 1.59" fill="#fff"/>
                    </svg>
                  </span>
                  ${this.t('publicAuth.connectOdysee')}
                </button>
              </div>
              </form>
              <div class="getty-login-chooser__odyseeImageWrap" aria-hidden="true">
                <img class="getty-login-chooser__odyseeImage" src="/img/odysee-sign-up_d.webp" alt="" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22480%22%20height%3D%22280%22%20viewBox%3D%220%200%20480%20280%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20stop-color%3D%22%23e5e7eb%22%20offset%3D%220%22/%3E%3Cstop%20stop-color%3D%22%23f3f4f6%22%20offset%3D%221%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect%20width%3D%22480%22%20height%3D%22280%22%20rx%3D%2224%22%20fill%3D%22url(%23g)%22/%3E%3Cpath%20d%3D%22M96%20156c42-64%2090-82%20136-82%2056%200%2098%2030%20118%2068%2019%2037%2060%2043%20102%2022%22%20fill%3D%22none%22%20stroke%3D%22%23d1d5db%22%20stroke-width%3D%2212%22%20stroke-linecap%3D%22round%22/%3E%3Ccircle%20cx%3D%22210%22%20cy%3D%22132%22%20r%3D%2228%22%20fill%3D%22%23ffffff%22%20stroke%3D%22%23d1d5db%22%20stroke-width%3D%224%22/%3E%3Ccircle%20cx%3D%22210%22%20cy%3D%22132%22%20r%3D%2212%22%20fill%3D%22%23d1d5db%22/%3E%3Crect%20x%3D%22300%22%20y%3D%2296%22%20width%3D%22112%22%20height%3D%2272%22%20rx%3D%2216%22%20fill%3D%22%23ffffff%22%20stroke%3D%22%23d1d5db%22%20stroke-width%3D%224%22/%3E%3Cpath%20d%3D%22M328%20132h56%22%20stroke%3D%22%23d1d5db%22%20stroke-width%3D%228%22%20stroke-linecap%3D%22round%22/%3E%3Cpath%20d%3D%22M132%20214h216%22%20stroke%3D%22%23d1d5db%22%20stroke-width%3D%228%22%20stroke-linecap%3D%22round%22/%3E%3Cpath%20d%3D%22M164%20240h152%22%20stroke%3D%22%23e5e7eb%22%20stroke-width%3D%228%22%20stroke-linecap%3D%22round%22/%3E%3C/svg%3E';" />
              </div>
            </div>
            <div class="getty-login-chooser__error hidden" data-role="error"></div>
          </div>
        </div>
      `;

      const close = () => this.hideLoginChooser();
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
      });
      overlay.querySelector('[data-act="back"]').addEventListener('click', () => {
        try {
          overlay.dataset.odyseeMagicLink = 'false';
          overlay.dataset.odyseeMagicLinkSent = 'false';
        } catch {}
        try {
          this.__syncOdyseeMagicLinkUi(overlay);
        } catch {}
        this.__setChooserStep(overlay, 'choose');
      });
      overlay.querySelector('[data-act="wander"]').addEventListener('click', () => {
        close();
        void this.__startWanderLoginFromChooser().catch(() => {});
      });
      overlay.querySelector('[data-act="odysee"]').addEventListener('click', () => {
        this.__setChooserStep(overlay, 'odysee');
      });
      const odyseeForm = overlay.querySelector('[data-role="odysee-form"]');
      if (odyseeForm) {
        odyseeForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const isMagic = overlay?.dataset?.odyseeMagicLink === 'true';
          void this.__startOdyseeLoginFromChooser(overlay, isMagic ? { useMagicLink: true } : undefined);
        });
      }
      const magicLinkBtn = overlay.querySelector('[data-act="magic-link"]');
      if (magicLinkBtn) {
        magicLinkBtn.addEventListener('click', () => {
          const isMagic = overlay?.dataset?.odyseeMagicLink === 'true';
          if (!isMagic) {
            try {
              overlay.dataset.odyseeMagicLink = 'true';
              overlay.dataset.odyseeMagicLinkSent = 'false';
            } catch {}
            try {
              this.__syncOdyseeMagicLinkUi(overlay);
            } catch {}
            return;
          }
          void this.__startOdyseeLoginFromChooser(overlay, { useMagicLink: true });
        });
      }
      overlay.querySelector('.getty-login-chooser__close').addEventListener('click', close);
      document.body.appendChild(overlay);
      this.__loginChooserEl = overlay;
    } catch (e) {
      console.error('[wander-login] failed to open chooser', e);
      this.showError('Unable to open login chooser');
    }
  }

  hideLoginChooser() {
    try {
      if (this.__loginChooserEl) this.__loginChooserEl.classList.add('hidden');
    } catch {}

    try {
      this.__stopOdyseeMagicLinkWatcher && this.__stopOdyseeMagicLinkWatcher();
    } catch {}
  }

  __syncOdyseeMagicLinkUi(root) {
    try {
      if (!root) return;
      const isMagic = root?.dataset?.odyseeMagicLink === 'true';
      const isSent = root?.dataset?.odyseeMagicLinkSent === 'true';

      const pw = root.querySelector('[data-role="password-block"]');
      const btn = root.querySelector('[data-role="connect-odysee-block"]');
      const note = root.querySelector('[data-role="magic-link-note"]');
      const create = root.querySelector('[data-role="create-account"]');
      const label = root.querySelector('[data-role="magic-link-label"]');

      if (pw) pw.classList.toggle('hidden', isMagic);
      if (btn) btn.classList.toggle('hidden', isMagic);
      if (note) note.classList.toggle('hidden', !isMagic || !isSent);
      if (create) create.classList.toggle('hidden', isMagic);

      if (label) {
        const key = !isMagic
          ? 'publicAuth.useMagicLink'
          : isSent
            ? 'publicAuth.retrySendingLink'
            : 'publicAuth.sendMagicLink';
        label.textContent = this.t(key);
      }
    } catch {}
  }

  __setChooserStep(root, step) {
    try {
      const choose = root.querySelector('[data-step="choose"]');
      const odysee = root.querySelector('[data-step="odysee"]');
      const isOdysee = step === 'odysee';

      try {
        const backBtn = root.querySelector('[data-act="back"]');
        if (backBtn) {
          backBtn.classList.toggle('is-hidden', !isOdysee);
          try {
            if (isOdysee) backBtn.removeAttribute('disabled');
            else backBtn.setAttribute('disabled', '');
          } catch {}
        }
      } catch {}

      try {
        root.classList.toggle('getty-login-chooser-overlay--odysee', isOdysee);
      } catch {}

      const fromEl = isOdysee ? choose : odysee;
      const toEl = isOdysee ? odysee : choose;

      const canAnimate =
        fromEl &&
        toEl &&
        typeof fromEl.animate === 'function' &&
        typeof toEl.animate === 'function' &&
        !fromEl.classList.contains('hidden');

      if (!fromEl || !toEl || !canAnimate) {
        if (isOdysee) {
          choose.classList.add('hidden');
          odysee.classList.remove('hidden');
        } else {
          odysee.classList.add('hidden');
          choose.classList.remove('hidden');
        }
      } else {
        toEl.classList.remove('hidden');

        const dur = 160;
        const easing = 'cubic-bezier(0.2, 0, 0, 1)';

        try {
          fromEl.style.pointerEvents = 'none';
          toEl.style.pointerEvents = 'none';
        } catch {}

        const animIn = toEl.animate(
          [
            { opacity: 0, transform: 'translateY(6px)' },
            { opacity: 1, transform: 'translateY(0px)' },
          ],
          { duration: dur, easing, fill: 'forwards' }
        );
        const animOut = fromEl.animate(
          [
            { opacity: 1, transform: 'translateY(0px)' },
            { opacity: 0, transform: 'translateY(-6px)' },
          ],
          { duration: dur, easing, fill: 'forwards' }
        );

        Promise.allSettled([animIn.finished, animOut.finished]).then(() => {
          try {
            fromEl.classList.add('hidden');
          } catch {}
          try {
            fromEl.style.opacity = '';
            fromEl.style.transform = '';
            fromEl.style.pointerEvents = '';
          } catch {}
          try {
            toEl.style.opacity = '';
            toEl.style.transform = '';
            toEl.style.pointerEvents = '';
          } catch {}
        });
      }
      const err = root.querySelector('[data-role="error"]');
      if (err) {
        err.textContent = '';
        err.classList.add('hidden');
      }

      try {
        if (isOdysee) this.__syncOdyseeMagicLinkUi(root);
      } catch {}
    } catch {}
  }

  async __startWanderLoginFromChooser() {
    try {
      this.setLoading(true, this.t('connecting'));
      await this.loginFlow();
    } catch (e) {
      console.error('[wander-login] login failed', e);
      this.showError(e.message || 'Unknown error');
    } finally {
      this.setLoading(false);
    }
  }

  async __startOdyseeLoginFromChooser(root, opts) {
    const errBox = root.querySelector('[data-role="error"]');
    const setErr = (msg) => {
      if (!errBox) return;
      errBox.textContent = msg || '';
      if (msg) errBox.classList.remove('hidden');
      else errBox.classList.add('hidden');
    };
    try {
      const useMagicLink = !!opts?.useMagicLink;
      const emailEl = root.querySelector('[data-field="email"]');
      const passwordEl = root.querySelector('[data-field="password"]');
      const walletEl = root.querySelector('[data-field="walletAddress"]');
      const email = emailEl && emailEl.value ? String(emailEl.value).trim() : '';
      const password = passwordEl && passwordEl.value ? String(passwordEl.value) : '';
      if (!email) {
        setErr(this.t('publicAuth.missingEmail'));
        return;
      }
      if (!useMagicLink && !password) {
        setErr(this.t('publicAuth.missingPassword'));
        return;
      }

      let walletAddress = walletEl && walletEl.value ? String(walletEl.value).trim() : '';
      if (!walletAddress) {
        try {
          const stored = localStorage.getItem('arweaveAddress');
          if (stored) walletAddress = String(stored).trim();
        } catch {}
      }
      if (!walletAddress && this.arweaveAddress) walletAddress = String(this.arweaveAddress).trim();

      if (!walletAddress) {
        try {
          const addr = await this.__tryGetWanderAddressForOdysee({ allowConnect: false });
          if (addr) {
            walletAddress = addr;
            try {
              if (walletEl) walletEl.value = addr;
            } catch {}
          }
        } catch {}
      }

      setErr('');
      this.setLoading(true, useMagicLink ? this.t('sending') : this.t('connecting'));

      const resp = await this.postJson('/api/auth/odysee/login', {
        email,
        ...(useMagicLink ? {} : { password }),
        walletAddress,
        ...(useMagicLink ? { useMagicLink: true } : {}),
      });
      if (!resp || !resp.success) {
        if (resp?.error === 'email_verification_required') {
          setErr(this.t('publicAuth.emailVerificationRequired'));
          try {
            if (useMagicLink) {
              root.dataset.odyseeMagicLink = 'true';
              root.dataset.odyseeMagicLinkSent = 'true';
              this.__syncOdyseeMagicLinkUi(root);
            }
          } catch {}
          this.__startOdyseeMagicLinkWatcher(root, { email, walletAddress, password, useMagicLink });
          return;
        }

        try {
          console.warn('[odysee-login] failed', resp);
        } catch {}
        if (resp?.error === 'odysee_email_not_found') {
          setErr(this.t('publicAuth.emailNotFound'));
          return;
        }
        if (resp?.error === 'wallet_address_required') {
          try {
            const addr = await this.__tryGetWanderAddressForOdysee({ allowConnect: true });
            if (addr) {
              try {
                if (walletEl) walletEl.value = addr;
              } catch {}

              const retry = await this.postJson('/api/auth/odysee/login', {
                email,
                password,
                walletAddress: addr,
              });

              if (retry && retry.success) {
                try {
                  if (passwordEl) passwordEl.value = '';
                } catch {}

                this.session = retry;
                this.arweaveAddress = retry.walletAddress || retry.address || addr || null;
                this.isConnected = true;
                this.lastReconnectReason = '';
                try {
                  localStorage.setItem('wanderWalletConnected', 'true');
                  if (this.arweaveAddress)
                    localStorage.setItem('arweaveAddress', this.arweaveAddress);
                } catch {}
                if (retry.widgetToken) this.persistWidgetToken(retry.widgetToken, retry.expiresAt);
                await this.updateUI();
                this.scheduleBalanceFetch();

                if (retry.needsWalletVerification) {
                  this.maybeToast(this.t('publicAuth.needsWalletVerification'), 'warn');
                }

                this.hideLoginChooser();

                const token = this.getWidgetToken();
                if (token) this.navigateToDashboard(token);
                else this.showUserDashboard();
                return;
              }
            }
          } catch {}

          setErr(
            'No se pudo detectar tu wallet. Ingresa tu dirección de Arweave o permite acceso a Wander para obtenerla.'
          );
          return;
        }

        let msg = resp?.error || 'odysee_login_failed';
        const reason = resp?.details?.reason;
        const method = resp?.details?.method;
        const rpcErr = resp?.details?.rpcError;
        if (reason) msg += ` (${reason})`;
        if (method) msg += ` [${method}]`;
        if (rpcErr && typeof rpcErr === 'object' && rpcErr.message) msg += `: ${rpcErr.message}`;
        else if (rpcErr && typeof rpcErr !== 'object') msg += `: ${String(rpcErr)}`;
        setErr(msg);
        return;
      }

      try {
        if (passwordEl) passwordEl.value = '';
      } catch {}

      this.session = resp;
      const walletAddrRaw = resp && typeof resp.walletAddress === 'string' ? resp.walletAddress.trim() : '';
      const isArweave = /^[A-Za-z0-9_-]{43,64}$/.test(walletAddrRaw);
      this.arweaveAddress = isArweave ? walletAddrRaw : null;
      this.isConnected = true;
      this.lastReconnectReason = '';
      try {
        if (isArweave) {
          localStorage.setItem('wanderWalletConnected', 'true');
          localStorage.setItem('arweaveAddress', walletAddrRaw);
        }
      } catch {}
      if (resp.widgetToken) this.persistWidgetToken(resp.widgetToken, resp.expiresAt);
      await this.updateUI();
      if (this.arweaveAddress) this.scheduleBalanceFetch();

      if (resp.needsWalletAddress || (resp.principalAddress && !this.arweaveAddress)) {
        this.maybeToast(this.t('publicAuth.needsWalletAddress'), 'warn');
      }

      if (resp.needsWalletVerification) {
        this.maybeToast(this.t('publicAuth.needsWalletVerification'), 'warn');
      }

      this.hideLoginChooser();

      const token = this.getWidgetToken();
      if (token) this.navigateToDashboard(token);
      else this.showUserDashboard();
    } catch (e) {
      setErr(e?.message || 'odysee_login_failed');
    } finally {
      this.setLoading(false);
    }
  }

  __stopOdyseeMagicLinkWatcher() {
    try {
      const w = this.__odyseeMagicLinkWatcher;
      if (!w) return;
      w.stopped = true;
      try {
        if (w.timer) clearTimeout(w.timer);
      } catch {}
      try {
        if (w.onFocus) window.removeEventListener('focus', w.onFocus);
      } catch {}
      try {
        if (w.onVis) document.removeEventListener('visibilitychange', w.onVis);
      } catch {}
      this.__odyseeMagicLinkWatcher = null;
    } catch {}
  }

  __startOdyseeMagicLinkWatcher(root, params) {
    try {
      if (!root || !params?.email) return;
      const email = String(params.email).trim();
      if (!email) return;

      this.__stopOdyseeMagicLinkWatcher();

      const state = {
        email,
        walletAddress: String(params.walletAddress || '').trim(),
        password: typeof params.password === 'string' ? String(params.password) : '',
        useMagicLink: !!params.useMagicLink,
        root,
        stopped: false,
        inFlight: false,
        lastAttemptAt: 0,
        delayMs: 12000,
        timer: null,
        onFocus: null,
        onVis: null,
      };

      const setErr = (msg) => {
        try {
          const errBox = root.querySelector('[data-role="error"]');
          if (!errBox) return;
          errBox.textContent = msg || '';
          if (msg) errBox.classList.remove('hidden');
          else errBox.classList.add('hidden');
        } catch {}
      };

      const schedule = (ms) => {
        if (state.stopped) return;
        try {
          if (state.timer) clearTimeout(state.timer);
        } catch {}
        state.timer = setTimeout(() => void attempt('timer'), ms);
      };

      const attempt = async (reason) => {
        if (state.stopped || state.inFlight) return;
        try {
          if (!document.body.contains(state.root)) {
            this.__stopOdyseeMagicLinkWatcher();
            return;
          }
          if (state.root.classList.contains('hidden')) return;

          const now = Date.now();
          if (now - state.lastAttemptAt < 2500 && reason !== 'focus') return;
          state.lastAttemptAt = now;

          let walletAddress = String(state.walletAddress || '').trim();
          if (!walletAddress) {
            try {
              const stored = localStorage.getItem('arweaveAddress');
              if (stored) walletAddress = String(stored).trim();
            } catch {}
          }
          if (!walletAddress && this.arweaveAddress) walletAddress = String(this.arweaveAddress).trim();

          state.inFlight = true;
          const payload = {
            email: state.email,
            walletAddress,
            skipResend: true,
          };
          // Security: only allow the server to attempt completion on explicit user interaction
          // (e.g. user returns to this tab) so background polling can't auto-login.
          payload.userGesture = reason === 'focus' || reason === 'visible';
          if (state.password) {
            payload.password = state.password;
          } else {
            payload.useMagicLink = true;
          }
          const resp = await this.postJson('/api/auth/odysee/login', payload);

          if (resp && resp.success) {
            this.session = resp;
            const walletAddrRaw = resp && typeof resp.walletAddress === 'string' ? resp.walletAddress.trim() : '';
            const isArweave = /^[A-Za-z0-9_-]{43,64}$/.test(walletAddrRaw);
            this.arweaveAddress = isArweave ? walletAddrRaw : null;
            this.isConnected = true;
            this.lastReconnectReason = '';
            try {
              if (isArweave) {
                localStorage.setItem('wanderWalletConnected', 'true');
                localStorage.setItem('arweaveAddress', walletAddrRaw);
              }
            } catch {}
            if (resp.widgetToken) this.persistWidgetToken(resp.widgetToken, resp.expiresAt);
            await this.updateUI();
            if (this.arweaveAddress) this.scheduleBalanceFetch();

            if (resp.needsWalletAddress || (resp.principalAddress && !this.arweaveAddress)) {
              this.maybeToast(this.t('publicAuth.needsWalletAddress'), 'warn');
            }

            if (resp.needsWalletVerification) {
              this.maybeToast(this.t('publicAuth.needsWalletVerification'), 'warn');
            }

            this.__stopOdyseeMagicLinkWatcher();
            this.hideLoginChooser();

            const token = this.getWidgetToken();
            if (token) this.navigateToDashboard(token);
            else this.showUserDashboard();
            return;
          }

          if (resp?.error === 'email_verification_required') {
            state.delayMs = Math.min(Math.floor(state.delayMs * 1.25), 30000);
            schedule(state.delayMs);
            return;
          }

          if (resp?.error === 'odysee_email_not_found') {
            setErr(this.t('publicAuth.emailNotFound'));
            this.__stopOdyseeMagicLinkWatcher();
            return;
          }

          if (resp?.error === 'wallet_address_required') {
            setErr(this.t('publicAuth.walletAddressOptionalPlaceholder') || 'Wallet address required.');
            this.__stopOdyseeMagicLinkWatcher();
            return;
          }

          setErr(resp?.error || 'odysee_login_failed');
          this.__stopOdyseeMagicLinkWatcher();
        } catch {
          state.delayMs = Math.min(Math.floor(state.delayMs * 1.25), 30000);
          schedule(state.delayMs);
        } finally {
          state.inFlight = false;
        }
      };

      state.onFocus = () => void attempt('focus');
      state.onVis = () => {
        try {
          if (document.visibilityState === 'visible') void attempt('visible');
        } catch {}
      };
      try {
        window.addEventListener('focus', state.onFocus);
      } catch {}
      try {
        document.addEventListener('visibilitychange', state.onVis);
      } catch {}

      this.__odyseeMagicLinkWatcher = state;
      schedule(state.delayMs);
    } catch {}
  }

  async __tryGetWanderAddressForOdysee(opts) {
    const allowConnect = !!opts?.allowConnect;
    try {
      if (this.arweaveAddress) return String(this.arweaveAddress).trim();
    } catch {}
    try {
      const stored = localStorage.getItem('arweaveAddress');
      if (stored) return String(stored).trim();
    } catch {}

    // Avoid opening a wallet-connect modal unless explicitly allowed.
    if (!allowConnect) return '';

    try {
      await this.ensureWalletLoadedEvent();
    } catch {}

    const wallet = await this.waitForWallet(1200, 100);
    if (!wallet) return '';

    try {
      if (typeof wallet.connect === 'function') {
        const perms = ['ACCESS_ADDRESS'];
        try {
          await wallet.connect(perms);
        } catch {
          try {
            await wallet.connect({ permissions: perms });
          } catch {}
        }
      }
    } catch (e) {
      if (/(denied|reject|user)/i.test(String(e?.message || e))) {
        return '';
      }
    }

    const address = await this.getActiveAddressSafe(wallet);
    if (address) {
      try {
        this.arweaveAddress = address;
      } catch {}
      try {
        localStorage.setItem('arweaveAddress', address);
      } catch {}
      return String(address).trim();
    }
    return '';
  }

  setLoading(isLoading, label) {
    const btn = this.elements.loginBtn;
    if (!btn) return;
    if (isLoading) {
      btn.classList.add('loading');
      if (this.elements.btnLabel) this.elements.btnLabel.textContent = label || '...';
    } else {
      btn.classList.remove('loading');
      if (this.elements.btnLabel) {
        if (this.isConnected && this.arweaveAddress) {
          this.elements.btnLabel.textContent = this.truncateAddress(this.arweaveAddress);
          this.elements.btnLabel.removeAttribute('data-i18n');
          this.elements.btnLabel.removeAttribute('data-default-label');
        } else {
          if (this.btnLabelMeta?.i18n)
            this.elements.btnLabel.setAttribute('data-i18n', this.btnLabelMeta.i18n);
          else this.elements.btnLabel.removeAttribute('data-i18n');
          if (this.btnLabelMeta?.defaultLabel)
            this.elements.btnLabel.setAttribute(
              'data-default-label',
              this.btnLabelMeta.defaultLabel
            );
          else this.elements.btnLabel.removeAttribute('data-default-label');
          const translated = this.t('loginLabel');
          if (translated && translated !== 'loginLabel') {
            this.elements.btnLabel.textContent = translated;
          } else if (this.btnLabelMeta?.defaultLabel) {
            this.elements.btnLabel.textContent = this.btnLabelMeta.defaultLabel;
          } else {
            this.elements.btnLabel.textContent = this.btnLabelMeta?.fallbackText || 'Login';
          }
        }
      }
    }
  }

  async loginFlow() {
    await this.ensureWalletLoadedEvent();

    const wallet = await this.waitForWallet(2000, 150);
    if (!wallet) throw new Error(this.t('notDetectedError'));

    let existingPerms = [];
    if (typeof wallet.getPermissions === 'function') {
      try {
        existingPerms = (await wallet.getPermissions()) || [];
      } catch {}
    }
    const needed = ['ACCESS_ADDRESS', 'ACCESS_PUBLIC_KEY', 'SIGN_MESSAGE'];
    const hasAll = needed.every((p) => existingPerms.includes(p));
    const address = hasAll
      ? await this.getActiveAddressSafe(wallet)
      : await this.connectWithPermissions(wallet, needed);
    if (!address) throw new Error(this.t('noAddressConnect'));

    let publicKey = await this.obtainPublicKey(wallet);
    if (!publicKey) throw new Error(this.t('publicKeyMissing'));

    const nonceResp = await this.postJson('/api/auth/wander/nonce', { address });
    if (nonceResp.error) throw new Error('Nonce error: ' + nonceResp.error);
    const message = nonceResp.message;
    if (!message) throw new Error('No message to sign was received');

    const firstSig = await this.signMessage(message, { order: 'message-first' });
    let signatureB64 = this.toBase64Url(firstSig.signature);
    const publicKeyB64 = this.normalizePublicKey(publicKey);

    let verifyResp = await this.postJson('/api/auth/wander/verify', {
      address,
      publicKey: publicKeyB64,
      signature: signatureB64,
    });
    if (!verifyResp || !verifyResp.success) {
      if (verifyResp && verifyResp.error === 'bad_signature') {
        console.warn('[wander-login] bad_signature: attempting alternative strategy');
        try {
          const altSig = await this.signMessage(message, {
            order: 'signature-first',
            exclude: firstSig.method,
          });
          signatureB64 = this.toBase64Url(altSig.signature);
          verifyResp = await this.postJson('/api/auth/wander/verify', {
            address,
            publicKey: publicKeyB64,
            signature: signatureB64,
          });
        } catch (e) {
          console.warn('[wander-login] reattempt signature failed', e?.message || e);
        }
      }
      if (!verifyResp || !verifyResp.success) {
        throw new Error(verifyResp?.error || 'Verification failed');
      }
    }

    this.session = verifyResp;
    this.arweaveAddress = address;
    this.isConnected = true;
    this.lastReconnectReason = '';
    localStorage.setItem('wanderWalletConnected', 'true');
    localStorage.setItem('arweaveAddress', address);

    if (verifyResp && verifyResp.widgetToken) {
      this.persistWidgetToken(verifyResp.widgetToken, verifyResp.expiresAt);
    }

    await this.updateUI();
    this.scheduleBalanceFetch();

    const isOnMainPage =
      window.location.pathname === '/' || window.location.pathname === '/index.html';

    if (isOnMainPage) {
      this.showUserDashboard();
    } else {
      setTimeout(() => {
        window.open('/admin/', '_self');
      }, 350);
    }
  }

  async signMessage(message, opts = {}) {
    if (!this.isWalletReady()) throw new Error(this.t('walletNotReady'));
    const w = this.resolveWalletHandle();
    if (!w) throw new Error(this.t('walletNotAvailable'));

    const exclude = opts.exclude || null;

    const isExcluded = (prefix) => {
      if (!exclude) return false;
      const ex = String(exclude);
      return ex === prefix || ex.startsWith(prefix + '(');
    };

    let signMessageArrayBufferAssertFailed = false;

    const attempt = async (label, fn) => {
      try {
        const resp = await fn();
        if (!resp) return null;
        if (resp && typeof resp === 'object' && resp.signature)
          return { signature: resp.signature, method: label };
        return { signature: resp, method: label };
      } catch (e) {
        try {
          const msg = String(e?.message || e || '');
          if (/not an ArrayBuffer/i.test(msg) && /^signMessage\(/.test(label)) {
            signMessageArrayBufferAssertFailed = true;
          }
        } catch {}
        // Keep logs low-noise: only warn on non-excluded attempts.
        if (!isExcluded(label)) {
          console.warn('[wander-login] failure', label, e?.message || e);
        }
        return null;
      }
    };

    if (typeof w.signMessage === 'function') {
      const isArweaveWalletProvider = (() => {
        try {
          return typeof window.arweaveWallet !== 'undefined' && w === window.arweaveWallet;
        } catch {
          return false;
        }
      })();

      const isWanderWalletProvider = (() => {
        try {
          return typeof window.wanderWallet !== 'undefined' && w === window.wanderWallet;
        } catch {
          return false;
        }
      })();

      const bytes = this.prepareMessageForSigning(message);

      if (isArweaveWalletProvider && !isExcluded('signMessage')) {
        const out = await attempt('signMessage(Uint8Array)', () => w.signMessage(bytes));
        if (out) return out;
      }

      const inferArrayBufferCtor = (val) => {
        try {
          if (!val) return null;

          if (
            typeof val === 'object' &&
            typeof val.byteLength === 'number' &&
            typeof val.slice === 'function' &&
            val.constructor &&
            val.constructor.name === 'ArrayBuffer'
          ) {
            return val.constructor;
          }

          if (typeof val === 'object' && val.buffer && val.buffer.constructor) {
            const c = val.buffer.constructor;
            if (c && c.name === 'ArrayBuffer') return c;
          }
        } catch {}
        return null;
      };

      let WalletArrayBuffer = ArrayBuffer;
      try {
        const pk =
          (typeof w.getActivePublicKey === 'function' && (await w.getActivePublicKey().catch(() => null))) ||
          (typeof w.getPublicKey === 'function' && (await w.getPublicKey().catch(() => null))) ||
          (typeof w.getOwner === 'function' && (await w.getOwner().catch(() => null))) ||
          null;
        const ctor = inferArrayBufferCtor(pk);
        if (ctor) WalletArrayBuffer = ctor;
      } catch {}

      if (WalletArrayBuffer === ArrayBuffer) {
        try {
          const fn = w && (w.signMessage || w.signature || w.connect);
          const FnCtor = fn && fn.constructor;
          if (FnCtor && typeof FnCtor === 'function') {
            const C = FnCtor('return ArrayBuffer')();
            if (typeof C === 'function') WalletArrayBuffer = C;
          }
        } catch {}
      }

      const arrayBufferExact = (() => {
        try {
          const ab = new WalletArrayBuffer(bytes.byteLength);
          new Uint8Array(ab).set(bytes);
          return ab;
        } catch {
          return bytes.buffer;
        }
      })();

      const arrayBufferClone = (() => {
        try {
          return arrayBufferExact.slice(0);
        } catch {
          return arrayBufferExact;
        }
      })();

      const candidates = [
        { label: 'signMessage(ArrayBuffer:exact)', val: arrayBufferExact },
        { label: 'signMessage(ArrayBuffer:clone)', val: arrayBufferClone },

        !isArweaveWalletProvider ? { label: 'signMessage(Uint8Array)', val: bytes } : null,

        typeof message === 'string' ? { label: 'signMessage(string)', val: message } : null,
      ].filter(Boolean);

      for (const c of candidates) {
        if (isExcluded(c.label)) continue;
        const out = await attempt(c.label, () => w.signMessage(c.val));
        if (out) return out;
      }

      if (
        signMessageArrayBufferAssertFailed &&
        isWanderWalletProvider &&
        typeof w.signature === 'function' &&
        !isExcluded('signature')
      ) {
        const input = this.prepareMessageForSigning(message);
        const algoAttempts = [
          { name: 'RSA-PSS', saltLength: 32 },
          { name: 'RSA-PSS', saltLength: 0 },
          { name: 'RSA-PKCS1-v1_5' },
        ];
        for (const alg of algoAttempts) {
          try {
            const resp = await w.signature(input, alg);
            if (!resp) continue;
            if (typeof resp === 'object' && resp.signature)
              return { signature: resp.signature, method: 'signature(' + alg.name + ')' };
            return { signature: resp, method: 'signature(' + alg.name + ')' };
          } catch (e) {
            if (/Algorithm cannot be undefined/i.test(e?.message || '')) continue;
            console.warn('[wander-login] failure signature alg', alg.name, e?.message || e);
          }
        }
      }

      throw new Error(this.t('signatureMethodsUnavailable'));
    }

    if (typeof w.signature === 'function' && !isExcluded('signature')) {
      const input = this.prepareMessageForSigning(message);
      const algoAttempts = [
        { name: 'RSA-PSS', saltLength: 32 },
        { name: 'RSA-PSS', saltLength: 0 },
        { name: 'RSA-PKCS1-v1_5' },
      ];
      for (const alg of algoAttempts) {
        try {
          const resp = await w.signature(input, alg);
          if (!resp) continue;
          if (typeof resp === 'object' && resp.signature)
            return { signature: resp.signature, method: 'signature(' + alg.name + ')' };
          return { signature: resp, method: 'signature(' + alg.name + ')' };
        } catch (e) {
          if (/Algorithm cannot be undefined/i.test(e?.message || '')) continue;
          console.warn('[wander-login] failure signature alg', alg.name, e?.message || e);
        }
      }
    }

    throw new Error(this.t('signatureMethodsUnavailable'));
  }

  prepareMessageForSigning(message) {
    if (!message) throw new Error('Empty message to sign');

    if (message instanceof Uint8Array) return message;
    if (message instanceof ArrayBuffer) return new Uint8Array(message);

    const b64Regex = /^[A-Za-z0-9+/=]+$/;
    if (typeof message === 'string') {
      try {
        const enc = new TextEncoder().encode(message);
        if (enc?.length) return enc;
      } catch {}

      if (b64Regex.test(message) && message.length % 4 === 0) {
        try {
          const bin = atob(message);
          const arr = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          return arr;
        } catch {}
      }

      return new TextEncoder().encode(String(message));
    }

    if (typeof message === 'object') {
      try {
        return new TextEncoder().encode(JSON.stringify(message));
      } catch {
        return new TextEncoder().encode(String(message));
      }
    }

    return new TextEncoder().encode(String(message));
  }

  isWalletReady() {
    return !!this.resolveWalletHandle();
  }

  resolveWalletHandle() {

    if (typeof window.arweaveWallet !== 'undefined') return window.arweaveWallet;
    if (typeof window.wander !== 'undefined') return window.wander;
    if (typeof window.wanderWallet !== 'undefined') return window.wanderWallet;

    return null;
  }

  async waitForWallet(timeoutMs = 2000, stepMs = 100) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const w = this.resolveWalletHandle();
      if (w) {
        return w;
      }
      await new Promise((r) => setTimeout(r, stepMs));
    }
    return null;
  }

  startWalletInjectionWatcher() {
    const MAX_MS = 5000;
    const intervalMs = 250;
    const start = Date.now();
    const tick = () => {
      if (this.isWalletReady()) {
        this.hideInstallBanner();
        return;
      }
      if (Date.now() - start < MAX_MS) {
        setTimeout(tick, intervalMs);
      } else {
        try {
          console.warn(
            '[wander-login] wallet not detected after waiting. Make sure the extension is enabled for this site.'
          );
        } catch {}
        this.showInstallBanner();
      }
    };
    setTimeout(tick, intervalMs);
  }

  ensureInstallBanner() {
    if (document.getElementById('wander-install-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'wander-install-banner';
    const title = this.t('bannerTitle');
    const missing = this.t('bannerMissing');
    const dismiss = this.t('bannerDismiss');
    const install = this.t('bannerInstall');

    const titleEl = document.createElement('div');
    titleEl.className = 'banner-title';
    titleEl.textContent = title;

    const msgEl = document.createElement('div');
    msgEl.className = 'banner-msg';
    msgEl.setAttribute('data-i18n', 'wanderMissingMsg');
    msgEl.textContent = missing;

    const actions = document.createElement('div');
    actions.className = 'actions';

    const dismissBtn = document.createElement('button');
    dismissBtn.type = 'button';
    dismissBtn.setAttribute('data-act', 'dismiss');
    dismissBtn.textContent = dismiss;

    const installLink = document.createElement('a');
    installLink.href =
      'https://chromewebstore.google.com/detail/wander/einnioafmpimabjcddiinlhmijaionap';
    installLink.target = '_blank';
    installLink.rel = 'noopener';
    installLink.setAttribute('data-act', 'install');
    installLink.textContent = install;

    actions.appendChild(dismissBtn);
    actions.appendChild(installLink);

    banner.appendChild(titleEl);
    banner.appendChild(msgEl);
    banner.appendChild(actions);

    try {
      banner.style.display = 'none';
    } catch {}
    document.body.appendChild(banner);
    this.ui.installBanner = banner;
    banner.addEventListener('click', (e) => {
      const act = e.target && e.target.getAttribute('data-act');
      if (act === 'dismiss') this.hideInstallBanner();
    });
  }
  showInstallBanner() {
    if (this.ui.installBanner) {
      try {
        this.ui.installBanner.style.display = 'block';
      } catch {}

      try {
        this.ui.installBanner.classList.remove('hidden');
      } catch {}
    }
  }
  hideInstallBanner() {
    if (this.ui.installBanner) {
      try {
        this.ui.installBanner.style.display = 'none';
      } catch {}
      try {
        this.ui.installBanner.classList.add('hidden');
      } catch {}
    }
  }

  toBase64Url(val) {
    try {
      if (val instanceof Uint8Array) {
        return this._u8ToB64Url(val);
      }

      if (val instanceof ArrayBuffer) {
        return this._u8ToB64Url(new Uint8Array(val));
      }

      if (typeof val === 'string' && /^[0-9a-fA-F]+$/.test(val) && val.length % 2 === 0) {
        const u8 = new Uint8Array(val.length / 2);
        for (let i = 0; i < val.length; i += 2) {
          u8[i / 2] = parseInt(val.substring(i, i + 2), 16);
        }
        return this._u8ToB64Url(u8);
      }

      if (typeof val === 'string' && /[+/=]/.test(val)) {
        return val.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      }

      if (typeof val === 'string' && /^[A-Za-z0-9_-]+$/.test(val)) {
        return val.replace(/=+$/, '');
      }

      if (val && typeof val === 'object' && val.signature) {
        return this.toBase64Url(val.signature);
      }

      if (typeof val === 'string') {
        const enc = new TextEncoder().encode(val);
        return this._u8ToB64Url(enc);
      }
      if (val) {
        const enc = new TextEncoder().encode(JSON.stringify(val));
        return this._u8ToB64Url(enc);
      }
    } catch (e) {
      console.warn('[wander-login] toBase64Url fallo', e);
    }
    throw new Error('Formato de firma o clave desconocido');
  }

  _u8ToB64Url(u8) {
    let binary = '';
    for (let i = 0; i < u8.length; i++) binary += String.fromCharCode(u8[i]);
    const b64 = btoa(binary);
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  async postJson(url, body) {
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
        mode: 'same-origin',
      });
    } catch (e) {
      return { error: 'network_error', details: e?.message || String(e) };
    }

    let json;
    try {
      json = await res.json();
    } catch {
      json = { error: 'bad_json' };
    }

    if (!res.ok) {
      if (json && typeof json === 'object' && json.error) return json;
      return { error: 'http_error', status: res.status };
    }
    return json;
  }

  async fetchMe() {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', '/api/auth/wander/me', true);
      xhr.withCredentials = true;
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve({ status: xhr.status, data });
            } catch {
              resolve({ status: xhr.status, data: null });
            }
          } else {
            resolve({ status: xhr.status || 0, data: null });
          }
        }
      };
      xhr.onerror = function () {
        resolve({ status: 0, data: null });
      };
      xhr.send();
    });
  }

  resetSessionState(config) {
    const normalized = typeof config === 'boolean' ? { broadcast: config } : config || {};
    const { broadcast = false, showReconnect = false, reason = '', message = '' } = normalized;

    if (reason) {
      this.lastReconnectReason = reason;
    } else if (!showReconnect) {
      this.lastReconnectReason = '';
    }

    this.isConnected = false;
    this.arweaveAddress = null;
    this.session = null;
    this.lastBalance = null;
    this.balanceFetchInFlight = false;
    this.balanceLastFetchTs = 0;

    try {
      localStorage.removeItem('wanderWalletConnected');
    } catch {}
    try {
      localStorage.removeItem('arweaveAddress');
    } catch {}
    if (broadcast) {
      try {
        localStorage.setItem('getty_logout', String(Date.now()));
      } catch {}
    }

    this.clearWidgetToken();

    try {
      this.updateUI();
    } catch {}

    if (showReconnect) {
      if (message) this.showLandingStatusMessage(message);
      this.exposeReconnectState(reason);
    } else if (message) {
      this.showLandingStatusMessage(message);
    }
  }

  async logout() {
    try {
      await this.postJson('/api/auth/wander/logout', {});
    } catch {}

    try {
      const w = this.resolveWalletHandle();
      if (w && typeof w.disconnect === 'function') w.disconnect();
    } catch {}

    this.resetSessionState(true);
    window.location.href = '/';
  }

  async connectWallet() {
    try {
      await this.loginFlow();
    } catch (e) {
      try {
        this.showError(e?.message || 'Unknown error');
      } catch {}
    }
  }

  async getBalance() {
    try {
      if (!this.arweaveAddress) return '0';

      const CACHE_KEY = 'arweaveBalanceCache';
      const TTL = 60_000;
      try {
        const cachedRaw = localStorage.getItem(CACHE_KEY);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached && cached.addr === this.arweaveAddress && Date.now() - cached.ts < TTL) {
            return cached.val;
          }
        }
      } catch {}

      const controller = new AbortController();
      const timeout = setTimeout(() => {
        try {
          controller.abort();
        } catch {}
      }, 3000);
      let winston;
      try {
        winston = await Promise.race([
          this.arweave.wallets.getBalance(this.arweaveAddress),
          new Promise((_, rej) => setTimeout(() => rej(new Error('balance_timeout')), 3000)),
        ]);
      } finally {
        clearTimeout(timeout);
      }
      const ar = this.arweave.ar.winstonToAr(winston);
      const val = parseFloat(ar).toFixed(4);
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ addr: this.arweaveAddress, ts: Date.now(), val })
        );
      } catch {}
      return val;
    } catch (error) {
      console.warn('[wander-login] Failed to obtain balance', error?.message || error);
      return null;
    }
  }

  disconnectWallet() {
    return this.logout();
  }

  async updateUI(balance = undefined) {
    const {
      loginBtn,
      userInfo,
      addressEl,
      balanceEl,
      statusDot,
      btnLabel,
      inlineBalance,
      openAdmin,
      logoutInline,
      langBtn,
    } = this.elements;
    if (this.isConnected) {
      const truncated = this.truncateAddress(this.arweaveAddress);
      if (loginBtn) {
        loginBtn.dataset.state = 'logged-in';
        if (btnLabel) {
          btnLabel.textContent = truncated;
          btnLabel.removeAttribute('data-i18n');
          btnLabel.removeAttribute('data-default-label');
        }
        loginBtn.title = this.arweaveAddress || '';
        const widgetToken = this.getWidgetToken();
        if (widgetToken) {
          loginBtn.dataset.widgetToken = widgetToken;
          loginBtn.setAttribute('aria-label', `${this.t('walletLogin')}: ${truncated}`);
        }
      }
      if (inlineBalance) {
        let displayBalance = typeof balance === 'string' ? balance : this.lastBalance || '';
        if (!displayBalance) {
          inlineBalance.textContent = '…';
        } else {
          inlineBalance.textContent = displayBalance + ' AR';
        }
        inlineBalance.classList.remove('hidden');
      }
      if (userInfo) userInfo.style.display = 'none';
      if (addressEl) addressEl.textContent = this.arweaveAddress || '';
      if (balanceEl) balanceEl.textContent = balance;
      if (openAdmin) {
        openAdmin.classList.remove('hidden');
        openAdmin.dataset.visible = 'true';
      }
      if (logoutInline) {
        logoutInline.classList.remove('hidden');
        logoutInline.dataset.visible = 'true';
        try {
          const candidates = ['logoutLabel', 'walletLogout', 'walletPublic.logoutLabel'];
          let chosen = '';
          for (const c of candidates) {
            const v = this.t(c);
            if (v && v !== c) {
              chosen = v;
              break;
            }
          }
          if (chosen) {
            const span = logoutInline.querySelector('[data-i18n]');
            if (span) span.textContent = chosen;
            else logoutInline.textContent = chosen;
            logoutInline.title = chosen;
            logoutInline.setAttribute('aria-label', chosen);
          }
        } catch {}
      }
      if (langBtn) {
        langBtn.classList.remove('hidden');
        langBtn.dataset.visible = 'true';
        langBtn.classList.add('flex');
      }
      if (statusDot) {
        statusDot.classList.remove('disconnected');
        statusDot.classList.add('connected');
      }
    } else {
      if (loginBtn) {
        loginBtn.dataset.state = 'logged-out';
        if (btnLabel) {
          if (this.btnLabelMeta?.i18n) btnLabel.setAttribute('data-i18n', this.btnLabelMeta.i18n);
          else btnLabel.removeAttribute('data-i18n');
          if (this.btnLabelMeta?.defaultLabel)
            btnLabel.setAttribute('data-default-label', this.btnLabelMeta.defaultLabel);
          else btnLabel.removeAttribute('data-default-label');
          const translated = this.t('loginLabel');
          if (translated && translated !== 'loginLabel') {
            btnLabel.textContent = translated;
          } else if (this.btnLabelMeta?.defaultLabel) {
            btnLabel.textContent = this.btnLabelMeta.defaultLabel;
          } else {
            btnLabel.textContent = this.btnLabelMeta?.fallbackText || 'Login';
          }
        }
        loginBtn.title = this.t('loginLabel');
        if (loginBtn.dataset.widgetToken) delete loginBtn.dataset.widgetToken;
        loginBtn.removeAttribute('aria-label');
      }
      if (inlineBalance) {
        inlineBalance.textContent = '';
        inlineBalance.classList.add('hidden');
      }
      if (userInfo) userInfo.style.display = 'none';
      if (openAdmin) {
        openAdmin.classList.add('hidden');
        openAdmin.dataset.visible = 'false';
      }
      if (logoutInline) {
        logoutInline.classList.add('hidden');
        logoutInline.dataset.visible = 'false';
      }

      if (langBtn) {
        langBtn.classList.remove('hidden');
        langBtn.dataset.visible = 'true';
        langBtn.classList.add('flex');
      }
      if (statusDot) {
        statusDot.classList.remove('connected');
        statusDot.classList.add('disconnected');
      }
    }
  }

  scheduleBalanceFetch(force = false) {
    if (!this.isConnected || !this.arweaveAddress) return;
    const now = Date.now();
    if (!force && (this.balanceFetchInFlight || now - this.balanceLastFetchTs < 15000)) return; // throttle 15s
    this.balanceFetchInFlight = true;
    this.getBalance()
      .then((b) => {
        if (b) {
          this.lastBalance = b;
          this.balanceLastFetchTs = Date.now();

          if (this.elements.inlineBalance && this.isConnected) {
            this.elements.inlineBalance.textContent = b + ' AR';
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        this.balanceFetchInFlight = false;
      });
  }

  truncateAddress(addr) {
    if (!addr) return '';
    if (addr.length <= 12) return addr;
    return addr.slice(0, 6) + '…' + addr.slice(-4);
  }

  async connectWithPermissions(wallet) {
    const permsPrimary = [
      'ACCESS_ADDRESS',
      'ACCESS_PUBLIC_KEY',
      'SIGNATURE',
      'SIGN_MESSAGE',
      'DISPATCH',
    ];
    const attempts = [];

    attempts.push(async () => wallet.connect(permsPrimary));
    attempts.push(async () => wallet.connect({ permissions: permsPrimary }));

    const permsMinimal = ['ACCESS_ADDRESS', 'ACCESS_PUBLIC_KEY', 'SIGNATURE'];
    attempts.push(async () => wallet.connect(permsMinimal));
    attempts.push(async () => wallet.connect({ permissions: permsMinimal }));

    let lastErr;
    for (const attempt of attempts) {
      try {
        const maybeAddr = await attempt();
        let address = maybeAddr;
        if (!address && typeof wallet.getActiveAddress === 'function') {
          try {
            address = await wallet.getActiveAddress();
          } catch {}
        }
        if (address) return address;

        if (!address) {
          await new Promise((r) => setTimeout(r, 150));
          if (typeof wallet.getActiveAddress === 'function') {
            try {
              address = await wallet.getActiveAddress();
            } catch {}
          }
          if (address) return address;
        }
      } catch (e) {
        lastErr = e;
        if (/(denied|reject|user)/i.test(String(e?.message))) {
          throw new Error('Permissions denied by the user');
        }
      }
    }
    console.error('[wander-login] connect failed', lastErr);
    throw lastErr || new Error('Unable to connect wallet');
  }

  async obtainPublicKey(wallet) {
    if (typeof wallet.getActivePublicKey === 'function') {
      try {
        const pk = await wallet.getActivePublicKey();
        if (pk) return pk;
      } catch (e) {
        console.warn('[wander-login] getActivePublicKey failed', e);
      }
    }
    if (typeof wallet.getPublicKey === 'function') {
      try {
        const pk = await wallet.getPublicKey();
        if (pk) return pk;
      } catch (e) {
        console.warn('[wander-login] getPublicKey failed', e);
      }
    }
    if (wallet.publicKey) return wallet.publicKey;

    if (wallet.account && wallet.account.publicKey) return wallet.account.publicKey;
    return null;
  }
  async ensureWalletLoadedEvent() {
    if (this.isWalletReady()) return;
    let resolved = false;
    await Promise.race([
      new Promise((r) => setTimeout(r, 1200)),
      new Promise((r) => {
        try {
          window.addEventListener(
            'arweaveWalletLoaded',
            () => {
              resolved = true;
              r();
            },
            { once: true }
          );
        } catch {
          r();
        }
      }),
    ]);
    if (!resolved && !this.isWalletReady()) return;
  }
  async getActiveAddressSafe(wallet) {
    if (typeof wallet.getActiveAddress === 'function') {
      try {
        const a = await wallet.getActiveAddress();
        if (a) return a;
      } catch {}
    }
    if (typeof wallet.getAllAddresses === 'function') {
      try {
        const list = await wallet.getAllAddresses();
        if (Array.isArray(list) && list.length) return list[0];
      } catch {}
    }
    return null;
  }
  normalizePublicKey(pk) {
    try {
      if (typeof pk === 'string') return this.toBase64Url(pk);
      if (pk && typeof pk === 'object') {
        if (typeof pk.n === 'string') return this.toBase64Url(pk.n);
        if (typeof pk.publicKey === 'string') return this.toBase64Url(pk.publicKey);
      }
    } catch (e) {
      console.warn('[wander-login] normalizePublicKey failed', e);
    }
    return this.toBase64Url(pk);
  }

  showError(message) {
    try {
      console.warn('[wander-login] error', message);
    } catch {}
    const walletNotDetected = /wander wallet.*(no detectada|not detected)/i.test(message);
    if (walletNotDetected) {
      this.showInstallBanner();
      this.maybeToast(message, 'warn');
      return;
    }

    try {
      alert(this.t('errorPrefix') + ': ' + message + '\n\n' + this.t('alertSuffix'));
    } catch {}

    if (/install.+wander wallet/i.test(message)) {
      const url =
        'https://chromewebstore.google.com/detail/wander/einnioafmpimabjcddiinlhmijaionap';
      try {
        if (window.confirm(this.t('openInstallConfirm'))) window.open(url, '_blank');
      } catch {}
    }
  }

  maybeToast(message, level = 'info') {
    try {
      if (typeof window.showToast === 'function') {
        window.showToast(message, level);
        return;
      }

      let root = document.getElementById('getty-toast-root');
      if (!root) {
        root = document.createElement('div');
        root.id = 'getty-toast-root';
        document.body.appendChild(root);
      }
      const toast = document.createElement('div');
      toast.className = 'getty-toast';
      if (level === 'warn') toast.classList.add('warn');
      else if (level === 'error') toast.classList.add('error');
      toast.textContent = message;
      root.appendChild(toast);
      setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 400);
      }, 4200);
    } catch {}
  }

  async signData(data) {
    return this.signMessage(data);
  }

  async sendTransaction(transaction) {
    if (!this.isConnected) {
      throw new Error(this.t('walletNotConnected'));
    }

    try {
      const w = this.resolveWalletHandle();
      if (!w || typeof w.dispatch !== 'function')
        throw new Error('dispatch not supported by the wallet');
      const result = await w.dispatch(transaction);
      return result;
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw error;
    }
  }

  detectLocale() {
    try {
      const stored = (
        localStorage.getItem('lang') ||
        localStorage.getItem('admin_locale') ||
        ''
      ).toLowerCase();
      if (stored === 'es' || stored === 'en') return stored;
    } catch {}
    try {
      const nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
      if (/^es/i.test(nav)) return 'es';
    } catch {}
    return 'en';
  }
  loadSharedMessages(locale) {
    const prefix = 'walletPublic.';
    const keys = [
      'bannerTitle',
      'bannerMissing',
      'bannerDismiss',
      'bannerInstall',
      'connecting',
      'loginLabel',
      'logoutLabel',
      'welcomeUser',
      'notDetectedError',
      'noAddressConnect',
      'publicKeyMissing',
      'signatureMethodsUnavailable',
      'walletNotReady',
      'walletNotAvailable',
      'walletNotConnected',
      'openInstallConfirm',
      'alertSuffix',
      'errorPrefix',
    ];
    const out = {};
    let foundAny = false;
    try {
      const store =
        (window.__i18n && window.__i18n[locale]) || (window.__i18n && window.__i18n.en) || null;
      if (store) {
        for (const k of keys) {
          const full = prefix + k;
          if (Object.prototype.hasOwnProperty.call(store, full)) {
            out[k] = store[full];
            foundAny = true;
          }
        }
      }
    } catch {}

    if (!foundAny) {
      if (locale === 'es') {
        return {
          bannerTitle: 'Wander Wallet',
          bannerMissing: 'No detectada. Instala la extensión para iniciar sesión segura.',
          bannerDismiss: 'OK',
          bannerInstall: 'Instalar',
          connecting: 'Conectando...',
          loginLabel: 'Conectar',
          logoutLabel: 'Cerrar sesión',
          welcomeUser: 'Bienvenido, {token}',
          notDetectedError: 'Wander Wallet no detectada',
          noAddressConnect: 'No se obtuvo dirección (connect)',
          publicKeyMissing: 'No se pudo obtener la clave pública',
          signatureMethodsUnavailable: 'Métodos de firma no disponibles',
          walletNotReady: 'Wallet no lista',
          walletNotAvailable: 'Wallet no disponible',
          walletNotConnected: 'Wallet no conectada',
          openInstallConfirm: '¿Abrir la página de instalación de Wander Wallet?',
          alertSuffix: 'Asegúrate de tener la extensión Wander Wallet instalada y habilitada.',
          errorPrefix: 'Error',
        };
      }
      return {
        bannerTitle: 'Wander Wallet',
        bannerMissing: 'Not detected. Install the extension to sign in securely.',
        bannerDismiss: 'OK',
        bannerInstall: 'Install',
        connecting: 'Connecting...',
        loginLabel: 'Login',
        logoutLabel: 'Logout',
        welcomeUser: 'Welcome, {token}',
        notDetectedError: 'Wander Wallet not detected',
        noAddressConnect: 'No address received (connect)',
        publicKeyMissing: 'Public key could not be obtained',
        signatureMethodsUnavailable: 'Signature methods not available',
        walletNotReady: 'Wallet not ready',
        walletNotAvailable: 'Wallet not available',
        walletNotConnected: 'Wallet not connected',
        openInstallConfirm: 'Open the Wander Wallet installation page?',
        alertSuffix: 'Make sure you have the Wander Wallet extension installed and enabled.',
        errorPrefix: 'Error',
      };
    }
    return out;
  }

  showUserDashboard() {
    const widgetToken = this.getWidgetToken();
    if (widgetToken) {
      this.navigateToDashboard(widgetToken);
      return;
    }

    const userToken = this.session?.userToken || this.arweaveAddress?.slice(0, 8);
    const welcomeEl = document.getElementById('user-welcome-message');
    if (welcomeEl) {
      welcomeEl.textContent = this.t('welcomeUser').replace('{token}', userToken);
      welcomeEl.classList.remove('hidden');
    }

    document.body.classList.add('user-dashboard-mode');
    document.body.classList.remove('landing');

    this.loadUserSpecificConfig();

    if (typeof window.loadUserSpecificWidgets === 'function') {
      window.loadUserSpecificWidgets();
    }
  }

  navigateToDashboard(widgetToken) {
    if (!widgetToken) return;
    const encoded = encodeURIComponent(widgetToken);
    const targetPath = `/user/${encoded}`;
    try {
      if (window.location.pathname === targetPath) {
        return;
      }
    } catch {}
    try {
      window.location.assign(targetPath);
    } catch {
      window.location.href = targetPath;
    }
  }

  async loadUserSpecificConfig() {
    try {
      const response = await fetch('/api/user/config');
      if (response.ok) {
        const config = await response.json();
        this.applyUserConfigToWidgets(config);
      }
    } catch (e) {
      console.warn('[wander-login] Failed to load user config', e);
    }
  }

  applyUserConfigToWidgets(config) {
    if (config.lastTip?.title) {
      const lastTipTitle = document.querySelector('#last-donation .os-panel-title span:last-child');
      if (lastTipTitle) lastTipTitle.textContent = config.lastTip.title;
    }

    if (config.colors) {
      this.applyCustomColors(config.colors);
    }
  }

  applyCustomColors(colors) {
    const root = document.documentElement;
    if (colors.primary) root.style.setProperty('--user-primary-color', colors.primary);
    if (colors.secondary) root.style.setProperty('--user-secondary-color', colors.secondary);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new WanderWalletLogin();
});
