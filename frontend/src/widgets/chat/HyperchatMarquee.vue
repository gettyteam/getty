<template>
  <div
    v-if="visible && (chats.length > 0 || mode === 'promo')"
    ref="wrapperRef"
    class="hyperchat-marquee-wrapper"
    :class="[
      { 'promo-active': mode === 'promo' },
      context === 'dashboard' ? 'dashboard-mode !p-1' : 'chat-mode',
    ]">
    <transition name="fade" mode="out-in">
      <div
        v-if="mode === 'marquee' && chats.length > 0"
        key="marquee"
        ref="contentRef"
        class="hyperchat-marquee-content"
        :class="{ scrolling: shouldScroll }"
        :style="shouldScroll ? { animationDuration: duration + 's' } : {}">
        <div
          v-for="chat in displayHyperchats"
          :key="chat.id"
          class="livestream-hyperchat"
          :class="getLevelClass(chat)">
          <div class="channel-thumbnail">
            <img :src="chat.avatar || defaultAvatar" alt="Avatar" class="avatar-img" />
          </div>
          <div class="livestreamHyperchat__info">
            <div class="livestreamHyperchat__info--user">
              <span class="credit-amount">
                {{ formatAmount(chat) }}
              </span>
            </div>
          </div>
        </div>

        <template v-if="shouldScroll">
          <div
            v-for="chat in displayHyperchats"
            :key="'dup-' + chat.id"
            class="livestream-hyperchat"
            :class="getLevelClass(chat)">
            <div class="channel-thumbnail">
              <img :src="chat.avatar || defaultAvatar" alt="Avatar" class="avatar-img" />
            </div>
            <div class="livestreamHyperchat__info">
              <div class="livestreamHyperchat__info--user">
                <span class="credit-amount">
                  {{ formatAmount(chat) }}
                </span>
              </div>
            </div>
          </div>
        </template>
      </div>
      <div v-else-if="mode === 'promo'" key="promo" class="hyperchat-promo-content">
        <span class="promo-text">{{ currentPromoMessage }}</span>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  chats: {
    type: Array,
    default: () => [],
  },
  visible: {
    type: Boolean,
    default: true,
  },
  language: {
    type: String,
    default: 'en',
  },
  context: {
    type: String,
    default: 'chat',
  },
});

const wrapperRef = ref(null);
const contentRef = ref(null);
const shouldScroll = ref(false);
const mode = ref('marquee');
const currentPromoMessage = ref('');
const currentPromoKey = ref('');
let cycleTimer = null;

const MARQUEE_TIME = 5 * 60 * 1000;
const PROMO_TIME = 1 * 60 * 1000;

const promoKeys = [
  'hyperchatPromo1',
  'hyperchatPromo2',
  'hyperchatPromo3',
  'hyperchatPromo4',
  'hyperchatPromo5',
  'hyperchatPromo6',
  'hyperchatPromo7',
  'hyperchatPromo8',
  'hyperchatPromo9',
  'hyperchatPromo10',
  'hyperchatPromo11',
  'hyperchatPromo12',
  'hyperchatPromo13',
];

