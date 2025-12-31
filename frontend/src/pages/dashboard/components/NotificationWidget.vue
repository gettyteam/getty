<template>
  <component
    :is="embedded ? 'div' : 'section'"
    :class="
      embedded
        ? 'flex-1 flex flex-col justify-center relative min-h-0 mt-2.5'
        : 'os-card overflow-hidden flex flex-col md:order-3 lg:order-3 mt-2.5'
    ">
    <BlockedState v-if="isBlocked" module-name="Notifications" />
    <template v-else>
      <transition name="fade" mode="out-in">
        <div
          v-if="!currentNotification"
          key="waiting"
          class="flex items-center justify-center h-full text-gray-500 text-sm p-4"
          data-i18n="notificationWaiting">
          {{ getI18nText('notificationWaiting', 'Waiting for tips...') }}
        </div>
        <div v-else key="card" class="notification-card" :style="cssVars">
          <div class="notification-content">
            <div class="notification-icon">
              <img :src="avatarUrl" alt="User Avatar" @error="handleImageError" />
            </div>
            <div class="notification-text">
              <div class="amount-container">
                <span class="ar-amount">{{ arAmount }} AR</span>
                <span class="usd-value">(${{ usdAmount }} USD)</span>
              </div>
              <div class="notification-from">
                {{ senderLabel }}
                <span data-i18n="notificationFrom">
                  {{ getI18nText('notificationFrom', 'From:') }}
                </span>
                {{ senderName }}
                <span class="thank-you">👏</span>
              </div>
              <!-- eslint-disable vue/no-v-html -->
              <div
                v-if="formattedMessage"
                class="notification-message"
                v-html="sanitizedMessage"></div>
              <!-- eslint-enable vue/no-v-html -->
            </div>
          </div>
        </div>
      </transition>
    </template>
  </component>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import DOMPurify from 'dompurify';
import { useWidgetStore } from '../../../stores/widgetStore';
import { formatWithMapping, truncateTipMessage } from '../../../utils/emoji';
import BlockedState from './BlockedState.vue';
// @ts-ignore
import { i18nTrigger } from '../languageManager';

defineProps({
  isBlocked: {
    type: Boolean,
    default: false,
  },
  embedded: {
    type: Boolean,
    default: false,
  },
});

const store = useWidgetStore();
const currentNotification = ref<any>(null);
const notificationTimer = ref<any>(null);

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

const config = ref({
  bgColor: '#080c10',
  fontColor: '#ffffff',
  borderColor: '#00ff7f',
  amountColor: '',
  fromColor: '#ffffff',
});

const cssVars = computed(() => {
  const c = config.value;

  const normalizeHex = (v: any) => (typeof v === 'string' ? v.trim().toLowerCase() : '');

  const parseHex = (hex: string): { r: number; g: number; b: number } | null => {
    const h = normalizeHex(hex);
    if (!h || !h.startsWith('#')) return null;
    const raw = h.slice(1);
    if (raw.length === 3) {
      const r = parseInt(raw[0] + raw[0], 16);
      const g = parseInt(raw[1] + raw[1], 16);
      const b = parseInt(raw[2] + raw[2], 16);
      if ([r, g, b].some((n) => Number.isNaN(n))) return null;
      return { r, g, b };
    }
    if (raw.length === 6) {
      const r = parseInt(raw.slice(0, 2), 16);
      const g = parseInt(raw.slice(2, 4), 16);
      const b = parseInt(raw.slice(4, 6), 16);
      if ([r, g, b].some((n) => Number.isNaN(n))) return null;
      return { r, g, b };
    }
    return null;
  };

  const isDarkBg = (() => {
    const rgb = parseHex(c.bgColor);
    if (!rgb) {
      return true;
    }
    const yiq = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
    return yiq < 140;
  })();

  const bgHex = normalizeHex(c.bgColor);
  const hasCustomBg = !!bgHex && bgHex !== '#080c10';
  const isObsDefaultText = ['#ffffff', '#fff'].includes(normalizeHex(c.fontColor));
  const isObsDefaultAmount = normalizeHex(c.amountColor) === '#00ff7f';
  const isObsDefaultFrom = ['#ffffff', '#fff'].includes(normalizeHex(c.fromColor));

  const defaultReadableText = isDarkBg ? '#ffffff' : 'var(--text-primary)';

  return {
    '--tn-bg': hasCustomBg ? c.bgColor : undefined,
    '--tn-text': !c.fontColor || isObsDefaultText ? defaultReadableText : c.fontColor,
    '--tn-border': c.borderColor,
    '--tn-amount': !c.amountColor || isObsDefaultAmount ? defaultReadableText : c.amountColor,
    '--tn-from': !c.fromColor || isObsDefaultFrom ? defaultReadableText : c.fromColor,
  };
});

