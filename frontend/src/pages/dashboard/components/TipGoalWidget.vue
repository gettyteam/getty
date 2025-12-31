<template>
  <section class="os-card overflow-hidden flex flex-col md:order-2 lg:order-2">
    <div
      class="flex-1 flex flex-col"
      :class="showNotificationsBelow ? 'overflow-hidden' : 'justify-center'">
      <BlockedState v-if="isBlocked" module-name="Tip Goal" />
      <template v-else>
        <div
          id="dashboard-goal-widget"
          class="p-4 bg-card dark:bg-neutral-950"
          :class="{ celebrating: isCelebrating }"
          :style="goalStyle">
          <div v-if="!hasData" class="skeleton skeleton-lg mb-2" data-skeleton="goal"></div>

          <div v-else class="goal-container">
            <div class="goal-header">
              <div class="goal-title">{{ title }}</div>
              <div class="goal-amounts">
                <span class="current-ar">{{ currentAR }}</span>
                <span class="goal-ar">/ {{ goalAR }} AR</span>
                <span class="usd-value">{{ usdValue }}</span>
              </div>
            </div>
            <div class="progress-container" :class="{ 'reached-goal': reachedGoal }">
              <div class="progress-bar" :style="progressBarStyle"></div>
              <div class="progress-text">{{ progressPercentage.toFixed(1) }}%</div>
            </div>
          </div>
        </div>

        <div v-if="showNotificationsBelow" class="flex-1 min-h-0">
          <NotificationWidget :is-blocked="notificationBlocked" :embedded="true" />
        </div>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useWidgetStore } from '../../../stores/widgetStore';
import BlockedState from './BlockedState.vue';
import NotificationWidget from './NotificationWidget.vue';
// @ts-ignore
import { i18nTrigger } from '../languageManager';

defineProps({
  isBlocked: {
    type: Boolean,
    default: false,
  },
  showNotificationsBelow: {
    type: Boolean,
    default: false,
  },
  notificationBlocked: {
    type: Boolean,
    default: false,
  },
});

const store = useWidgetStore();
const isCelebrating = ref(false);
const hasPlayedSound = ref(false);
const animateProgress = ref(false);

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

const hasData = computed(() => !!store.tipGoal);

const title = computed(() => {
  return store.tipGoal?.title || getI18nText('tipGoalTitle', 'Monthly tip goal 🎖️');
});

const currentAR = computed(() => {
  const val =
    store.tipGoal?.currentAmount ?? store.tipGoal?.currentTips ?? store.tipGoal?.current ?? 0;
  return val.toFixed(2);
});

const goalAR = computed(() => {
  const val = store.tipGoal?.monthlyGoal ?? store.tipGoal?.goal ?? 10;
  return val;
});

const progressPercentage = computed(() => {
  const current = parseFloat(currentAR.value);
  const goal = parseFloat(goalAR.value);
  if (goal === 0) return 0;
  return Math.min((current / goal) * 100, 100);
});

const progressBarStyle = computed(() => {
  return {
    width: progressPercentage.value + '%',
    transition: animateProgress.value ? undefined : 'none',
  };
});

const usdValue = computed(() => {
  const current = parseFloat(currentAR.value);
  const rate = store.arPrice || 0;
  return `$${(current * rate).toFixed(2)} USD`;
});

const reachedGoal = computed(() => progressPercentage.value >= 100);

const cssVars = computed(() => {
  const c = store.tipGoal || {};

  const normalizeHex = (v: any) => (typeof v === 'string' ? v.trim().toLowerCase() : '');
  const isObsDefaultBg = normalizeHex(c.bgColor) === '#080c10';
  const isObsDefaultText = ['#ffffff', '#fff'].includes(normalizeHex(c.fontColor));

  const shouldUseCustomBg = !!c.bgColor && !isObsDefaultBg;

  return {
    '--tg-bg': shouldUseCustomBg ? c.bgColor : undefined,
    '--tg-border': c.borderColor || '#00ff7f',
    '--tg-text': !c.fontColor || isObsDefaultText ? 'var(--text-primary)' : c.fontColor,
    '--tg-progress': c.progressColor || 'linear-gradient(90deg, #7058a4, #c83fee)',
  };
});

const hasCustomBg = computed(() => {
  const c = store.tipGoal || {};
  const normalizeHex = (v: any) => (typeof v === 'string' ? v.trim().toLowerCase() : '');
  const isObsDefaultBg = normalizeHex(c.bgColor) === '#080c10';
  return !!c.bgColor && !isObsDefaultBg;
});

