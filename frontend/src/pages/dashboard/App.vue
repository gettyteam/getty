<template>
  <div class="dashboard-page min-h-screen flex flex-col">
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-card text-white rounded px-3 py-2"
      data-i18n="dashboardSkipToMain">
      Skip to main content
    </a>
    <div class="max-w-7xl mx-auto p-3 w-full flex-1">
      <header class="os-header flex justify-between items-center pb-5 mb-8 border-b border-border">
        <div class="flex items-center gap-4">
          <a href="/" class="logo-link" aria-label="getty home" data-i18n-aria="dashboardHome">
            <img
              src="https://aqet2p7rnwvvcvraawg2ojq7sfyals6jav2dh6vm7occr347kfsa.arweave.net/BAk9P_Ftq1FWIAWNpyYfkXAFy8kFdDP6rPuEKO-fUWQ"
              alt="getty"
              class="h-10 w-auto dark-logo"
              decoding="async"
              fetchpriority="high"
              height="40" />
            <img
              src="https://xc43575rqmogbtegwxry2rk4hkctslkb63os6y2cdq25nfkgmguq.arweave.net/uLm-_7GDHGDMhrXjjUVcOoU5LUH23S9jQhw11pVGYak"
              alt="getty"
              class="h-10 w-auto light-logo"
              decoding="async"
              height="40" />
          </a>
          <div
            id="user-welcome-message"
            class="hidden text-sm text-gray-300"
            data-i18n="dashboardWelcome"></div>
        </div>
        <div class="flex items-center gap-3">
          <div
            class="connection-status"
            title="Wallet connection status"
            data-i18n-title="walletConnectionStatus">
            <span
              class="status-dot"
              :class="store.isConnected ? 'connected' : 'disconnected'"></span>
          </div>
          <button
            id="public-wallet-login"
            class="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm hover:bg-card transition-colors"
            data-state="logged-out">
            <i class="pi pi-user text-[16px] leading-none" aria-hidden="true"></i>
            <span class="btn-label" data-i18n="walletLogin" data-default-label="Login"></span>
            <span class="balance-label hidden text-xs font-mono" id="login-balance"></span>
          </button>
          <button
            id="open-admin"
            class="hidden px-3 py-2 rounded-lg border border-border text-sm hover:bg-card transition-colors"
            data-visible="false"
            data-i18n="dashboardAdmin"></button>
          <button
            id="logout-inline"
            class="hidden px-3 py-2 rounded-lg border border-border text-sm hover:bg-card transition-colors"
            data-visible="false"
            title="Logout"
            aria-label="Logout"
            data-i18n-title="walletLogout"
            data-i18n-aria="walletLogout">
            <span data-i18n="walletLogout"></span>
          </button>
          <button
            class="theme-toggle"
            title="Toggle theme"
            :aria-pressed="isDark"
            aria-label="Toggle dark mode"
            @click="toggleTheme"
            data-i18n-title="dashboardToggleTheme"
            data-i18n-aria="dashboardToggleDark">
            <svg class="sun-icon" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,2L14.39,5.42C13.65,5.15 12.84,5 12,5C11.16,5 10.35,5.15 9.61,5.42L12,2M3.34,7L7.5,6.65C6.9,7.16 6.36,7.78 5.94,8.5C5.52,9.22 5.25,10 5.11,10.79L3.34,7M3.36,17L5.12,13.23C5.26,14 5.53,14.78 5.95,15.5C6.37,16.22 6.91,16.84 7.51,17.35L3.36,17M20.65,7L18.88,10.77C18.74,10 18.47,9.22 18.05,8.5C17.63,7.78 17.09,7.16 16.49,6.65L20.65,7M20.64,17L16.5,17.35C17.1,16.84 17.64,16.22 18.06,15.5C18.48,14.78 18.75,14 18.89,13.21L20.64,17M12,22L9.59,18.56C10.33,18.83 11.14,19 12,19C12.86,19 13.67,18.83 14.41,18.56L12,22Z"></path>
            </svg>
            <svg class="moon-icon" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,11L19.61,12.25L20.2,14.23L18.5,13.06L16.8,14.23L17.39,12.25L15.75,11L17.81,10.95L18.5,9L19.19,10.95L21.25,11M18.97,15.95C19.8,15.87 20.69,17.05 20.16,17.8C19.84,18.25 19.5,18.67 19.08,19.07C15.17,23 8.84,23 4.94,19.07C1.03,15.17 1.03,8.83 4.94,4.93C5.34,4.53 5.76,4.17 6.21,3.85C6.96,3.32 8.14,4.21 8.06,5.04C7.79,7.9 8.75,10.87 10.95,13.06C13.14,15.26 16.1,16.22 18.97,15.95M17.33,17.97C14.5,17.81 11.7,16.64 9.53,14.5C7.36,12.31 6.2,9.5 6.04,6.68C3.23,9.82 3.34,14.4 6.35,17.41C9.37,20.43 14,20.54 17.33,17.97Z"></path>
            </svg>
          </button>
        </div>
      </header>

      <main
        id="main-content"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8 user-dashboard-grid"
        role="main">
        <div
          v-if="loadingStatus"
          class="col-span-1 md:col-span-2 lg:col-span-3 flex justify-center py-12">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
        <div v-else-if="isGlobalBlocked" class="col-span-1 md:col-span-2 lg:col-span-3">
          <BlockedState module-name="All Modules" />
        </div>
        <template v-else>
          <LastTipWidget :is-blocked="modulesStatus.lastTip?.blocked" />
          <TipGoalWidget :is-blocked="modulesStatus.tipGoal?.blocked" />
          <NotificationWidget :is-blocked="modulesStatus.externalNotifications?.blocked" />
          <ChatWidget :is-blocked="modulesStatus.chat?.blocked" />
          <RaffleWidget :is-blocked="modulesStatus.raffle?.blocked" />
          <AchievementsWidget :is-blocked="modulesStatus.achievements?.blocked" />
        </template>
      </main>
    </div>
    <DashboardFooter />
    <noscript>
      <div class="max-w-7xl mx-auto p-3 text-center text-sm text-gray-300">
        JavaScript is required for widgets to load.
      </div>
    </noscript>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, nextTick, watch } from 'vue';