const arAmount = computed(() => {
  if (!currentNotification.value) return '0.00';
  const data = currentNotification.value;
  let val = 0;

  if (typeof data.arAmount === 'number') {
    val = data.arAmount;
  } else if (data.amount) {
    val = parseFloat(data.amount);
  } else {
    const rawUsd = parseFloat(data.credits || 0) || 0;
    val = store.arPrice > 0 ? rawUsd / store.arPrice : rawUsd / 5;
  }
  const truncated = Math.trunc(val * 1000) / 1000;
  return truncated.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
});

const usdAmount = computed(() => {
  if (!currentNotification.value) return '0.00';
  const data = currentNotification.value;
  let val = 0;

  if (typeof data.usdAmount === 'number') {
    val = data.usdAmount;
  } else if (data.usd) {
    val = parseFloat(data.usd);
  } else {
    const rawAr = parseFloat(data.amount || data.credits || 0) || 0;
    val = store.arPrice > 0 ? rawAr * store.arPrice : rawAr * 5;
  }
  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
});

const senderLabel = computed<string>(() => {
  if (!currentNotification.value) return '';
  const data = currentNotification.value;
  return data.from ? '📦' : '🏷️';
});

const senderName = computed<string>(() => {
  if (!currentNotification.value) return '';
  const data = currentNotification.value;
  return data.from ? `${String(data.from).slice(0, 8)}...` : `${data.channelTitle || 'Anonymous'}`;
});

const formattedMessage = computed(() => {
  if (!currentNotification.value?.message) return '';
  const truncated = truncateTipMessage(currentNotification.value.message);
  return formatWithMapping(truncated);
});

const sanitizedMessage = computed(() => {
  return DOMPurify.sanitize(formattedMessage.value);
});

const avatarUrl = computed(() => {
  return currentNotification.value?.avatar || '/assets/odysee.png';
});

function handleImageError(e: Event) {
  const target = e.target as HTMLImageElement;
  target.style.display = 'none';
}

async function loadConfig() {
  try {
    const res = await fetch('/api/tip-notification');
    if (res.ok) {
      const data = await res.json();
      config.value = { ...config.value, ...data };
    }
  } catch (e) {
    console.warn('Failed to load notification config', e);
  }
}

watch(
  () => store.activeNotification,
  (newVal) => {
    if (newVal) {
      if (notificationTimer.value) clearTimeout(notificationTimer.value);

      currentNotification.value = newVal;

      notificationTimer.value = setTimeout(() => {
        currentNotification.value = null;
      }, 15000);
    }
  }
);

onMounted(() => {
  store.initWebSocket();
  loadConfig();
});
</script>

<style scoped>
.notification-card {
  background: var(--tn-bg, #080c10);
  color: var(--tn-text, #ffffff);
  border-radius: 4px;
  overflow: hidden;
  font-family: var(--font-sans, sans-serif);
  max-width: 400px;
}

.notification-content {
  padding: 10px;
  display: flex;
  align-items: flex-start;
}

.notification-icon {
  margin-right: 12px;
  flex-shrink: 0;
}

.notification-icon img {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}

.notification-text {
  flex: 1;
  overflow: hidden;
}

.amount-container {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.ar-amount {
  font-size: 22px;
  font-weight: 800;
  color: var(--tn-amount, #00ff7f);
  text-shadow: 0 0 1px color-mix(in oklab, var(--tn-amount, #00ff7f) 47%, transparent);
}

.usd-value {
  font-size: 16px;
  color: var(--tn-text, #ffffff);
  font-weight: 600;
}

.notification-from {
  font-size: 14px;
  font-weight: 600;
  color: var(--tn-from, #ffffff);
  display: flex;
  align-items: center;
  margin-top: 4px;
}

.notification-message {
  font-size: 15px;
  color: var(--tn-text, #ffffff);
  margin-top: 8px;
  font-weight: 600;
  overflow-wrap: anywhere;
  line-height: 1.4;
}

.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.5s ease,
    transform 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(10px);
}
</style>
