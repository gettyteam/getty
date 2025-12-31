<template>
  <div class="widget-selector bg-card flex flex-col h-full">
    <div class="p-4 border-b border-border">
      <h3 class="font-semibold text-lg">
        {{ getI18nText('dashboardAddWidgetTitle', 'Add Widget') }}
      </h3>
      <p class="text-xs text-muted-foreground">
        {{ getI18nText('dashboardAddWidgetHint', 'Click to add to dashboard') }}
      </p>
    </div>
    <div class="flex-1 overflow-y-auto p-4 space-y-3">
      <button
        v-for="type in availableWidgets"
        :key="type"
        :disabled="isAlreadyAdded(type)"
        @click="() => !isAlreadyAdded(type) && $emit('add', type)"
        class="w-full flex items-center gap-3 p-3 rounded-lg border border-border transition-all text-left group"
        :class="
          isAlreadyAdded(type)
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-secondary/50 hover:border-primary/50'
        ">
        <div
          class="h-8 w-8 rounded bg-secondary flex items-center justify-center transition-colors"
          :class="isAlreadyAdded(type) ? '' : 'group-hover:bg-primary/10 group-hover:text-primary'">
          <i :class="getIcon(type)" class="text-lg"></i>
        </div>
        <div class="flex-1">
          <div class="font-medium text-sm">{{ getTitle(type) }}</div>
          <div class="text-xs text-muted-foreground capitalize">{{ type.replace('-', ' ') }}</div>
        </div>
        <i
          :class="
            isAlreadyAdded(type)
              ? 'pi pi-check text-muted-foreground'
              : 'pi pi-plus text-muted-foreground group-hover:text-primary'
          " />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useDashboardStore } from '../../stores/dashboardStore';
import { widgetTitles } from '../../utils/widgetRegistry';
import { computed } from 'vue';
// @ts-ignore
import { i18nTrigger } from '../../pages/dashboard/languageManager';

const store = useDashboardStore();
const { availableWidgets, layout } = storeToRefs(store);

defineEmits(['add']);

const getI18nText = (key: string, fallback: string) => {
  i18nTrigger.value;
  if (
    (window as any).languageManager &&
    typeof (window as any).languageManager.getText === 'function'
  ) {
    const translated = (window as any).languageManager.getText(key);
    return translated && translated !== key ? translated : fallback;
  }
  return fallback;
};

const widgetTitleKeys: Record<string, string> = {
  chat: 'chat',
  'last-tip': 'lastTip',
  goal: 'tipGoal',
  alerts: 'recentEventsTitle',
  raffle: 'giveawaysTitle',
  achievements: 'achievementsTitle',
  stats: 'streamStatsTitle',
};

const getTitle = (type: string) => {
  const fallback = widgetTitles[type as keyof typeof widgetTitles] || type;
  const key = widgetTitleKeys[type];
  return key ? getI18nText(key, fallback) : fallback;
};

const existingTypes = computed(() => new Set(layout.value.map((w) => w.type)));
const isAlreadyAdded = (type: string) => existingTypes.value.has(type as any);

const getIcon = (type: string) => {
  switch (type) {
    case 'chat':
      return 'pi pi-comments';
    case 'stats':
      return 'pi pi-chart-bar';
    case 'alerts':
      return 'pi pi-bell';
    case 'goal':
      return 'pi pi-flag';
    case 'last-tip':
      return 'pi pi-dollar';
    case 'raffle':
      return 'pi pi-ticket';
    case 'achievements':
      return 'pi pi-trophy';
    default:
      return 'pi pi-box';
  }
};
</script>