const translations = {
  en: {
    hyperchatPromo1: 'These are the latest hyperchat tips 🎉',
    hyperchatPromo2: "Now it's your turn to be part of the hyperchats",
    hyperchatPromo3: 'Send your greetings to the chat by sending a hyperchat',
    hyperchatPromo4: 'Join the vibe! Send your hyperchat from the stream.',
    hyperchatPromo5: "You are missing in hyperchats. It's your time to shine!",
    hyperchatPromo6: 'Your voice is missing here. A hyperchat awaits you!',
    hyperchatPromo7: "Have you seen the hyperchats? Now it's your turn!",
    hyperchatPromo8: 'The chat is on fire. Be part of it with your hyperchat.',
    hyperchatPromo9: 'Your hyper greeting! Add your hyperchat to the wall.',
    hyperchatPromo10: 'The spotlight is yours. Leave your hyperchat now!',
    hyperchatPromo11: 'Hyperchats available. Leave your mark in the chat!',
    hyperchatPromo12: "Don't be left out! Send your hyperchat now.",
    hyperchatPromo13: 'Get noticed! Your hyperchat makes the difference.',
  },
  es: {
    hyperchatPromo1: 'Estas son las últimas propinas en hyperchats 🎉',
    hyperchatPromo2: 'Ahora es tu turno de formar parte de los hyperchats',
    hyperchatPromo3: 'Envía tus saludos al chat enviando algún hyperchat',
    hyperchatPromo4: '¡Únete a la vibra! Envía tu hyperchat desde el stream.',
    hyperchatPromo5: 'Faltas tú en hyperchats. ¡Es tu momento brillar!',
    hyperchatPromo6: 'Tu voz aquí falta. ¡Un hyperchat te espera!',
    hyperchatPromo7: '¿Ya viste los hyperchats? ¡Ahora te toca a ti!',
    hyperchatPromo8: 'El chat está encendido. Sé parte con tu hyperchat.',
    hyperchatPromo9: '¡Tu saludo hiper! Suma tu hyperchat al muro.',
    hyperchatPromo10: 'El spotlight es tuyo. ¡Deja tu hyperchat ahora!',
    hyperchatPromo11: 'Hyperchats disponibles. ¡Deja tu huella en el chat!',
    hyperchatPromo12: '¡No te quedes fuera! Envía tu hyperchat ya.',
    hyperchatPromo13: '¡Hazte notar! Tu hyperchat hace la diferencia.',
  },
};

function t(key) {
  const lang = props.language && translations[props.language] ? props.language : 'en';
  return translations[lang][key] || translations['en'][key] || key;
}

function startCycle() {
  if (cycleTimer) clearTimeout(cycleTimer);
  mode.value = 'marquee';
  nextTick(() => {
    checkScroll();
  });
  cycleTimer = setTimeout(() => {
    showPromo();
  }, MARQUEE_TIME);
}

function showPromo() {
  shouldScroll.value = false;
  const key = promoKeys[Math.floor(Math.random() * promoKeys.length)];
  currentPromoKey.value = key;
  currentPromoMessage.value = t(key);

  // Ensure state update triggers re-render
  nextTick(() => {
    mode.value = 'promo';
  });

  if (cycleTimer) clearTimeout(cycleTimer);
  cycleTimer = setTimeout(() => {
    startCycle();
  }, PROMO_TIME);
}

watch(
  () => props.language,
  () => {
    if (mode.value === 'promo' && currentPromoKey.value) {
      currentPromoMessage.value = t(currentPromoKey.value);
    }
  }
);

const defaultAvatar =
  'https://thumbnails.odycdn.com/optimize/s:0:0/quality:85/plain/https://player.odycdn.com/speech/spaceman-png:2.png';

const displayHyperchats = computed(() => {
  return [...props.chats].sort((a, b) => {
    const amountA = getBaseAmount(a);
    const amountB = getBaseAmount(b);
    return amountB - amountA;
  });
});

const duration = computed(() => {
  const baseSpeed = 20;
  return Math.max(baseSpeed, displayHyperchats.value.length * 5);
});

async function checkScroll() {
  if (mode.value === 'promo') {
    shouldScroll.value = false;
    return;
  }
  if (!wrapperRef.value || !contentRef.value) return;

  const wrapperWidth = wrapperRef.value.clientWidth;
  let contentWidth = contentRef.value.scrollWidth;

  if (shouldScroll.value) {
    contentWidth = contentWidth / 2;
  }

  shouldScroll.value = contentWidth > wrapperWidth;
}

watch(
  displayHyperchats,
  async () => {
    await nextTick();
    checkScroll();
  },
  { deep: true }
);

onMounted(() => {
  window.addEventListener('resize', checkScroll);
  checkScroll();
  startCycle();
});

onUnmounted(() => {
  window.removeEventListener('resize', checkScroll);
  if (cycleTimer) clearTimeout(cycleTimer);
});

function getBaseAmount(chat) {
  return chat.support_amount || 0;
}

function getLevelClass(chat) {
  const amount = getBaseAmount(chat);

  if (amount >= 100) return 'hyperchat-preview-level7';
  if (amount >= 50) return 'hyperchat-preview-level6';
  if (amount >= 20) return 'hyperchat-preview-level5';
  if (amount >= 10) return 'hyperchat-preview-level4';
  if (amount >= 5) return 'hyperchat-preview-level3';
  if (amount >= 2) return 'hyperchat-preview-level2';
  return 'hyperchat-preview-level1';
}