import AchievementsWidget from './components/AchievementsWidget.vue';
import BlockedState from './components/BlockedState.vue';
import ChatWidget from './components/ChatWidget.vue';
import DashboardFooter from './components/DashboardFooter.vue';
import LastTipWidget from './components/LastTipWidget.vue';
import NotificationWidget from './components/NotificationWidget.vue';
import RaffleWidget from './components/RaffleWidget.vue';
import TipGoalWidget from './components/TipGoalWidget.vue';
import { useWidgetStore } from '../../stores/widgetStore';
import { useTheme } from '../../composables/useTheme';
import languageManager, { i18nTrigger } from './languageManager';

const store = useWidgetStore();
const { isDark, toggleTheme } = useTheme();

const bodyClasses = [
  'bg-background',
  'text-gray-100',
  'font-sans',
  'user-dashboard-mode',
  'landing',
  'min-h-screen',
  'w-full',
  'm-0',
  'p-0',
];

const modulesStatus = ref({});
const loadingStatus = ref(true);
const isTenantSuspended = ref(false);

const isGlobalBlocked = computed(() => {
  if (isTenantSuspended.value) return true;

  const keys = [
    'announcement',
    'socialmedia',
    'tipGoal',
    'lastTip',
    'raffle',
    'achievements',
    'chat',
    'liveviews',
    'externalNotifications',
  ];

  if (Object.keys(modulesStatus.value).length === 0) return false;

  const allBlocked = keys.every((key) => {
    const mod = modulesStatus.value[key];

    if (!mod) return false;
    return mod.blocked === true;
  });

  return allBlocked;
});

async function fetchModulesStatus() {
  try {
    let token = '';
    try {
      const urlObj = new URL(window.location.href);
      const match = urlObj.pathname.match(/^\/user\/([A-Za-z0-9_-]+)/);
      if (match) {
        token = match[1];
      }
    } catch (e) {
      console.warn('[dashboard] failed to parse url', e);
    }

    const url = token ? `/api/modules?widgetToken=${encodeURIComponent(token)}` : '/api/modules';

    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });
    if (res.ok) {
      const data = await res.json();
      modulesStatus.value = data || {};
    } else if (res.status === 403) {
      isTenantSuspended.value = true;
      console.warn('[dashboard] /api/modules returned 403, treating as suspended');
    } else if (res.status === 401) {
      console.warn('[dashboard] /api/modules returned', res.status);
    }
  } catch (e) {
    console.warn('[dashboard] failed to fetch module status', e);
  } finally {
    loadingStatus.value = false;

    await nextTick();

    languageManager.updatePageLanguage();

    setTimeout(() => {
      notifyLegacyBridge();
    }, 1000);
  }
}

function notifyLegacyBridge() {
  const root = document.getElementById('app-root');
  window.__GETTY_VUE_IS_READY = true;
  window.dispatchEvent(
    new CustomEvent('getty-dashboard-vue-ready', {
      detail: { root },
    })
  );
  if (typeof window.__GETTY_DASHBOARD_VUE_READY__ === 'function') {
    try {
      window.__GETTY_DASHBOARD_VUE_READY__();
    } catch (error) {
      console.warn('[dashboard] failed to notify legacy bridge', error);
    }
  }
}

onMounted(() => {
  bodyClasses.forEach((className) => {
    if (!document.body.classList.contains(className)) {
      document.body.classList.add(className);
    }
  });
  fetchModulesStatus();

  languageManager.updatePageLanguage();

  watch(i18nTrigger, () => {
    nextTick(() => {
      languageManager.updatePageLanguage();
    });
  });
});

onBeforeUnmount(() => {
  bodyClasses.forEach((className) => {
    document.body.classList.remove(className);
  });
});
</script>
