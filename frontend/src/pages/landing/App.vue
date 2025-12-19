<script setup lang="ts">
import { onMounted, onUnmounted, nextTick, onBeforeUnmount } from 'vue';
import { useTheme } from '../../composables/useTheme';
import { useLanguage } from '../../composables/useLanguage';
// @ts-ignore
import { applyBaseSeo } from '../../head/baseSeo.js';
import odyseeLogoUrl from '../../assets/odysee.svg?url';
import GettyFooter from 'shared/components/GettyFooter.vue';

const { isDark, toggleTheme } = useTheme();
const { currentLang, isMenuOpen, setLanguage, toggleMenu, closeMenu } = useLanguage();

const assetPaths = {
  odysee: odyseeLogoUrl,
  favicon: '/favicon.ico',
};

const bodyClasses = [
  'landing',
  'bg-background',
  'text-gray-100',
  'font-sans',
  'w-full',
  'm-0',
  'p-0',
  'min-h-screen',
];
let restoreSeo: any = null;

function handleClickOutside(event: MouseEvent) {
  const wrapper = document.getElementById('lang-picker-wrapper');
  if (wrapper && !wrapper.contains(event.target as Node)) {
    closeMenu();
  }
}

function triggerLogin() {
  const btn = document.getElementById('public-wallet-login');
  if (btn) btn.click();
}

function notifyLegacyBridge() {
  const root = document.getElementById('app');
  window.dispatchEvent(
    new CustomEvent('getty-landing-vue-ready', {
      detail: { root },
    })
  );
  if (typeof (window as any).__GETTY_LANDING_VUE_READY__ === 'function') {
    try {
      (window as any).__GETTY_LANDING_VUE_READY__();
    } catch (error) {
      console.warn('[landing] failed to notify legacy bridge', error);
    }
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  restoreSeo = applyBaseSeo();
  document.documentElement.classList.add('bg-background');
  bodyClasses.forEach((className) => {
    if (!document.body.classList.contains(className)) {
      document.body.classList.add(className);
    }
  });
  nextTick(() => {
    notifyLegacyBridge();
  });
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  document.documentElement.classList.remove('bg-background');
  bodyClasses.forEach((className) => {
    document.body.classList.remove(className);
  });
  if (typeof restoreSeo === 'function') {
    restoreSeo();
    restoreSeo = null;
  }
});
</script>

