/*
    getty - The platform tools for live streaming on Odysee.
    Copyright (C) 2025 gettyteam

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

function shouldAugmentUrl(url) {
  try {
    if (url.origin !== window.location.origin) return false;
    return url.pathname.startsWith('/api/');
  } catch {
    return false;
  }
}

function formatUrlForInput(original, url) {
  try {
    if (typeof original !== 'string') return url.toString();
    if (/^https?:/i.test(original) || original.startsWith('//')) {
      return url.toString();
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return url.toString();
  }
}

function setupWidgetTokenAdapters(widgetToken) {
  const normalizedToken =
    typeof widgetToken === 'string' && widgetToken.trim() ? widgetToken.trim() : null;
  const enablePublicFallback = !normalizedToken;

  if (!window.__GETTY_FETCH_PATCHED__ && typeof window.fetch === 'function') {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input, init) => {
      try {
        if (typeof input === 'string') {
          const url = new URL(input, window.location.origin);
          if (shouldAugmentUrl(url)) {
            if (normalizedToken && !url.searchParams.has('widgetToken')) {
              url.searchParams.set('widgetToken', normalizedToken);
              input = formatUrlForInput(input, url);
            } else if (enablePublicFallback && !url.searchParams.has('public')) {
              url.searchParams.set('public', '1');
              input = formatUrlForInput(input, url);
            }
          }
        } else if (input instanceof Request) {
          const requestUrl = new URL(input.url, window.location.origin);
          if (shouldAugmentUrl(requestUrl)) {
            if (normalizedToken && !requestUrl.searchParams.has('widgetToken')) {
              requestUrl.searchParams.set('widgetToken', normalizedToken);
              input = new Request(requestUrl.toString(), input);
            } else if (enablePublicFallback && !requestUrl.searchParams.has('public')) {
              requestUrl.searchParams.set('public', '1');
              input = new Request(requestUrl.toString(), input);
            }
          }
        }
      } catch {}

      return originalFetch(input, init);
    };

    window.__GETTY_FETCH_PATCHED__ = true;
  }

  if (!window.__GETTY_WS_PATCHED__ && typeof window.WebSocket === 'function') {
    const OriginalWebSocket = window.WebSocket;

    const patchedWebSocket = function (resource, protocols) {
      try {
        let originalString = null;
        if (typeof resource === 'string') {
          originalString = resource;
        } else if (resource && typeof resource.url === 'string') {
          originalString = resource.url;
        }

        if (originalString) {
          const url = new URL(originalString, window.location.href.replace(/\/$/, '/'));
          const isWs = url.protocol === 'ws:' || url.protocol === 'wss:';
          const sameOrigin = url.host === window.location.host;

          if (sameOrigin) {
            if (url.searchParams.get('ns') === '') url.searchParams.delete('ns');
            if (url.searchParams.get('widgetToken') === '') url.searchParams.delete('widgetToken');

            const isNamespacedWs = isWs && url.searchParams.has('ns');

            if (isNamespacedWs) {
              url.searchParams.delete('widgetToken');
            }

            if (!isNamespacedWs && normalizedToken && !url.searchParams.has('widgetToken')) {
              url.searchParams.set('widgetToken', normalizedToken);
            }

            if (typeof resource === 'string') {
              resource = isWs ? url.toString() : `${url.pathname}${url.search}`;
            } else if (resource && typeof resource.url === 'string') {
              resource = url.toString();
            }
          }
        }
      } catch {}

      return new OriginalWebSocket(resource, protocols);
    };

    patchedWebSocket.prototype = OriginalWebSocket.prototype;
    try {
      Object.setPrototypeOf(patchedWebSocket, OriginalWebSocket);
    } catch {}

    window.WebSocket = patchedWebSocket;
    window.__GETTY_WS_PATCHED__ = true;
  }
}


function persistWidgetToken(widgetToken) {
  if (!widgetToken) return;
  try {
    const url = new URL(window.location.href);
    const pathMatch = url.pathname.match(/^\/user\/([A-Za-z0-9_-]{12,120})/);
    if (pathMatch && pathMatch[1]) {
      if (url.searchParams.has('widgetToken')) {
        url.searchParams.delete('widgetToken');
        const cleaned = url.pathname + (url.search ? url.search : '') + url.hash;
        window.history.replaceState({}, document.title, cleaned);
      }
      return;
    }
    if (url.searchParams.get('widgetToken') === widgetToken) return;
    url.searchParams.set('widgetToken', widgetToken);
    window.history.replaceState({}, document.title, url.toString());
  } catch {}
}

async function bootstrapDashboard() {
  const root = document.getElementById('app-root');
  if (!root) {
    console.error('[dashboard] Missing #app-root container');
    return;
  }

  document.body.classList.add('landing', 'user-dashboard-mode');

  let bootstrap = window.__GETTY_DASHBOARD_BOOTSTRAP__ || {};
  const bootstrapSource = document.getElementById('dashboard-bootstrap');
  if (bootstrapSource) {
    try {
      const raw = bootstrapSource.textContent || bootstrapSource.innerText || '';
      if (raw.trim()) {
        bootstrap = JSON.parse(raw);
        window.__GETTY_DASHBOARD_BOOTSTRAP__ = bootstrap;
      }
    } catch (err) {
      console.warn('[dashboard] Failed to parse bootstrap payload', err);
    }
  }
  const widgetToken = typeof bootstrap.widgetToken === 'string' ? bootstrap.widgetToken : '';

  if (widgetToken) {
    root.dataset.widgetToken = widgetToken;
    window.__GETTY_WIDGET_TOKEN__ = widgetToken;
    persistWidgetToken(widgetToken);
    setupWidgetTokenAdapters(widgetToken);
  }

  try {
    if (bootstrap.preferredLanguage && !localStorage.getItem('lang')) {
      localStorage.setItem('lang', bootstrap.preferredLanguage);
    }
  } catch {}
}

bootstrapDashboard();
