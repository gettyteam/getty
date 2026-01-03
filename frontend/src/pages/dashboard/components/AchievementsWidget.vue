<template>
  <section class="os-card overflow-hidden flex flex-col">
    <div class="flex-1 relative overflow-hidden">
      <BlockedState v-if="isBlocked" module-name="Achievements" />
      <div
        v-else
        class="h-full overflow-y-auto custom-scrollbar"
        :class="inCustomGrid ? 'p-3' : ''"
        ref="listContainer">
        <div class="space-y-2">
          <div
            v-for="ach in reversedAchievements"
            :key="ach.id || ach.timestamp"
            class="group flex items-start gap-3 rounded-lg px-2 py-2 bg-secondary/30 hover:bg-secondary/50 active:bg-secondary/60 transition-colors border border-border">
            <div
              class="feed-badge mt-0.5 h-7 w-7 rounded-full bg-[#6d46c3] text-white flex items-center justify-center text-xs font-semibold shrink-0"
              style="color: #fff">
              ✔
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-[14px] font-semibold text-foreground capitalize">
                {{ getI18nText('recentEventsKindAchievement', 'Achievement') }}
              </div>
              <div class="text-[14px] font-semibold text-foreground truncate">
                {{ getI18nText(ach.titleKey, ach.title) || defaultTitleText }}
              </div>
              <div class="text-xs text-muted-foreground leading-snug truncate">
                {{ getI18nText(ach.descKey, ach.desc) }}
              </div>
            </div>
            <div class="text-xs text-muted-foreground whitespace-nowrap pt-0.5">
              {{ formatAgo(ach.timestamp || ach.ts) }}
            </div>
          </div>

          <div
            v-if="achievements.length === 0"
            class="h-full flex items-center justify-center text-muted-foreground italic text-sm py-6">
            {{ noRecentText }}
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, watch, ref } from 'vue';
import { useWidgetStore } from '../../../stores/widgetStore';
import BlockedState from './BlockedState.vue';
// @ts-ignore
import { i18nTrigger } from '../languageManager';

defineProps({
  isBlocked: {
    type: Boolean,
    default: false,
  },
  inCustomGrid: {
    type: Boolean,
    default: false,
  },
});

const store = useWidgetStore();
const listContainer = ref<HTMLElement | null>(null);

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

const defaultTitleText = computed(() => getI18nText('achievementDefaultTitle', 'Achievement'));
const noRecentText = computed(() => getI18nText('achievementNoRecent', 'No recent achievements'));

function formatAgo(ts: any): string {
  const n = typeof ts === 'number' ? ts : Number(ts);
  if (!Number.isFinite(n)) return getI18nText('achievementTimeNow', 'Now');

  const diffMs = Math.max(0, Date.now() - n);
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 10) return getI18nText('achievementTimeNow', 'Now');
  if (diffSec < 60) return `${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}w`;
  if (diffDay < 365) return `${Math.floor(diffDay / 30)}mo`;
  return `${Math.floor(diffDay / 365)}y`;
}

const achievements = computed(() => store.achievements);
const reversedAchievements = computed(() => [...achievements.value].reverse());
const config = computed(() => store.achievementConfig);
const audioSettings = computed(() => store.sharedAudioSettings);

const REMOTE_SOUND_URL =
  'https://52agquhrbhkx3u72ikhun7oxngtan55uvxqbp4pzmhslirqys6wq.arweave.net/7oBoUPEJ1X3T-kKPRv3XaaYG97St4Bfx-WHktEYYl60';

async function playSound() {
  if (!config.value.sound?.enabled) return;

  let url = config.value.sound.url || REMOTE_SOUND_URL;

  if (audioSettings.value.audioSource === 'custom' && audioSettings.value.hasCustomAudio) {
    url = '/api/goal-custom-audio';
  }

  try {
    const audio = new Audio(url);
    audio.volume = Math.pow(config.value.sound.volume ?? 0.5, 2);
    await audio.play();
  } catch {
    // console.warn('Audio play failed');
  }
}

watch(
  () => store.achievements.length,
  (newLen, oldLen) => {
    if (newLen > oldLen) {
      if (newLen - oldLen === 1) {
        playSound();
      }
    }
  }
);

onMounted(() => {
  store.initWebSocket();
});
</script>

<style scoped>
.feed-badge {
  color: #fff !important;
  -webkit-text-fill-color: #fff;
  font-variant-emoji: text;
}

.custom-scrollbar {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.custom-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>
