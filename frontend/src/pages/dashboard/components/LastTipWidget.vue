<template>
  <section class="os-card overflow-hidden flex flex-col md:order-1 lg:order-1">
    <div class="flex-1 flex flex-col">
      <BlockedState v-if="isBlocked" module-name="Last Tip" />
      <div
        v-else
        id="last-donation"
        class="last-donation"
        :class="{ 'update-animation': animate }"
        :style="cssVars"
        role="status"
        aria-live="polite">
        <template v-if="!hasData">
          <div v-if="!didInit" class="skeleton p-3" data-skeleton="last-tip">
            <div class="skeleton-lg skeleton"></div>
            <div class="skeleton-line skeleton w-[60%]"></div>
            <div class="skeleton-line skeleton w-[40%]"></div>
          </div>

          <div
            v-else-if="!isTipConfigured"
            class="last-donation-empty bg-card dark:bg-neutral-950"
            :style="hasCustomBg ? { backgroundColor: 'var(--lt-bg)' } : undefined">
            <div class="text-sm text-muted-foreground font-semibold text-center mb-5">
              {{
                getI18nText(
                  'lastTipNotConfigured',
                  'No tips are configured. Set up your tips with your wallet address.'
                )
              }}
            </div>
            <img
              src="https://static.odycdn.com/stickers/TIPS/png/bite_$tip_closeup.png"
              alt=""
              class="h-[8.75rem] w-[8.75rem] max-w-full select-none object-contain"
              loading="lazy" />
          </div>

          <div v-else class="skeleton p-3" data-skeleton="last-tip">
            <div class="skeleton-lg skeleton"></div>
            <div class="skeleton-line skeleton w-[60%]"></div>
            <div class="skeleton-line skeleton w-[40%]"></div>
          </div>
        </template>

        <div
          v-else
          class="last-donation-content bg-card dark:bg-neutral-950"
          :style="hasCustomBg ? { backgroundColor: 'var(--lt-bg)' } : undefined">
          <div class="notification-text">
            <div class="lt-list" :class="{ 'is-scroll': shouldScroll }" role="list">
              <div
                v-for="(tip, idx) in tipsToShow"
                :key="tipKey(tip, idx)"
                class="lt-item"
                role="listitem">
                <div
                  class="notification-icon-lasttip"
                  :style="{ backgroundColor: iconBgFor(tip, idx) }">
                  <svg
                    width="100"
                    height="100"
                    viewBox="0 0 32 32"
                    fill="currentColor"
                    stroke="currentColor"
                    stroke-width="0.608"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true">
                    <g id="USDC_x2C__usd_coin">
                      <g>
                        <circle
                          cx="16"
                          cy="16"
                          r="14.5"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"></circle>
                      </g>
                      <g>
                        <g>
                          <path
                            d="M16,31C7.73,31,1,24.27,1,16S7.73,1,16,1s15,6.73,15,15S24.27,31,16,31z M16,2 C8.28,2,2,8.28,2,16s6.28,14,14,14s14-6.28,14-14S23.72,2,16,2z"></path>
                        </g>
                        <g>
                          <path
                            d="M17.22,21.5h-2.44c-1.53,0-2.78-1.25-2.78-2.78V18.5c0-0.28,0.22-0.5,0.5-0.5 s0.5,0.22,0.5,0.5v0.22c0,0.98,0.8,1.78,1.78,1.78h2.44c0.98,0,1.78-0.8,1.78-1.78c0-0.79-0.53-1.49-1.29-1.71l-3.69-1.05 C12.83,15.61,12,14.51,12,13.28c0-1.53,1.25-2.78,2.78-2.78h2.44c1.53,0,2.78,1.25,2.78,2.78v0.22c0,0.28-0.22,0.5-0.5,0.5 S19,13.78,19,13.5v-0.22c0-0.98-0.8-1.78-1.78-1.78h-2.44c-0.98,0-1.78,0.8-1.78,1.78c0,0.79,0.53,1.49,1.29,1.71l3.69,1.05 c1.19,0.34,2.02,1.44,2.02,2.67C20,20.25,18.75,21.5,17.22,21.5z"></path>
                        </g>
                        <g>
                          <path
                            d="M16,10.5c-0.28,0-0.5-0.22-0.5-0.5V7.22c0-0.28,0.22-0.5,0.5-0.5s0.5,0.22,0.5,0.5V10C16.5,10.28,16.28,10.5,16,10.5z"></path>
                        </g>
                        <g>
                          <path
                            d="M16,25.28c-0.28,0-0.5-0.22-0.5-0.5V22c0-0.28,0.22-0.5,0.5-0.5s0.5,0.22,0.5,0.5v2.78C16.5,25.05,16.28,25.28,16,25.28z"></path>
                        </g>
                      </g>
                    </g>
                  </svg>
                </div>
                <div class="lt-item-body">
                  <div class="lt-amount">
                    <span class="lt-ar-amount">{{ formatArAmount(tip?.amount) }}</span>
                    <span class="ar-symbol">AR</span>
                    <span class="usd-value">{{ formatUsdValue(tip) }}</span>
                  </div>
                  <div class="notification-from-lasttip">
                    {{ getI18nText('notificationFrom', 'From:') }} {{ fromDisplayFor(tip) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useWidgetStore } from '../../../stores/widgetStore';
import BlockedState from './BlockedState.vue';
// @ts-ignore
import { i18nTrigger } from '../languageManager';

defineProps({
  isBlocked: {
    type: Boolean,
    default: false,
  },
});

const store = useWidgetStore();
const animate = ref(false);
const didInit = ref(false);

const getI18nText = (key: string, fallback: string) => {
  i18nTrigger.value;
  if (
    (window as any).languageManager &&
    typeof (window as any).languageManager.getText === 'function'
  ) {
    return (window as any).languageManager.getText(key) || fallback;
  }
  return fallback;
};

const hasData = computed(
  () => !!store.lastTip || (Array.isArray(store.lastTips) && store.lastTips.length > 0)
);

const isTipConfigured = computed(() => {
  const wa = (store.lastTipConfig as any)?.walletAddress;
  return typeof wa === 'string' && !!wa.trim();
});

const VISIBLE_TIPS_BEFORE_SCROLL = 4;
const MAX_TIPS_TO_RENDER = 6;

const tipsToShow = computed<any[]>(() => {
  const arr = Array.isArray(store.lastTips) ? store.lastTips.filter(Boolean) : [];
  if (arr.length > 0) return arr.slice(0, MAX_TIPS_TO_RENDER);
  return store.lastTip ? [store.lastTip] : [];
});

const shouldScroll = computed(() => tipsToShow.value.length > VISIBLE_TIPS_BEFORE_SCROLL);

const formatArAmount = (value: any) => {
  const num = parseFloat(String(value ?? ''));
  if (!isFinite(num)) return '0.000';
  const truncated = Math.trunc(num * 1000) / 1000;
  return truncated.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
};

const formatUsdValue = (tip: any) => {
  const usdRaw = tip?.usd;
  const usdNum = typeof usdRaw === 'number' ? usdRaw : parseFloat(String(usdRaw ?? ''));
  if (isFinite(usdNum) && usdNum > 0) {
    return `≈ $${usdNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
  }

  if (!store.arPrice) return '';
  const arNum = parseFloat(String(tip?.amount ?? ''));
  if (!isFinite(arNum) || arNum <= 0) return '';
  const val = arNum * store.arPrice;
  return `≈ $${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
};

const fromDisplayFor = (tip: any) => {
  const name = typeof tip?.from === 'string' && tip.from.trim() ? tip.from.trim() : 'Anonymous';
  if (name.length <= 22) return name;
  return `${name.slice(0, 22)}…`;
};

const tipKey = (tip: any, idx: number) => {
  const from = typeof tip?.from === 'string' ? tip.from : '';
  const amount = tip?.amount != null ? String(tip.amount) : '';
  const ts = tip?.timestamp != null ? String(tip.timestamp) : '';
  return `${ts}|${from}|${amount}|${idx}`;
};

const iconPalette = [
  '#22c55e',
  '#3b82f6',
  '#a855f7',
  '#f97316',
  '#14b8a6',
  '#43cd76',
  '#eab308',
  '#ec4899',
];

const hashString = (input: string) => {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return h;
};

const iconBgFor = (tip: any, idx: number) => {
  const key = tipKey(tip, idx);
  const h = Math.abs(hashString(key));
  return iconPalette[h % iconPalette.length];
};

const cssVars = computed(() => {
  const c = store.lastTipConfig || {};

  const normalizeHex = (v: any) => (typeof v === 'string' ? v.trim().toLowerCase() : '');
  const isObsDefaultBg = normalizeHex((c as any).bgColor) === '#080c10';
  const isObsDefaultText = ['#ffffff', '#fff'].includes(normalizeHex((c as any).fontColor));

  const shouldUseCustomBg = !!c.bgColor && !isObsDefaultBg;

  return {
    '--lt-bg': shouldUseCustomBg ? c.bgColor : undefined,
    '--lt-border': c.borderColor || '#00ff7f',
    '--lt-text': !c.fontColor || isObsDefaultText ? 'var(--text-primary)' : c.fontColor,
    '--lt-amount': c.amountColor || 'var(--text-primary)',
    '--lt-icon-bg': c.iconBgColor || '#eaeaea',
    '--lt-from': c.fromColor || 'var(--text-secondary)',
  };
});

const hasCustomBg = computed(() => {
  const c = store.lastTipConfig || {};
  const normalizeHex = (v: any) => (typeof v === 'string' ? v.trim().toLowerCase() : '');
  const isObsDefaultBg = normalizeHex((c as any).bgColor) === '#080c10';
  return !!c.bgColor && !isObsDefaultBg;
});

watch(
  () => store.lastTip,
  () => {
    animate.value = false;
    setTimeout(() => {
      animate.value = true;
    }, 50);
  }
);

onMounted(() => {
  store.initWebSocket();
  Promise.resolve(store.fetchInitialData())
    .catch(() => {})
    .finally(() => {
      didInit.value = true;
    });
});
</script>

<style scoped>
.fade-in {
  animation: fadeIn 0.5s ease-in-out;
}
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
.update-animation {
  animation: pulse 1s;
}
@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
  100% {
    transform: scale(1);
  }
}

.last-donation {
  color: var(--lt-text, var(--text-primary));
  overflow: hidden;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.last-donation-content {
  padding: 0.4rem;
  display: flex;
  align-items: stretch;
  flex: 1;
  height: 100%;
  min-height: 0;
}

.last-donation-empty {
  padding: 0.4rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  flex: 1;
  height: 100%;
}

.notification-icon-lasttip {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 68px;
  height: 68px;
  min-width: 68px;
  min-height: 68px;
  border-radius: 0.25rem;
  background-color: var(--lt-icon-bg, #eaeaea);
  align-self: flex-start;
}

.notification-icon-lasttip svg {
  width: 50px;
  height: 50px;
  display: block;
  color: #fdfcfc;
}

.last-donation .notification-from-lasttip {
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  color: var(--lt-from, var(--text-secondary));
}

.notification-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.notification-amount {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--lt-amount, var(--text-primary));
}

.ar-symbol {
  color: var(--lt-amount, var(--text-primary));
  margin-left: 4px;
  font-size: 0.8em;
}

.usd-value {
  font-size: 1em;
  margin-left: 8px;
  font-weight: 600;
  color: var(--lt-text, var(--text-secondary));
}

.lt-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow-x: hidden;
  padding-right: 6px;
  overflow-y: hidden;
  flex: 1;
  min-height: 0;
  max-height: calc((76px * 4) + (0.75rem * 3));
}

.lt-list.is-scroll {
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  max-height: calc((76px * 4) + (0.75rem * 4) + 24px);
  -webkit-mask-image: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 1) 0%,
    rgba(0, 0, 0, 1) 78%,
    rgba(0, 0, 0, 0) 100%
  );
  mask-image: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 1) 0%,
    rgba(0, 0, 0, 1) 78%,
    rgba(0, 0, 0, 0) 100%
  );
}

.lt-list.is-scroll::-webkit-scrollbar {
  display: none;
}

.lt-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding-top: 0.35rem;
  min-height: 76px;
}

.lt-item + .lt-item {
  border-top: 1px solid var(--border-color);
  padding-top: 0.75rem;
}

.lt-item-body {
  flex: 1;
  min-width: 0;
}

.lt-amount {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--lt-amount, #fff);
  display: flex;
  align-items: baseline;
  gap: 4px;
  flex-wrap: wrap;
}

.lt-ar-amount {
  color: var(--lt-amount, #fff);
  font-size: 22px;
}

.lt-amount .ar-symbol {
  font-size: 1.2em;
  margin-left: 0;
}
</style>
