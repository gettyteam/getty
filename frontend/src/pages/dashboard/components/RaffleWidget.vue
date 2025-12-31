<template>
  <section class="os-card overflow-hidden flex flex-col h-[500px] md:order-5 lg:order-5">
    <div class="flex-1 flex flex-col justify-center">
      <BlockedState v-if="isBlocked" module-name="Raffle" />

      <div
        v-else
        class="raffle-embed bg-card dark:bg-neutral-950 border border-border rounded-[6px] p-3 h-full flex flex-col"
        aria-busy="true">
        <div v-if="winner" class="winner-display animate-fade-in">
          <div class="winner-icon">🏆</div>
          <div class="winner-title" data-i18n="raffleWinnerTitle">
            {{ getI18nText('raffleWinnerTitle', 'We have a winner. Congratulations!') }}
          </div>

          <div class="winner-name">
            <transition name="fade" mode="out-in">
              <span :key="currentWinnerName" class="winner-name-fade">
                {{ currentWinnerName }}
              </span>
            </transition>
          </div>

          <div class="winner-prize">{{ winner.prize || '---' }}</div>

          <div class="winner-meta">
            <div class="winner-command">
              <span style="opacity: 0.7">{{ getI18nText('raffleCommand', 'Command:') }}</span>
              <span style="color: #1fea55">{{ winner.command || '!giveaway' }}</span>
            </div>
            <div class="winner-timestamp" v-if="winner.timestamp">
              {{ getI18nText('raffleWinnerAnnounced', 'Winner announced on') }}
              {{ new Date(winner.timestamp).toLocaleDateString() }}
            </div>
          </div>
        </div>

        <div v-else-if="isActiveOrPaused" class="flex flex-col h-full">
          <div class="raffle-header">
            <div class="raffle-status-badge" :class="{ active: !isPaused, paused: isPaused }">
              <span class="dot"></span>
              <span>{{ statusLabel }}</span>
            </div>
            <div class="raffle-participant-count">
              <strong>{{ participantCount }}</strong>
              <span data-i18n="raffleParticipants">
                {{ getI18nText('raffleParticipants', 'participants') }}</span
              >
            </div>
          </div>

          <div class="flex-1 flex flex-col items-center justify-center">
            <div class="raffle-prize-container">
              <img v-if="state?.imageUrl" :src="state.imageUrl" alt="Prize" class="prize-image" />
              <div class="prize-meta">
                <div class="prize-label">{{ getI18nText('rafflePrizeTitle', 'Prize') }}</div>
                <div class="prize-text">
                  {{ state?.prize || getI18nText('loading', 'Loading...') }}
                </div>
              </div>
            </div>

            <div class="raffle-message">
              {{ getI18nText('raffleJoinInstruction1', 'Type') }}
              <strong style="color: #1fea55">{{ state?.command || '!giveaway' }}</strong>
              {{ getI18nText('raffleJoinInstruction2', 'to join!') }}
            </div>
          </div>

          <div class="mt-4 h-8 overflow-hidden relative">
            <div class="flex gap-2 animate-scroll-left whitespace-nowrap text-xs text-gray-500">
              <span v-for="(p, i) in recentParticipants" :key="i" class="participant-pill">
                {{ typeof p === 'string' ? p : p.username || p.name || 'User' }}
              </span>
            </div>
          </div>
        </div>

        <div v-else class="winner-display" style="opacity: 0.5">
          <div class="raffle-status-badge inactive">
            <span class="dot"></span>
            <span>{{ getI18nText('inactive', 'Inactive') }}</span>
          </div>
          <p>
            {{
              getI18nText(
                'raffleNoActive',
                'There is no active giveaway. Create or set up a giveaway with your community in a live stream.'
              )
            }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, onUnmounted } from 'vue';
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

const winner = computed(() => store.raffleWinner);
const state = computed(() => store.raffleState);

const isActiveOrPaused = computed(() => state.value && (state.value.active || state.value.paused));
const isPaused = computed(() => state.value?.paused);

const statusLabel = computed(() => {
  return isPaused.value
    ? getI18nText('raffleStatusPaused', 'Paused')
    : getI18nText('raffleStatusActive', 'Active');
});

const participantCount = computed(() => {
  const list = state.value?.participants || [];
  return list.length;
});

const recentParticipants = computed(() => {
  const list = state.value?.participants || [];
  return list.slice(-10).reverse();
});

const currentWinnerName = ref('');
let winnerInterval: any = null;

