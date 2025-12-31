<template>
  <section
    class="os-card overflow-hidden flex flex-col"
    :class="{ 'h-[500px]': !props.inCustomGrid }">
    <BlockedState v-if="isBlocked" module-name="Recent Events" />
    <template v-else>
      <div
        class="px-2 py-3 bg-secondary/30 border-b border-border flex items-center justify-between"
        :class="props.inCustomGrid ? 'mb-1' : 'mb-2'">
        <div class="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span
            class="h-1.5 w-1.5 rounded-full"
            :class="isLiveNow ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/40'" />
          <span class="uppercase tracking-wide font-medium">
            {{ isLiveNow ? liveNowText : offlineText }}
          </span>
        </div>
        <div class="text-[11px] text-muted-foreground font-medium">
          {{ activitiesTodayText }}
        </div>
      </div>

      <div class="flex-1 min-h-0 overflow-hidden">
        <div
          v-if="eventsToShow.length === 0"
          class="h-full flex items-center justify-center text-muted-foreground text-sm px-3">
          {{ getI18nText('recentEventsWaiting', 'Waiting for events...') }}
        </div>

        <div v-else class="h-full min-h-0 flex flex-col" :class="{ 'p-3': props.inCustomGrid }">
          <div
            class="re-list"
            :class="{
              'is-scroll': shouldCappedScroll,
              'free-scroll': props.inCustomGrid,
            }"
            role="list">
            <div
              v-for="ev in eventsToShow"
              :key="ev.id"
              class="re-item group flex items-start gap-3 rounded-lg px-2 py-2 bg-secondary/30 hover:bg-secondary/50 active:bg-secondary/60 transition-colors border border-border"
              role="listitem">
              <div
                class="feed-badge mt-0.5 h-7 w-7 rounded-full text-white flex items-center justify-center text-xs font-semibold shrink-0"
                style="background-color: #22c55e; color: #fff">
                {{ iconForKind(ev.kind) }}
              </div>
              <div class="min-w-0 flex-1">
                <div class="text-[14px] font-semibold text-foreground capitalize">
                  {{ labelForKind(ev.kind) }}
                </div>
                <div class="text-[14px] font-semibold text-foreground leading-snug break-words">
                  {{ ev.label }}
                </div>
              </div>
              <div class="text-xs text-muted-foreground whitespace-nowrap pt-0.5">
                {{ formatAgo(ev.ts) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useWidgetStore } from '../../../stores/widgetStore';
import BlockedState from './BlockedState.vue';
// @ts-ignore
import { i18nTrigger } from '../languageManager';

const props = defineProps({
  isBlocked: {
    type: Boolean,
    default: false,
  },
  inCustomGrid: {
    type: Boolean,
    default: false,
  },
});

type FeedEvent = {
  id: string;
  ts: number;
  label: string;
  kind: FeedKind;
};

type FeedKind = 'tip' | 'achievement' | 'giveaway';

const store = useWidgetStore();

const isLiveNow = computed(
  () => !!store.liveviewsStatus?.live || !!store.streamHistoryStatus?.live
);
const liveNowText = computed(() => getI18nText('liveNow', 'Live now').toUpperCase());
const offlineText = computed(() => getI18nText('publicProfileOffline', 'Offline').toUpperCase());
const activitiesTodayText = computed(() => {
  const count = Number(store.activitiesTodayCount || 0);
  const suffix = getI18nText('recentEventsActivitiesToday', 'activities today');
  return `${Number.isFinite(count) ? count : 0} ${suffix}`;
});

const tipEvents = ref<FeedEvent[]>([]);

let livePollTimer: number | null = null;

function iconForKind(_kind: FeedKind): string {
  if (_kind === 'tip') return '$';
  if (_kind === 'achievement') return '✔';
  return '✱';
}

function labelForKind(kind: FeedKind): string {
  if (kind === 'tip') return getI18nText('recentEventsKindTip', 'Tip');
  if (kind === 'achievement') return getI18nText('recentEventsKindAchievement', 'Achievement');
  return getI18nText('recentEventsKindGiveaway', 'Giveaway');
}

const getI18nText = (key: string, fallback: string) => {
  i18nTrigger.value;
  if (
    (window as any).languageManager &&
    typeof (window as any).languageManager.getText === 'function'
  ) {
    const v = (window as any).languageManager.getText(key);
    if (typeof v !== 'string') return fallback;
    const trimmed = v.trim();
    if (!trimmed) return fallback;
    if (trimmed.toLowerCase() === key.toLowerCase()) return fallback;
    return trimmed;
  }
  return fallback;
};

function formatAgo(ts: number): string {
  const diffMs = Math.max(0, Date.now() - ts);
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 10) return getI18nText('timeNow', 'now');
  if (diffSec < 60) return `${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d`;
}

