import { createApp, h } from 'vue';
import ChatActivityEffect from './ChatActivityEffect.vue';

export function mountChatActivityEffect(options = {}) {
  const mountId = 'getty-chat-activity-root';
  let host = document.getElementById(mountId);
  if (!host) {
    host = document.createElement('div');
    host.id = mountId;
    host.style.position = 'fixed';
    host.style.left = '0';
    host.style.top = '0';
    host.style.width = '0';
    host.style.height = '0';
    host.style.pointerEvents = 'none';
    document.body.appendChild(host);
  }

  const app = createApp({
    name: 'GettyChatActivityMount',
    render() {
      return h(ChatActivityEffect, {
        windowMs: options.windowMs,
        threshold: options.threshold,
        maxMessages: options.maxMessages,
        highlightDurationMs: options.highlightDurationMs,
        announce: !!options.announce,
        lang: options.lang || 'en',
      });
    },
  });

  app.mount(host);

  try {
    window.__gettyChatActivityMounted = true;
    window.__gettyChatActivityApp = app;
  } catch {}

  return app;
}