<template>
  <a
    href="#main-content"
    class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-card text-white rounded px-3 py-2">
    Skip to main content
  </a>
  <div class="max-w-7xl mx-auto px-6 pb-16">
    <header
      class="os-header flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border py-4">
      <div class="flex items-center gap-3 w-full">
        <a href="/" class="logo-link" aria-label="getty home">
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
        <div class="connection-status ml-auto" title="Wallet connection status">
          <span class="status-dot disconnected"></span>
        </div>
        <button
          id="public-wallet-login"
          class="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm hover:bg-card transition-colors"
          data-state="logged-out">
          <i class="pi pi-user text-[16px] leading-none" aria-hidden="true"></i>
          <span class="btn-label" data-i18n="walletLogin" data-default-label="Login"></span>
        </button>
        <div class="relative" id="lang-picker-wrapper">
          <button
            type="button"
            class="pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm hover:bg-card transition-colors"
            aria-haspopup="true"
            :aria-expanded="isMenuOpen"
            aria-controls="lang-menu"
            title="Language"
            @click.stop="toggleMenu">
            <svg
              viewBox="0 0 24 24"
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M2 12h20"></path>
              <path
                d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"></path>
            </svg>
            <span class="font-medium">{{ currentLang.toUpperCase() }}</span>
            <svg
              viewBox="0 0 24 24"
              class="w-4 h-4 opacity-70"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true">
              <path d="m6 9 6 6 6-6"></path>
            </svg>
          </button>
          <div
            v-show="isMenuOpen"
            class="absolute right-0 mt-2 w-44 bg-card border border-border rounded-xl shadow-lg p-2 z-50"
            role="menu">
            <p
              class="px-2 py-1 text-xs uppercase tracking-wide text-[var(--text-secondary)]"
              data-i18n="languageLabel"></p>
            <ul class="space-y-1">
              <li>
                <button
                  type="button"
                  class="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-[var(--bg-chat)]"
                  role="menuitem"
                  data-i18n="languageEnglish"
                  @click="
                    setLanguage('en');
                    closeMenu();
                  "></button>
              </li>
              <li>
                <button
                  type="button"
                  class="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-[var(--bg-chat)]"
                  role="menuitem"
                  data-i18n="languageSpanish"
                  @click="
                    setLanguage('es');
                    closeMenu();
                  "></button>
              </li>
            </ul>
          </div>
        </div>
        <button
          class="theme-toggle"
          title="Toggle theme"
          :aria-pressed="isDark"
          aria-label="Toggle dark mode"
          @click="toggleTheme">
          <svg class="sun-icon" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,2L14.39,5.42C13.65,5.15 12.84,5 12,5C11.16,5 10.35,5.15 9.61,5.42L12,2M3.34,7L7.5,6.65C6.9,7.16 6.36,7.78 5.94,8.5C5.52,9.22 5.25,10 5.11,10.79L3.34,7M3.36,17L5.12,13.23C5.26,14 5.53,14.78 5.95,15.5C6.37,16.22 6.91,16.84 7.51,17.35L3.36,17M20.65,7L18.88,10.77C18.74,10 18.47,9.22 18.05,8.5C17.63,7.78 17.09,7.16 16.49,6.65L20.65,7M20.64,17L16.5,17.35C17.1,16.84 17.64,16.22 18.06,15.5C18.48,14.78 18.75,14 18.89,13.21L20.64,17M12,22L9.59,18.56C10.33,18.83 11.14,19 12,19C12.86,19 13.67,18.83 14.41,18.56L12,22Z" />
          </svg>
          <svg class="moon-icon" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,11L19.61,12.25L20.2,14.23L18.5,13.06L16.8,14.23L17.39,12.25L15.75,11L17.81,10.95L18.5,9L19.19,10.95L21.25,11M18.97,15.95C19.8,15.87 20.69,17.05 20.16,17.8C19.84,18.25 19.5,18.67 19.08,19.07C15.17,23 8.84,23 4.94,19.07C1.03,15.17 1.03,8.83 4.94,4.93C5.34,4.53 5.76,4.17 6.21,3.85C6.96,3.32 8.14,4.21 8.06,5.04C7.79,7.9 8.75,10.87 10.95,13.06C13.14,15.26 16.1,16.22 18.97,15.95M17.33,17.97C14.5,17.81 11.7,16.64 9.53,14.5C7.36,12.31 6.2,9.5 6.04,6.68C3.23,9.82 3.34,14.4 6.35,17.41C9.37,20.43 14,20.54 17.33,17.97Z" />
          </svg>
        </button>
      </div>
    </header>

    <main id="main-content" class="mt-8 space-y-8" role="main">
      <div
        id="landing-session-status"
        class="hidden mt-6 rounded-xl border border-[#553fee]/30 bg-[#553fee] px-3 py-3 text-sm text-[#ffffff]"
        role="alert"></div>
      <section class="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:items-center">
        <div class="space-y-6">
          <span
            class="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            <span class="h-2 w-2 rounded-full bg-[#f1226e]"></span>
            <span data-i18n="landingHeroBadge"></span>
          </span>
          <h1
            class="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl"
            data-i18n="landingHeroTitle"></h1>
          <p
            class="text-base text-[var(--text-secondary)] sm:text-lg"
            data-i18n="landingHeroSubtitle"></p>
          <div class="flex flex-wrap gap-3">
            <button
              id="public-wallet-login-hero"
              class="inline-flex items-center gap-2 rounded-xl bg-[#553fee] px-5 py-3 text-sm font-semibold !text-white shadow transition hover:bg-[#111111]"
              data-i18n="landingHeroCTA"
              @click="triggerLogin"></button>
            <a
              href="#features"
              class="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-semibold transition hover:bg-card">
              <span data-i18n="landingHeroSecondary"></span>
              <svg
                viewBox="0 0 24 24"
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </a>
            <a
              href="https://getty.sh/en/guide/intro/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="See documentation"
              class="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-semibold transition hover:bg-card">
              <span>Docs</span>
              <svg
                viewBox="0 0 24 24"
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </a>
          </div>
          <div class="flex flex-wrap items-center gap-6 text-xs text-[var(--text-secondary)]">
            <div
              class="flex items-center gap-1 rounded-xl border border-border bg-card/40 px-3 py-3">
              <span
                class="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-color,#2563eb)]/20 text-[var(--accent-color,#2563eb)]">
                <i class="pi pi-check text-[20px] leading-none" aria-hidden="true"></i>
              </span>
              <div>
                <p class="font-semibold text-white" data-i18n="landingHeroStatOne"></p>
                <p data-i18n="landingHeroStatTwo"></p>
              </div>
            </div>
            <div
              class="flex items-center gap-1 rounded-xl border border-border bg-card/40 px-3 py-3">
              <span
                class="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-color,#2563eb)]/20 text-[var(--accent-color,#2563eb)]">
                <i class="pi pi-dollar text-[20px] leading-none" aria-hidden="true"></i>
              </span>
              <div>
                <p class="font-semibold text-white" data-i18n="landingHeroStatThree"></p>
                <p data-i18n="landingHeroStatFour"></p>
              </div>
            </div>
          </div>
        </div>
        <div class="relative">
          <div
            class="relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-lg">
            <div
              class="mb-4 flex items-center justify-between text-xs text-[var(--text-secondary)]">
              <span class="font-bold" data-i18n="landingPreviewLabel"></span>
              <div class="flex gap-1">
                <span class="h-3 w-3 rounded-full bg-[rgb(85,63,238)]"></span>
                <span class="h-3 w-3 rounded-full bg-[rgb(53,53,53)]"></span>
                <span class="h-3 w-3 rounded-full bg-[rgb(52,211,153)]"></span>
              </div>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <article class="os-card p-4">
                <h3
                  class="os-panel-title text-xl font-bold pl-0"
                  data-i18n="landingPreviewLastTip"></h3>
                <p
                  class="mt-3 text-1xl font-semibold text-white"
                  data-i18n="landingPreviewLastTipExample"></p>
                <p
                  class="mt-1 text-xs text-[var(--text-secondary)]"
                  data-i18n="landingPreviewLastTipSub"></p>
              </article>
              <article class="os-card p-4">
                <h3
                  class="os-panel-title text-xl font-bold pl-0"
                  data-i18n="landingPreviewGoal"></h3>
                <div class="mt-3">
                  <div class="h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div class="h-full w-[68%] rounded-full bg-[rgb(52,211,153)]"></div>
                  </div>
                  <p class="mt-2 text-xs text-[var(--text-secondary)]">68% • 68 / 100 USD</p>
                  <p
                    class="mt-2 text-xs text-[var(--text-secondary)]"
                    data-i18n="landingPreviewGoalThanks"></p>
                </div>
              </article>
              <article class="os-card p-4 sm:col-span-2">
                <h3
                  class="os-panel-title text-xl font-bold pl-0"
                  data-i18n="landingPreviewChat"></h3>
                <p
                  class="mt-3 text-sm text-[var(--text-secondary)]"
                  data-i18n="landingPreviewChatSub"></p>
                <div
                  class="mt-4 space-y-2 rounded-xl border border-border bg-card/40 p-3 text-xs text-[var(--text-secondary)]">
                  <div class="font-bold flex items-center justify-between text-white">
                    <span>@spaceman:2</span>
                    <span
                      class="font-bold text-[12px] text-[#553fee] inline-flex items-center gap-1">
                      <span
                        class="inline-flex h-4 w-4 items-center justify-center rounded-full overflow-hidden">
                        <img
                          :src="assetPaths.odysee"
                          alt=""
                          class="h-full w-full object-cover"
                          loading="lazy"
                          decoding="async" />
                      </span>
                      <span>Tip: $6.5 (AR)</span>
                    </span>
                  </div>
                  <p class="text-sm text-white" data-i18n="landingPreviewChatQuote"></p>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section id="marquee-section" class="py-0">
        <h2 class="text-2xl font-bold text-white text-center mb-8" data-i18n="marqueeTitle"></h2>
        <div class="marquee-container overflow-hidden relative">
          <div class="marquee-content" id="marquee-content"></div>
        </div>
      </section>

      <section id="features" class="space-y-8">
        <div class="max-w-3xl space-y-4">
          <h2 class="text-2xl font-bold text-white" data-i18n="landingFeaturesTitle"></h2>
          <p class="text-[var(--text-secondary)]" data-i18n="landingFeaturesCopy"></p>
        </div>
        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <article class="os-card flex h-full flex-col gap-4 p-5">
            <div
              class="feature-icon inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[rgb(38,38,38)]"
              aria-hidden="true">
              <i class="pi pi-sparkles text-[20px] leading-none" aria-hidden="true"></i>
            </div>
            <h3 class="text-lg font-semibold text-white" data-i18n="landingFeatureLastTip"></h3>
            <p
              class="text-sm text-[var(--text-secondary)]"
              data-i18n="landingFeatureLastTipCopy"></p>
          </article>
          <article class="os-card flex h-full flex-col gap-4 p-5">
            <div
              class="feature-icon inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[rgb(27,217,154)]"
              aria-hidden="true">
              <i class="pi pi-flag text-[20px] leading-none" aria-hidden="true"></i>
            </div>
            <h3 class="text-lg font-semibold text-white" data-i18n="landingFeatureGoals"></h3>
            <p class="text-sm text-[var(--text-secondary)]" data-i18n="landingFeatureGoalsCopy"></p>
          </article>
          <article class="os-card flex h-full flex-col gap-4 p-5">
            <div
              class="feature-icon inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[rgb(255,204,51)]"
              aria-hidden="true">
              <i class="pi pi-microphone text-[20px] leading-none" aria-hidden="true"></i>
            </div>
            <h3 class="text-lg font-semibold text-white" data-i18n="landingFeatureTTS"></h3>
            <p class="text-sm text-[var(--text-secondary)]" data-i18n="landingFeatureTTSCopy"></p>
          </article>
          <article class="os-card flex h-full flex-col gap-4 p-5">
            <div
              class="feature-icon inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[rgb(85,63,238)]"
              aria-hidden="true">
              <i class="pi pi-comments text-[20px] leading-none" aria-hidden="true"></i>
            </div>
            <h3 class="text-lg font-semibold text-white" data-i18n="landingFeatureChat"></h3>
            <p class="text-sm text-[var(--text-secondary)]" data-i18n="landingFeatureChatCopy"></p>
          </article>
          <article class="os-card flex h-full flex-col gap-4 p-5">
            <div
              class="feature-icon inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[rgb(53,141,255)]"
              aria-hidden="true">
              <i class="pi pi-chart-line text-[20px] leading-none" aria-hidden="true"></i>
            </div>
            <h3 class="text-lg font-semibold text-white" data-i18n="landingFeatureAnalytics"></h3>
            <p
              class="text-sm text-[var(--text-secondary)]"
              data-i18n="landingFeatureAnalyticsCopy"></p>
          </article>
          <article class="os-card flex h-full flex-col gap-4 p-5">
            <div
              class="feature-icon inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[rgb(239,68,84)]"
              aria-hidden="true">
              <i class="pi pi-megaphone text-[20px] leading-none" aria-hidden="true"></i>
            </div>
            <h3 class="text-lg font-semibold text-white" data-i18n="landingFeatureAutomation"></h3>
            <p
              class="text-sm text-[var(--text-secondary)]"
              data-i18n="landingFeatureAutomationCopy"></p>
          </article>
        </div>
      </section>

      <section id="widgets" class="grid gap-6 lg:grid-cols-[1fr_1.2fr] lg:items-center">
        <div class="space-y-4">
          <h2 class="text-2xl font-bold text-white" data-i18n="landingWidgetsTitle"></h2>
          <p class="text-[var(--text-secondary)]" data-i18n="landingWidgetsCopy"></p>
          <ul class="space-y-3 text-sm text-[var(--text-secondary)]">
            <li class="flex items-center gap-2">
              <span
                class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#111111] text-[#ffffff] dark:bg-[#ffffff] dark:text-[#111111]">
                1
              </span>
              <span data-i18n="landingWidgetsStepOne"></span>
            </li>
            <li class="flex items-center gap-2">
              <span
                class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#111111] text-[#ffffff] dark:bg-[#ffffff] dark:text-[#111111]">
                2
              </span>
              <span data-i18n="landingWidgetsStepTwo"></span>
            </li>
            <li class="flex items-center gap-2">
              <span
                class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#111111] text-[#ffffff] dark:bg-[#ffffff] dark:text-[#111111]">
                3
              </span>
              <span data-i18n="landingWidgetsStepThree"></span>
            </li>
          </ul>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <article
            class="os-card flex h-full flex-col justify-between rounded-xl border border-border bg-card p-5">
            <div class="space-y-3">
              <h3 class="text-lg font-semibold text-white flex items-center gap-2">
                <span class="card-title-icon icon-tip-notification" aria-hidden="true">
                  <i class="pi pi-bell"></i>
                </span>
                <span data-i18n="landingWidgetTipNotificationTitle"></span>
              </h3>
              <p
                class="text-sm text-[var(--text-secondary)]"
                data-i18n="landingWidgetTipNotificationCopy"></p>
            </div>
            <span
              class="mt-6 inline-flex w-max items-center gap-2 rounded-full bg-black/10 dark:bg-white/10 px-3 py-1 text-xs tracking-wide">
              <span class="h-2 w-2 rounded-full bg-emerald-400"></span>
              <span data-i18n="landingWidgetRealtime"></span>
            </span>
          </article>
          <article
            class="os-card flex h-full flex-col justify-between rounded-xl border border-border bg-card p-5">
            <div class="space-y-3">
              <h3 class="text-lg font-semibold text-white flex items-center gap-2">
                <span class="card-title-icon icon-tip-goal" aria-hidden="true">
                  <i class="pi pi-bullseye"></i>
                </span>
                <span data-i18n="landingWidgetTipGoalTitle"></span>
              </h3>
              <p
                class="text-sm text-[var(--text-secondary)]"
                data-i18n="landingWidgetTipGoalCopy"></p>
            </div>
            <span
              class="mt-6 inline-flex w-max items-center gap-2 rounded-full bg-black/10 dark:bg-white/10 px-3 py-1 text-xs tracking-wide">
              <span class="h-2 w-2 rounded-full bg-sky-400"></span>
              <span data-i18n="landingWidgetSynced"></span>
            </span>
          </article>
          <article
            class="os-card flex h-full flex-col justify-between rounded-xl border border-border bg-card p-5 sm:col-span-2">
            <div class="space-y-3">
              <h3 class="text-lg font-semibold text-white flex items-center gap-2">
                <span class="card-title-icon icon-giveaways" aria-hidden="true">
                  <i class="pi pi-gift"></i>
                </span>
                <span data-i18n="landingGiveawaysTitle"></span>
              </h3>
              <p class="text-sm text-[var(--text-secondary)]" data-i18n="landingGiveawaysCopy"></p>
            </div>
            <div class="mt-6 flex flex-wrap gap-3 text-xs text-[var(--text-secondary)]">
              <span
                class="rounded-full bg-black/10 dark:bg-white/10 px-3 py-1 inline-flex items-center gap-2">
                <span class="h-2 w-2 rounded-full bg-emerald-400"></span>
                <span data-i18n="landingGiveawaysStepOne"></span>
              </span>
              <span
                class="rounded-full bg-black/10 dark:bg-white/10 px-3 py-1 inline-flex items-center gap-2">
                <span class="h-2 w-2 rounded-full bg-sky-400"></span>
                <span data-i18n="landingGiveawaysStepTwo"></span>
              </span>
              <span
                class="rounded-full bg-black/10 dark:bg-white/10 px-3 py-1 inline-flex items-center gap-2">
                <span class="h-2 w-2 rounded-full bg-amber-400"></span>
                <span data-i18n="landingGiveawaysStepThree"></span>
              </span>
            </div>
          </article>
        </div>
      </section>

      <section id="automation" class="rounded-xl border border-border bg-card/40 p-8 sm:p-8">
        <div class="grid gap-8 sm:grid-cols-2 sm:items-center">
          <div class="space-y-4">
            <span
              class="inline-flex items-center gap-2 rounded-full bg-[rgb(248,250,252)] dark:bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide"
              data-i18n="landingAutomationBadge"></span>
            <h2 class="text-2xl font-bold" data-i18n="landingAutomationTitle"></h2>
            <p class="text-[var(--text-secondary)]" data-i18n="landingAutomationCopy"></p>
            <ul class="space-y-3 text-sm text-[var(--text-secondary)]">
              <li class="flex items-center gap-2">
                <svg
                  viewBox="0 0 24 24"
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <span data-i18n="landingAutomationItemOne"></span>
              </li>
              <li class="flex items-center gap-2">
                <svg
                  viewBox="0 0 24 24"
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <span data-i18n="landingAutomationItemTwo"></span>
              </li>
              <li class="flex items-center gap-2">
                <svg
                  viewBox="0 0 24 24"
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <span data-i18n="landingAutomationItemThree"></span>
              </li>
            </ul>
          </div>
          <div
            class="relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-lg">
            <div class="space-y-4">
              <div class="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                <span class="automation-panel-title" data-i18n="landingAutomationPanelTitle"></span>
                <span
                  class="rounded-full border border-border px-2 py-1"
                  data-i18n="landingAutomationSecure"></span>
              </div>
              <ol class="space-y-4 text-sm">
                <li class="rounded-xl border border-border bg-card/30 p-4 automation-step">
                  <span class="card-title-icon icon-chat-activity" aria-hidden="true">
                    <i class="pi pi-comments"></i>
                  </span>
                  <div class="automation-step-content">
                    <p class="automation-step-label" data-i18n="landingAutomationStepOneLabel"></p>
                    <p class="automation-step-copy" data-i18n="landingAutomationStepOne"></p>
                  </div>
                </li>
                <li class="rounded-xl border border-border bg-card/30 p-4 automation-step">
                  <span class="card-title-icon icon-live-stream" aria-hidden="true">
                    <i class="pi pi-video"></i>
                  </span>
                  <div class="automation-step-content">
                    <p class="automation-step-label" data-i18n="landingAutomationStepTwoLabel"></p>
                    <p class="automation-step-copy" data-i18n="landingAutomationStepTwo"></p>
                  </div>
                </li>
                <li class="rounded-xl border border-border bg-card/30 p-4 automation-step">
                  <span class="card-title-icon icon-tips-community" aria-hidden="true">
                    <i class="pi pi-users"></i>
                  </span>
                  <div class="automation-step-content">
                    <p
                      class="automation-step-label"
                      data-i18n="landingAutomationStepThreeLabel"></p>
                    <p class="automation-step-copy" data-i18n="landingAutomationStepThree"></p>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>
    </main>

    <GettyFooter />
  </div>
</template>

<style>
body.landing {
  --text-secondary: #171717;
}

.dark body.landing,
body.landing.dark {
  --text-secondary: #f9f9f9;
}

.feature-icon {
  color: #ffffff !important;
}

.automation-panel-title {
  font-weight: 600;
  font-size: 1rem;
  line-height: 1.4;
}

.automation-step {
  display: grid;
  grid-template-columns: 32px 1fr;
  column-gap: 0.75rem;
  align-items: start;
}

.automation-step-label {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
}

.automation-step-copy {
  font-size: 0.9rem;
  line-height: 1.15;
  margin: 0;
}

.automation-step-content {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.card-title-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 9999px;
  font-size: 0;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.card-title-icon i {
  font-size: 15px;
}

body.landing .icon-tip-notification {
  background: rgb(241, 34, 110);
  color: #ffffff;
}

.dark body.landing .icon-tip-notification,
body.landing.dark .icon-tip-notification {
  background: rgb(241, 34, 110);
  color: #ffffff;
}

body.landing .icon-tip-goal {
  background: rgb(27, 217, 154);
  color: #ffffff;
}

.dark body.landing .icon-tip-goal,
body.landing.dark .icon-tip-goal {
  background: rgb(27, 217, 154);
  color: #ffffff;
}

body.landing .icon-giveaways {
  background: rgb(250, 204, 21);
  color: #ffffff;
}

.dark body.landing .icon-giveaways,
body.landing.dark .icon-giveaways {
  background: rgb(250, 204, 21);
  color: #ffffff;
}

body.landing .icon-chat-activity {
  background: rgb(85, 63, 238);
  color: #ffffff;
}

.dark body.landing .icon-chat-activity,
body.landing.dark .icon-chat-activity {
  background: rgb(85, 63, 238);
  color: #ffffff;
}

body.landing .icon-live-stream {
  background: rgb(239, 68, 68);
  color: #ffffff;
}

.dark body.landing .icon-live-stream,
body.landing.dark .icon-live-stream {
  background: rgb(239, 68, 68);
  color: #ffffff;
}

body.landing .icon-tips-community {
  background: rgb(20, 184, 166);
  color: #ffffff;
}

.dark body.landing .icon-tips-community,
body.landing.dark .icon-tips-community {
  background: rgb(20, 184, 166);
  color: #ffffff;
}

body.landing .automation-step-label,
body.landing .automation-step-copy {
  color: #171717;
}

.dark body.landing .automation-step-label,
body.landing.dark .automation-step-label,
.dark body.landing .automation-step-copy,
body.landing.dark .automation-step-copy {
  color: #f9f9f9;
}
</style>
