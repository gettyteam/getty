<template>
  <section class="os-card overflow-hidden flex flex-col md:order-3 lg:order-3">
    <h2 class="os-panel-title">
      <span class="icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
      </span>
      <span data-i18n="notificationsTitle">{{
        getI18nText('notificationsTitle', 'Notifications')
      }}</span>
    </h2>
    <div class="flex-1 flex flex-col justify-center relative">
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
                <div class="notification-title" data-i18n="notificationTipReceived">
                  {{ getI18nText('notificationTipReceived', '🎉 Tip Received!') }}
                </div>
                <div class="amount-container">
                  <span class="ar-amount">{{ arAmount }} AR</span>
                  <span class="usd-value">(${{ usdAmount }} USD)</span>
                </div>
                <div class="notification-from">
                  {{ senderLabel }}
                  <span data-i18n="notificationFrom">{{
                    getI18nText('notificationFrom', 'From:')
                  }}</span>
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
    </div>
  </section>
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
  amountColor: '#00ff7f',
  fromColor: '#ffffff',
});

const cssVars = computed(() => ({
  '--tn-bg': config.value.bgColor,
  '--tn-text': config.value.fontColor,
  '--tn-border': config.value.borderColor,
  '--tn-amount': config.value.amountColor,
  '--tn-from': config.value.fromColor,
}));

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
  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
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

.notification-title {
  font-size: 20px;
  font-weight: 800;
  margin-bottom: 5px;
  color: var(--tn-text, #ffffff);
  line-height: 1.2;
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
  opacity: 0.9;
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