function formatTipLabel(data: any): string {
  const amount = (() => {
    if (typeof data?.arAmount === 'number') return data.arAmount;
    if (data?.amount != null) {
      const n = Number(data.amount);
      return Number.isFinite(n) ? n : null;
    }
    if (data?.credits != null) {
      const n = Number(data.credits);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  })();

  const amountStr = amount == null ? '' : `${amount.toFixed(2)} AR`;
  const from = (data?.channelTitle || data?.from || '').toString().trim();

  if (from) {
    return `New tip: ${amountStr} from ${from}`.trim();
  }
  return `New tip: ${amountStr}`.trim();
}

function formatAchievementLabel(a: any): string {
  const title = (a?.title || a?.name || a?.titleKey || '').toString().trim();
  if (title) return `Achievement unlocked: ${title}`;
  return getI18nText('achievementUnlocked', 'Achievement unlocked');
}

watch(
  () => store.activeNotification,
  (newVal) => {
    if (!newVal) return;

    const ts = typeof newVal?.timestamp === 'number' ? (newVal.timestamp as number) : Date.now();
    tipEvents.value.unshift({
      id: `tip-${ts}-${Math.random().toString(16).slice(2)}`,
      ts,
      label: formatTipLabel(newVal),
      kind: 'tip',
    } satisfies FeedEvent);

    if (tipEvents.value.length > 30) tipEvents.value = tipEvents.value.slice(0, 30);
  }
);

const achievementEvents = computed<FeedEvent[]>(() => {
  const raw = Array.isArray(store.achievements) ? store.achievements : [];
  return raw
    .map((a: any) => {
      const ts =
        typeof a?.timestamp === 'number'
          ? (a.timestamp as number)
          : typeof a?.createdAt === 'number'
            ? (a.createdAt as number)
            : Date.now();
      return {
        id: `ach-${String(a?.id ?? '')}-${ts}`,
        ts,
        label: formatAchievementLabel(a),
        kind: 'achievement',
      } satisfies FeedEvent;
    })
    .slice(-30);
});

const raffleEvents = computed<FeedEvent[]>(() => {
  const events: FeedEvent[] = [];

  if (store.raffleWinner) {
    const ts =
      typeof (store.raffleWinner as any)?.timestamp === 'number'
        ? ((store.raffleWinner as any).timestamp as number)
        : Date.now();
    const winner = (store.raffleWinner as any)?.winner;
    const winnerName = (winner?.name || winner?.channelTitle || winner?.channel || winner?.id || '')
      .toString()
      .trim();
    const prize = ((store.raffleWinner as any)?.prize || winner?.prize || '').toString().trim();
    const labelParts = [
      getI18nText('giveawayWinner', 'Giveaway winner'),
      winnerName ? `: ${winnerName}` : '',
      prize ? ` (${prize})` : '',
    ];

    events.push({
      id: `raffle-winner-${ts}`,
      ts,
      label: labelParts.join(''),
      kind: 'giveaway',
    } satisfies FeedEvent);
  }

  if (store.raffleState) {
    const state: any = store.raffleState;
    const ts = typeof state?.timestamp === 'number' ? (state.timestamp as number) : Date.now();
    const active = !!state.active;
    const paused = !!state.paused;
    let label = '';
    if (active && paused) {
      label = getI18nText('giveawayPaused', 'Giveaway paused');
    } else if (active) {
      label = getI18nText('giveawayActive', 'Giveaway active');
    } else {
      label = getI18nText('giveawayEnded', 'Giveaway ended');
    }
    events.push({ id: `raffle-state-${ts}`, ts, label, kind: 'giveaway' } satisfies FeedEvent);
  }

  return events;
});

const events = computed<FeedEvent[]>(() => {
  const merged = [...tipEvents.value, ...achievementEvents.value, ...raffleEvents.value];
  merged.sort((a, b) => b.ts - a.ts);
  return merged.slice(0, 30);
});

const VISIBLE_EVENTS_BEFORE_SCROLL = 5;
const MAX_EVENTS_TO_RENDER = 10;

const eventsToShow = computed<FeedEvent[]>(() => events.value.slice(0, MAX_EVENTS_TO_RENDER));
const shouldCappedScroll = computed(
  () => !props.inCustomGrid && eventsToShow.value.length > VISIBLE_EVENTS_BEFORE_SCROLL
);

onMounted(() => {
  store.initWebSocket();
  store.fetchLiveviewsStatus?.().catch(() => {});
  store.fetchStreamHistoryStatus?.().catch(() => {});
  livePollTimer = window.setInterval(() => {
    store.fetchLiveviewsStatus?.().catch(() => {});
    store.fetchStreamHistoryStatus?.().catch(() => {});
  }, 15000);
});

onBeforeUnmount(() => {
  if (livePollTimer != null) window.clearInterval(livePollTimer);
  livePollTimer = null;
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

.re-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow-x: hidden;
  padding-right: 0px;
  overflow-y: hidden;
  flex: 1;
  min-height: 0;
  max-height: calc((76px * 5) + (0.5rem * 4));
}

.re-list.free-scroll {
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  max-height: none;
}

.re-list.free-scroll::-webkit-scrollbar {
  display: none;
}

.re-list.is-scroll {
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  max-height: calc((76px * 5) + (0.5rem * 4));
}

.re-list.is-scroll::-webkit-scrollbar {
  display: none;
}
</style>