function formatAmount(chat) {
  const amount = chat.support_amount || 0;
  const currency = chat.currency || 'USD';

  if (currency === 'AR') return `${amount} AR`;
  if (currency === 'LBC') return `${amount} LBC`;

  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}
</script>

<style>
.hyperchat-marquee-wrapper {
  width: 100%;
  overflow: hidden;
  padding: 2px 0px 2px;
  position: relative;
  z-index: 10;
  transition:
    background 0.5s ease,
    border-color 0.3s ease;
}

.hyperchat-marquee-wrapper.chat-mode {
  background: var(--bg-message, #0a0e12);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 4px;
  border-radius: 6px;
}

:global(body.transparent-bg) .hyperchat-marquee-wrapper.chat-mode {
  background: transparent !important;
  border-bottom: none !important;
  box-shadow: none !important;
}

.hyperchat-marquee-wrapper.chat-mode.promo-active {
  background: radial-gradient(circle, rgb(34, 28, 62) 0, rgb(28, 22, 48) 85%);
}

.hyperchat-marquee-wrapper.dashboard-mode {
  background: var(--bg-card, #ffffff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 0.5rem;
  color: var(--text-primary, #09090b);
}

.dark .hyperchat-marquee-wrapper.dashboard-mode {
  background: var(--bg-card, #0f1214);
  border-color: var(--border-color, #2d333b);
  color: var(--text-primary, #ffffff);
}

.hyperchat-marquee-wrapper.dashboard-mode.promo-active {
  background: linear-gradient(to right, var(--bg-card), var(--bg-background));
}

.hyperchat-marquee-content {
  display: flex;
  width: max-content;
}

.hyperchat-marquee-content.scrolling {
  animation: marquee linear infinite;
}

.livestream-hyperchat {
  display: flex;
  align-items: center;
  margin-right: 10px;
  padding: 2px 8px 2px 2px;
  border-radius: 14px;
  background-color: rgba(255, 255, 255, 0.1);
  white-space: nowrap;
  color: white;
  font-size: 0.8rem;
  font-weight: bold;
  animation: hyperchat-fade-in 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.dashboard-mode .livestream-hyperchat {
  color: var(--text-primary, inherit);
  background-color: rgba(128, 128, 128, 0.1);
}

@keyframes hyperchat-fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.hyperchat-promo-content {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  text-align: center;
  padding: 3px 0px 3px 0px;
}

.promo-text {
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(52, 43, 91, 0.64);
  animation: hyperchat-fade-in 0.5s ease-out;
}

.dashboard-mode .promo-text {
  color: var(--text-primary, #000);
  text-shadow: none;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.channel-thumbnail {
  background-color: rgba(75, 60, 160);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 5px;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.credit-amount {
  display: flex;
  align-items: center;
}

.hyperchat-preview-level1 {
  background-color: rgb(36, 36, 36);
  border: 1px solid rgb(36, 36, 36);
}
.dashboard-mode .hyperchat-preview-level1 {
  background-color: var(--bg-background, #f4f4f5);
  border: 1px solid var(--border-color, #e4e4e7);
  color: var(--text-primary, #000);
}
.dark .dashboard-mode .hyperchat-preview-level1 {
  background-color: #27272a;
  border-color: #3f3f46;
  color: #fff;
}

.hyperchat-preview-level2 {
  background-color: rgba(33, 150, 243, 0.85);
  color: #fff;
}
.hyperchat-preview-level3 {
  background-color: rgba(26, 189, 98, 0.94);
  color: #fff;
}
.hyperchat-preview-level4 {
  background-color: rgba(255, 193, 7, 0.85);
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}
.hyperchat-preview-level5 {
  background-color: rgba(255, 111, 0, 0.85);
  color: #fff;
}
.hyperchat-preview-level6 {
  background-color: rgba(116, 60, 219, 0.85);
  color: #fff;
}
.hyperchat-preview-level7 {
  background-color: rgba(236, 9, 93, 0.7);
  color: #fff;
}

@keyframes marquee {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}
</style>