function startWinnerCycling() {
  if (winnerInterval) clearInterval(winnerInterval);

  const w = winner.value;
  if (!w) return;

  let names: string[] = [];
  if (Array.isArray(w.winner)) names = w.winner;
  else if (typeof w.winner === 'string') names = [w.winner];
  else if (typeof w.winner === 'object') names = [w.winner.username || w.winner.name || 'Winner'];

  if (names.length === 0) return;

  if (names.length === 1) {
    currentWinnerName.value = names[0];
  } else {
    let idx = 0;
    currentWinnerName.value = names[0];
    winnerInterval = setInterval(() => {
      idx = (idx + 1) % names.length;
      currentWinnerName.value = names[idx];
    }, 3000);
  }
}

watch(
  winner,
  (newVal) => {
    if (newVal) startWinnerCycling();
    else {
      if (winnerInterval) clearInterval(winnerInterval);
      currentWinnerName.value = '';
    }
  },
  { immediate: true }
);

onMounted(() => {
  store.initWebSocket();
});

onUnmounted(() => {
  if (winnerInterval) clearInterval(winnerInterval);
});
</script>

<style scoped>
.raffle-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  gap: 12px;
}

.raffle-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.1);
  color: #bdbdbd;
  line-height: 1;
}

.raffle-status-badge .dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: currentColor;
  box-shadow: 0 0 6px currentColor;
}

.raffle-status-badge.active {
  background: rgba(34, 197, 94, 0.16);
  color: #1fea55;
}

.raffle-status-badge.paused {
  background: rgba(250, 204, 21, 0.16);
  color: #ffd80e;
}

.raffle-status-badge.inactive {
  background: rgba(148, 163, 184, 0.16);
  color: #94a3b8;
}

.raffle-participant-count {
  font-size: 14px;
  color: #cbd5f5;
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.raffle-participant-count strong {
  font-size: 18px;
  color: #ffffff;
}

.raffle-prize-container {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-direction: column;
}

.prize-image {
  width: 50%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
  display: block;
}

.prize-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
}

.prize-label {
  font-size: 28px;
  font-weight: 600;
}

.prize-text {
  font-size: 32px;
  font-weight: 500;
  color: #6d46c3;
}

.raffle-message {
  text-align: center;
  font-size: 18px;
  font-weight: 700;
}

.raffle-message strong {
  color: #ffffff;
}

.winner-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-grow: 1;
  text-align: center;
  padding: 16px;
  gap: 12px;
}

.winner-icon {
  font-size: 32px;
}

.winner-title {
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
}

.winner-name {
  font-size: 26px;
  font-weight: 700;
  color: #4ade80;
  min-height: 40px;
}

.winner-name-fade {
  display: inline-block;
  min-width: 6ch;
  transition: opacity 0.4s ease;
  animation: winnerPulse 4s ease-in-out infinite;
}

@keyframes winnerPulse {
  0%,
  100% {
    filter: drop-shadow(0 0 0px #00ff7f);
  }
  50% {
    filter: drop-shadow(0 0 6px #00ff7f);
  }
}

.winner-prize {
  font-size: 20px;
  font-weight: 600;
  color: #facc15;
}

.winner-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: center;
  font-size: 14px;
}

.winner-command {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}

.winner-timestamp {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.participant-pill {
  background: rgba(255, 255, 255, 0.1);
  padding: 4px 8px;
  border-radius: 4px;
  color: #cbd5f5;
}
</style>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.5s ease-out;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes scrollLeft {
  0% {
    transform: translateX(100%);
  }
  100% {
    transform: translateX(-100%);
  }
}
.animate-scroll-left {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
}

:global(html:not(.dark)) .raffle-embed {
  color: var(--text-primary) !important;
}

:global(html:not(.dark)) .raffle-embed .raffle-status-badge {
  background-color: var(--bg-background) !important;
  color: var(--text-secondary) !important;
}

:global(html:not(.dark)) .raffle-embed .raffle-participant-count {
  color: var(--text-secondary) !important;
}

:global(html:not(.dark)) .raffle-embed .raffle-participant-count strong {
  color: var(--text-primary) !important;
}

:global(html:not(.dark)) .raffle-embed .prize-label {
  color: var(--text-secondary) !important;
}

:global(html:not(.dark)) .raffle-embed .raffle-message,
:global(html:not(.dark)) .raffle-embed .raffle-message strong,
:global(html:not(.dark)) .raffle-embed .winner-title,
:global(html:not(.dark)) .raffle-embed .winner-timestamp {
  color: var(--text-primary) !important;
}

:global(html:not(.dark)) .raffle-embed .participant-pill {
  background-color: var(--bg-background) !important;
  color: var(--text-secondary) !important;
}
</style>
