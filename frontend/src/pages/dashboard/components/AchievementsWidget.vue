<template>
  <section class="os-card overflow-hidden flex flex-col h-[450px] md:order-6 lg:order-6">
    <h2 class="os-panel-title">
      <span class="icon" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round">
          <path d="M8 21h8"></path>
          <path d="M12 17v4"></path>
          <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z"></path>
          <path d="M17 9a5 5 0 0 0 5-5h-5"></path>
          <path d="M7 9a5 5 0 0 1-5-5h5"></path>
        </svg>
      </span>
      <span data-i18n="achievementsTitle">{{
        getI18nText('achievementsTitle', 'Achievements')
      }}</span>
    </h2>
    <div class="ach-root ach-embed flex-1 relative p-4">
      <BlockedState v-if="isBlocked" module-name="Achievements" />
      <div
        v-else
        class="h-full overflow-y-auto space-y-2 pr-1 custom-scrollbar"
        ref="listContainer">
        <transition-group name="list">
          <div v-for="ach in reversedAchievements" :key="ach.id || ach.timestamp" class="ach-card">
            <div class="ach-icon">🏆</div>
            <div class="ach-content">
              <div class="ach-app">
                {{ unlockedText }}
              </div>
              <div class="ach-title">
                {{ getI18nText(ach.titleKey, ach.title) || defaultTitleText }}
              </div>
              <div class="ach-desc">{{ getI18nText(ach.descKey, ach.desc) }}</div>
            </div>
            <div class="ach-time">
              {{ timeNowText }}
            </div>
          </div>
        </transition-group>

        <div
          v-if="achievements.length === 0"
          class="h-full flex items-center justify-center text-gray-500 italic text-sm">
          {{ noRecentText }}
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

const unlockedText = computed(() => getI18nText('achievementUnlocked', 'Achievement Unlocked'));
const defaultTitleText = computed(() => getI18nText('achievementDefaultTitle', 'Achievement'));
const timeNowText = computed(() => getI18nText('achievementTimeNow', 'Now'));
const noRecentText = computed(() => getI18nText('achievementNoRecent', 'No recent achievements'));

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
.ach-root {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ach-root.ach-embed {
  width: 100%;
  padding: 4px 10px;
  overflow: hidden;
  gap: 8px;
}

.ach-card {
  display: flex;
  align-items: center;
  background: rgb(245, 245, 245);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  padding: 10px;
  margin: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(0, 0, 0, 0.1);
  color: #0b1220;
  animation: ach-in 300ms ease forwards;
}

:global(html.dark) .ach-card {
  background: rgb(18, 18, 18);
  color: #f5f5f5;
}

.ach-root.ach-embed .ach-card {
  padding: 8px;
  border-radius: 8px;
}

.ach-icon {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  background: #e5e7eb;
  color: #374151;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
  font-weight: 600;
  font-size: 14px;
}

:global(html.dark) .ach-icon {
  background: #09090b;
  color: #f3f4f6;
}

.ach-root.ach-embed .ach-icon {
  width: 28px;
  height: 28px;
  margin-right: 8px;
}

.ach-content {
  flex: 1;
  min-width: 0;
}

.ach-app {
  font-size: 12px;
  margin-bottom: 2px;
  font-weight: bold;
  color: #059669;
}

:global(html.dark) .ach-app {
  color: #00ff7f;
}

.ach-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ach-root.ach-embed .ach-title {
  font-size: 15px;
}

.ach-desc {
  font-size: 13px;
  opacity: 0.8;
}

.ach-root.ach-embed .ach-desc {
  font-size: 12px;
}

.ach-time {
  font-size: 12px;
  opacity: 0.6;
  align-self: flex-start;
  margin-left: 8px;
}

.ach-root.ach-embed .ach-time {
  font-size: 11px;
  margin-left: 6px;
}

@keyframes ach-in {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: #4a5568 transparent;
}

.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
