<template>
  <section class="os-card overflow-hidden flex flex-col md:order-1 lg:order-1">
    <h2 class="os-panel-title">
      <span class="icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M12 1v22"></path>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
      </span>
      <span>{{ title }}</span>
    </h2>
    <div class="flex-1 flex flex-col justify-center">
      <BlockedState v-if="isBlocked" module-name="Last Tip" />
      <div
        v-else
        id="last-donation"
        class="last-donation"
        :class="{ 'update-animation': animate }"
        :style="cssVars"
        role="status"
        aria-live="polite">
        <div v-if="!hasData" class="skeleton p-3" data-skeleton="last-tip">
          <div class="skeleton-lg skeleton"></div>
          <div class="skeleton-line skeleton w-[60%]"></div>
          <div class="skeleton-line skeleton w-[40%]"></div>
        </div>

        <div v-else class="last-donation-content">
          <div class="notification-icon-lasttip">
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
          <div class="notification-text">
            <div class="notification-title">{{ title }}</div>
            <div class="notification-amount">
              <div class="amount-container">
                <span class="ar-amount">{{ formattedAmount }}</span>
                <span class="ar-symbol" style="font-size: 0.6em; margin-left: 4px">AR</span>
                <span class="usd-value">{{ usdValue }}</span>
              </div>
            </div>
            <div class="notification-from-lasttip">
              {{ getI18nText('notificationFrom', 'From:') }} {{ fromDisplay }}... 📑
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

const hasData = computed(() => !!store.lastTip);

const title = computed(() => {
  return store.lastTipConfig.title || getI18nText('lastTipTitle', 'Last tip received 👏');
});

const formattedAmount = computed(() => {
  if (!store.lastTip) return '0.00';
  const num = parseFloat(store.lastTip.amount);
  return isFinite(num)
    ? num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })
    : '0.00';
});

const usdValue = computed(() => {
  if (!store.lastTip || !store.arPrice) return '';
  const arNum = parseFloat(store.lastTip.amount);
  if (!isFinite(arNum)) return '';
  const val = arNum * store.arPrice;
  return `≈ $${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
});

const fromDisplay = computed(() => {
  if (!store.lastTip || !store.lastTip.from) return 'Anonymous';
  return store.lastTip.from.slice(0, 22);
});

const cssVars = computed(() => {
  const c = store.lastTipConfig || {};
  return {
    '--lt-bg': c.bgColor || '#080c10',
    '--lt-border': c.borderColor || '#00ff7f',
    '--lt-text': c.fontColor || '#ffffff',
    '--lt-amount': c.amountColor || '#ffffff',
    '--lt-icon-bg': c.iconBgColor || '#eaeaea',
    '--lt-from': c.fromColor || '#ffffff',
  };
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
  store.fetchInitialData();
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
  color: #fff;
  overflow: hidden;
  border-radius: 4px;
}

.last-donation-content {
  padding: 0.625rem;
  display: flex;
  align-items: center;
  background-color: var(--lt-bg, #080c10);
}

.notification-icon-lasttip {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 78px;
  height: 78px;
  min-width: 78px;
  min-height: 78px;
  border-radius: 0.25rem;
  background-color: #eaeaea;
  margin-right: 15px;
  margin-left: 5px;
}

.notification-icon-lasttip svg {
  width: 60px;
  height: 60px;
  display: block;
  color: #080c10;
  margin-top: 2px;
}

.notification-from-lasttip {
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  color: var(--lt-from, #fff);
}

:global(html:not(.dark)) .notification-from-lasttip {
  color: #fff;
}

.notification-text {
  flex: 1;
}

.notification-title {
  font-size: 20px;
  font-weight: 800;
  margin-bottom: 5px;
  color: var(--lt-text, #fff);
}

:global(html:not(.dark)) .notification-title {
  color: #fff !important;
}

.notification-amount {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--lt-amount, #fff);
}

.ar-symbol {
  color: var(--lt-amount, #fff);
  margin-left: 4px;
  font-size: 0.8em;
}

:global(html:not(.dark)) .ar-symbol {
  color: #fff;
}

.usd-value {
  font-size: 0.6em;
  margin-left: 8px;
  opacity: 0.8;
  font-weight: normal;
}
</style>