const goalStyle = computed(() => {
  return {
    ...cssVars.value,
    ...(hasCustomBg.value ? { backgroundColor: 'var(--tg-bg)' } : null),
  };
});

const REMOTE_SOUND_URL =
  'https://52agquhrbhkx3u72ikhun7oxngtan55uvxqbp4pzmhslirqys6wq.arweave.net/7oBoUPEJ1X3T-kKPRv3XaaYG97St4Bfx-WHktEYYl60';

watch(reachedGoal, (newVal) => {
  if (newVal) {
    isCelebrating.value = true;
    createConfetti();
    if (!hasPlayedSound.value) {
      playGoalSound();
      hasPlayedSound.value = true;
    }
  } else {
    isCelebrating.value = false;
    hasPlayedSound.value = false;
    removeConfetti();
  }
});

const playGoalSound = async () => {
  const audioSettings = store.sharedAudioSettings || {};
  if (audioSettings.enabled === false) return;

  let audioUrl = REMOTE_SOUND_URL;
  if (audioSettings.audioSource === 'custom' && audioSettings.hasCustomAudio) {
    try {
      const res = await fetch('/api/goal-custom-audio');
      if (res.ok) {
        const data = await res.json();
        if (data.url) audioUrl = data.url;
      }
    } catch (e) {
      console.warn('Failed to fetch custom audio', e);
    }
  }

  try {
    const audio = new Audio(audioUrl);
    audio.volume = Math.pow(audioSettings.volume ?? 0.5, 2);
    await audio.play();
  } catch (e) {
    console.warn('Audio play failed', e);
  }
};

const createConfetti = () => {
  const container = document.getElementById('dashboard-goal-widget');
  if (!container) return;

  removeConfetti();

  for (let i = 0; i < 80; i++) {
    const el = document.createElement('div');
    el.className = 'confetti';
    const pos = Math.floor(Math.random() * 20);
    const size = Math.floor(Math.random() * 5);
    const color = Math.floor(Math.random() * 6);
    const dur = Math.floor(Math.random() * 9);
    const delay = Math.floor(Math.random() * 11);

    el.classList.add(
      `pos-${pos}`,
      `size-${size}`,
      `color-${color}`,
      `dur-${dur}`,
      `delay-${delay}`
    );
    if (Math.random() > 0.5) el.classList.add('round');

    container.appendChild(el);
  }
};

const removeConfetti = () => {
  const container = document.getElementById('dashboard-goal-widget');
  if (!container) return;
  const existing = container.querySelectorAll('.confetti');
  existing.forEach((el) => el.remove());
};

onMounted(() => {
  store.initWebSocket();
  store.fetchInitialData();

  void nextTick().then(() => {
    requestAnimationFrame(() => {
      animateProgress.value = true;
    });
  });
});

watch(
  () => store.isConnected,
  (connected) => {
    if (!connected) {
      animateProgress.value = false;
      return;
    }
    void nextTick().then(() => {
      requestAnimationFrame(() => {
        animateProgress.value = true;
      });
    });
  }
);
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

#dashboard-goal-widget {
  border-radius: 4px;
  padding: 14px;
  color: var(--tg-text, var(--text-primary));
  font-family: var(--font-sans, sans-serif);
}

.goal-container {
  transition: opacity 0.3s ease;
}

.goal-header {
  margin-bottom: 8px;
}

.goal-title {
  font-size: 20px;
  font-weight: 800;
  color: var(--tg-text, var(--text-primary));
  margin-bottom: 8px;
  transition: all 0.3s ease;
}

