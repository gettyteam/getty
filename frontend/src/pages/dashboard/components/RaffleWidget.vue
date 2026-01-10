<template>
  <section class="os-card overflow-hidden flex flex-col h-[500px] md:order-5 lg:order-5">
    <div class="flex-1 flex flex-col justify-center">
      <BlockedState v-if="isBlocked" module-name="Raffle" />

      <div
        v-else
        class="raffle-embed bg-card dark:bg-neutral-950 rounded-[6px] p-0 h-full flex flex-col overflow-hidden relative"
        aria-busy="true">
        <div class="widget-simulation flex flex-col h-full w-full">
          <div class="raffle-header-inner">
            <div class="header-content">
              <div>
                <div class="raffle-title-inner">{{ getI18nText('raffleTitle', 'GIVEAWAY') }}</div>
                <div class="raffle-subtitle-inner">
                  {{ getI18nText('raffleSubtitle', 'Win amazing prizes!') }}
                </div>
              </div>
            </div>
            <div
              v-if="isActiveOrPaused && !isPaused"
              class="live-badge"
              :class="{ hidden: !isActiveOrPaused || isPaused }">
              <span class="pulse-dot"></span> LIVE
            </div>
          </div>

          <div
            class="raffle-body-inner flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
            <div v-if="winner" class="winner-state flex-1 flex flex-col">
              <div class="prize-section shrink-0">
                <div class="prize-name">{{ winner.prize || '---' }}</div>
                <div class="prize-image" :class="{ hidden: !state?.imageUrl }">
                  <img
                    v-if="state?.imageUrl"
                    :src="state.imageUrl"
                    alt="Prize"
                    class="w-full h-full object-cover" />
                  <div v-else class="image-placeholder">
                    <i class="pi pi-image text-3xl mb-2"></i>
                    <div>Prize Image</div>
                  </div>
                </div>
              </div>

              <div class="recent-winners w-full mt-4">
                <div class="winners-title">
                  {{ getI18nText('raffleWinnerTitle', 'Congratulations!') }}
                </div>
                <div class="winner-list flex flex-col gap-2">
                  <div v-for="(w, idx) in currentWinners" :key="idx" class="winner-item">
                    <img
                      :src="w.avatar"
                      class="winner-avatar-img"
                      alt=""
                      @error="handleImageError" />
                    <div class="winner-name">{{ w.name }}</div>
                    <div class="winner-time" v-if="w.time">
                      {{ w.time }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-else-if="isActiveOrPaused" class="active-state flex flex-col h-full">
              <div class="prize-section shrink-0">
                <div class="prize-name">
                  {{ state?.prize || getI18nText('raffleLoading', 'Loading...') }}
                </div>

                <div class="prize-image" :class="{ hidden: !state?.imageUrl }">
                  <img
                    v-if="state?.imageUrl"
                    :src="state.imageUrl"
                    alt="Prize"
                    class="w-full h-full object-cover" />
                  <div v-else class="image-placeholder">
                    <i class="pi pi-image text-3xl mb-2"></i>
                    <div>Prize Image</div>
                  </div>
                </div>
              </div>

              <div class="participants-section shrink-0">
                <div class="participants-count">
                  <div class="count-label">
                    {{ getI18nText('raffleParticipants', 'Participants') }}
                  </div>
                  <div class="count-value">{{ participantCount.toLocaleString() }}</div>
                </div>
                <div class="winners-count">
                  <div class="winners-label">{{ getI18nText('raffleWinners', 'Winners') }}</div>
                  <div class="winners-value">
                    {{ state?.totalWinners ?? 0 }}
                  </div>
                </div>
              </div>

              <div class="entry-section flex-1 flex flex-col min-h-0">
                <div class="command-box shrink-0">
                  <span class="command-prefix">!</span>
                  <span class="command">{{
                    (state?.command || '!giveaway').replace(/^!/, '')
                  }}</span>
                </div>
                <div class="enter-info shrink-0">
                  <i class="pi pi-ticket mr-2"></i>
                  <span>{{ getI18nText('raffleEnterBtn', 'Enter Giveaway') }}</span>
                </div>

                <div class="participants-list-container flex-1 flex flex-col min-h-0 mt-4">
                  <div class="participants-list-title shrink-0">
                    {{ getI18nText('raffleEntries', 'Users participating') }}
                  </div>

                  <div class="participants-list overflow-y-auto custom-scrollbar">
                    <div
                      v-for="(p, i) in recentParticipants"
                      :key="i"
                      class="participant-pill animate-fade-in">
                      <span class="participant-name text-xs">{{
                        typeof p === 'string' ? p : p.username || p.name || 'User'
                      }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              v-else
              class="inactive-state flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground/50">
              <div class="text-4xl mb-4 opacity-50">🎲</div>
              <p>{{ getI18nText('raffleNoActive', 'There is no active giveaway.') }}</p>
            </div>
          </div>

          <div class="raffle-footer-inner shrink-0">
            <div
              class="status-message"
              :class="{
                active: isActiveOrPaused && !isPaused,
                paused: isActiveOrPaused && isPaused,
                ended: winner || !isActiveOrPaused,
              }">
              <span class="status-dot"></span>
              <span>
                {{
                  winner
                    ? getI18nText('raffleEnded', 'Giveaway has ended')
                    : isPaused
                      ? getI18nText('raffleStatusPaused', 'Paused')
                      : isActiveOrPaused
                        ? getI18nText('raffleStatusActive', 'Active')
                        : getI18nText('inactive', 'Inactive')
                }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
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

const SPACEMAN_AVATAR =
  'https://thumbnails.odycdn.com/optimize/s:0:0/quality:85/plain/https://player.odycdn.com/speech/spaceman-png:2.png';

const winner = computed(() => store.raffleWinner);
const state = computed(() => store.raffleState);

const isActiveOrPaused = computed(() => state.value && (state.value.active || state.value.paused));
const isPaused = computed(() => state.value?.paused);

const participantCount = computed(() => {
  const list = state.value?.participants || [];
  return list.length;
});

const recentParticipants = computed(() => {
  const list = state.value?.participants || [];
  return list.slice(-10).reverse();
});

const currentWinners = computed(() => {
  const w = winner.value;
  if (!w) return [];

  let candidates: any[] = [];
  if (Array.isArray(w.winner)) candidates = w.winner.filter(Boolean);
  else if (typeof w.winner === 'string') candidates = [w.winner];
  else if (typeof w.winner === 'object') candidates = [w.winner];

  return candidates.map((c) => {
    let name = 'Spaceman';
    let avatar = SPACEMAN_AVATAR;

    if (typeof c === 'string') {
      name = c;
    } else if (typeof c === 'object' && c) {
      name = c.username || c.name || c.displayName || 'Spaceman';
      avatar = c.avatar || c.profilePicture || SPACEMAN_AVATAR;
    }
    return {
      name,
      avatar,
      time: w.timestamp ? new Date(w.timestamp).toLocaleTimeString() : undefined,
    };
  });
});

const handleImageError = (event: Event) => {
  const target = event.target as HTMLImageElement;
  if (target) {
    target.src = SPACEMAN_AVATAR;
  }
};

onMounted(() => {
  store.initWebSocket();
});
</script>

<style scoped>
.raffle-embed {
  border-color: var(--border);
}

.animate-fade-in {
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.99);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes pulse {
  0% {
    opacity: 0.8;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.8;
  }
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--border, #374151);
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--muted-foreground, #9ca3af);
}

.raffle-header-inner {
  background: linear-gradient(90deg, rgba(83, 66, 179, 0.9), rgba(16, 16, 16, 0.95));
  color: #fff;
  padding: 10px 12px;
  position: relative;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.raffle-title-inner {
  font-size: 16px;
  font-weight: 700;
  line-height: 1.2;
}

.raffle-subtitle-inner {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
}

.live-badge {
  position: absolute;
  top: 50%;
  right: 12px;
  transform: translateY(-50%);
  background: #ef4444;
  color: white;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 4px;
  animation: pulse 2s infinite;
}

.pulse-dot {
  width: 6px;
  height: 6px;
  background-color: white;
  border-radius: 50%;
}

.raffle-body-inner {
  padding: 12px;
  gap: 12px;
}

.prize-section {
  text-align: center;
}

.prize-name {
  font-size: 24px;
  font-weight: 800;
  color: var(--foreground);
  margin-bottom: 8px;
  line-height: 1.2;
}

.prize-image {
  width: 100%;
  height: 120px;
  background: var(--muted, rgba(255, 255, 255, 0.05));
  border-radius: 6px;
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
}

.image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--muted-foreground);
  font-size: 12px;
}

.participants-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--muted, rgba(255, 255, 255, 0.03));
  padding: 8px 12px;
  margin-top: 8px;
  border-radius: 6px;
  border: 1px solid var(--border);
}

.count-label,
.winners-label {
  font-size: 11px;
  color: var(--muted-foreground);
  text-transform: uppercase;
}

.count-value,
.winners-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--foreground);
  line-height: 1;
}

.winners-count {
  text-align: right;
}

.winners-value {
  color: #db2777;
}

.command-hint {
  font-size: 12px;
  color: var(--muted-foreground);
  margin-bottom: 4px;
  text-align: center;
}

.command-box {
  background: var(--card, #111827);
  border: 1px solid var(--border, #374151);
  border-radius: 6px;
  padding: 8px;
  text-align: center;
  margin-top: 8px;
  margin-bottom: 8px;
  font-family: monospace;
}

.command-prefix {
  color: #6b7280;
}

.command {
  color: #10b981;
  font-weight: 700;
  font-size: 16px;
}

.enter-info {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted-foreground);
  font-size: 12px;
}

.participants-list-title {
  font-size: 12px;
  color: var(--muted-foreground);
  margin-bottom: 6px;
  font-weight: 600;
}

.participants-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-content: flex-start;
}

.participant-pill {
  background: var(--muted, rgba(255, 255, 255, 0.1));
  border: 1px solid var(--border);
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  color: var(--foreground);
  white-space: nowrap;
}

.raffle-footer-inner {
  padding: 8px 12px;
  border-top: 1px solid var(--border);
  background: var(--muted, rgba(255, 255, 255, 0.02));
  font-size: 12px;
  font-weight: 500;
}

.status-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--muted-foreground);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.status-message.active {
  color: #10b981;
}
.status-message.paused {
  color: #f59e0b;
}
.status-message.ended {
  color: #db2777;
  font-weight: 600;
}

.winner-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: var(--muted, rgba(255, 255, 255, 0.05));
  border-radius: 8px;
}

.winner-avatar-img {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
  background-color: rgba(75, 60, 160);
  flex-shrink: 0;
}

.winner-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--foreground);
  text-align: left;
}

.winner-time {
  margin-left: auto;
  font-size: 11px;
  color: var(--muted-foreground);
}

.winners-title {
  text-align: center;
  font-size: 14px;
  color: var(--muted-foreground);
  margin-bottom: 8px;
  text-transform: uppercase;
  font-weight: 600;
}
</style>