.goal-amounts {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.current-ar {
  font-size: 24px;
  font-weight: 800;
  color: var(--tg-text, var(--text-primary));
  transition: all 0.3s ease;
}

.goal-ar {
  font-size: 18px;
  font-weight: 800;
  color: var(--tg-text, var(--text-primary));
  transition: all 0.3s ease;
}

.usd-value {
  font-size: 15px;
  font-weight: 600;
  color: var(--tg-text, var(--text-primary));
  margin-left: auto;
  transition: all 0.3s ease;
}

.progress-container {
  height: 20px;
  background: rgba(35, 38, 47, 0.31);
  border-radius: 4px;
  margin: auto;
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: 1fr;
}

.progress-bar {
  height: 100%;
  background: var(--tg-progress, #00ff7f);
  transition: width 0.5s ease-out;
  border-radius: 4px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
  grid-column: 1;
  grid-row: 1;
  z-index: 1;
}

.progress-text {
  grid-column: 1;
  grid-row: 1;
  z-index: 20;

  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: bold;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  color: #fff;
  pointer-events: none;
}

.reached-goal .progress-bar {
  box-shadow: 0 0 15px var(--tg-progress);
  filter: brightness(1.2);
}

.celebrating {
  animation: celebrate 0.5s ease-in-out infinite alternate;
}

@keyframes celebrate {
  from {
    transform: scale(1);
  }
  to {
    transform: scale(1.02);
  }
}

:deep(.confetti) {
  position: absolute;
  width: 10px;
  height: 10px;
  opacity: 0;
  animation-name: confetti-fall;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
  z-index: 20;
}

:deep(.confetti.round) {
  border-radius: 50%;
}

@keyframes confetti-fall {
  0% {
    transform: translateY(-20px) rotate(0deg) scale(0.5);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  100% {
    transform: translateY(100px) rotate(360deg) scale(1);
    opacity: 0;
  }
}

:deep(.confetti.pos-0) {
  left: 0%;
}
:deep(.confetti.pos-1) {
  left: 5%;
}
:deep(.confetti.pos-2) {
  left: 10%;
}
:deep(.confetti.pos-3) {
  left: 15%;
}
:deep(.confetti.pos-4) {
  left: 20%;
}
:deep(.confetti.pos-5) {
  left: 25%;
}
:deep(.confetti.pos-6) {
  left: 30%;
}
:deep(.confetti.pos-7) {
  left: 35%;
}
:deep(.confetti.pos-8) {
  left: 40%;
}
:deep(.confetti.pos-9) {
  left: 45%;
}
:deep(.confetti.pos-10) {
  left: 50%;
}
:deep(.confetti.pos-11) {
  left: 55%;
}
:deep(.confetti.pos-12) {
  left: 60%;
}
:deep(.confetti.pos-13) {
  left: 65%;
}
:deep(.confetti.pos-14) {
  left: 70%;
}
:deep(.confetti.pos-15) {
  left: 75%;
}
:deep(.confetti.pos-16) {
  left: 80%;
}
:deep(.confetti.pos-17) {
  left: 85%;
}
:deep(.confetti.pos-18) {
  left: 90%;
}
:deep(.confetti.pos-19) {
  left: 95%;
}

:deep(.confetti.size-0) {
  width: 6px;
  height: 6px;
}
:deep(.confetti.size-1) {
  width: 8px;
  height: 8px;
}
:deep(.confetti.size-2) {
  width: 10px;
  height: 10px;
}
:deep(.confetti.size-3) {
  width: 12px;
  height: 12px;
}
:deep(.confetti.size-4) {
  width: 14px;
  height: 14px;
}

:deep(.confetti.color-0) {
  background-color: #ff69b4;
}
:deep(.confetti.color-1) {
  background-color: #ffd700;
}
:deep(.confetti.color-2) {
  background-color: #ffffff;
}
:deep(.confetti.color-3) {
  background-color: #e81161;
}
:deep(.confetti.color-4) {
  background-color: #0070ff;
}
:deep(.confetti.color-5) {
  background-color: #00ff28;
}

:deep(.confetti.dur-0) {
  animation-duration: 2s;
}
:deep(.confetti.dur-1) {
  animation-duration: 3s;
}
:deep(.confetti.dur-2) {
  animation-duration: 4s;
}
:deep(.confetti.dur-3) {
  animation-duration: 5s;
}
:deep(.confetti.dur-4) {
  animation-duration: 6s;
}
:deep(.confetti.dur-5) {
  animation-duration: 7s;
}
:deep(.confetti.dur-6) {
  animation-duration: 8s;
}
:deep(.confetti.dur-7) {
  animation-duration: 9s;
}
:deep(.confetti.dur-8) {
  animation-duration: 10s;
}

:deep(.confetti.delay-0) {
  animation-delay: 0s;
}
:deep(.confetti.delay-1) {
  animation-delay: 1s;
}
:deep(.confetti.delay-2) {
  animation-delay: 2s;
}
:deep(.confetti.delay-3) {
  animation-delay: 3s;
}
:deep(.confetti.delay-4) {
  animation-delay: 4s;
}
:deep(.confetti.delay-5) {
  animation-delay: 5s;
}
:deep(.confetti.delay-6) {
  animation-delay: 6s;
}
:deep(.confetti.delay-7) {
  animation-delay: 7s;
}
:deep(.confetti.delay-8) {
  animation-delay: 8s;
}
:deep(.confetti.delay-9) {
  animation-delay: 9s;
}
:deep(.confetti.delay-10) {
  animation-delay: 10s;
}
</style>
