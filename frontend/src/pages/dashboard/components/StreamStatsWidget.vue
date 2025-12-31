<template>
  <section class="os-card overflow-hidden flex flex-col">
    <div class="px-4 py-3 bg-secondary/30 border-b border-border flex items-center justify-between">
      <div class="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span
          class="h-1.5 w-1.5 rounded-full"
          :class="isLiveNow ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/40'" />
        <span class="uppercase tracking-wide font-medium">{{
          isLiveNow ? liveNowText : offlineText
        }}</span>
      </div>

      <div class="text-[11px] text-muted-foreground font-medium">
        <span v-if="statusReasonText">{{ statusReasonText }}</span>
      </div>
    </div>

    <div class="p-4 space-y-3">
      <div v-if="needsConfiguration" class="text-sm text-muted-foreground">
        <div class="text-center mb-5">
          {{ getI18nText('streamStatsNotConfiguredPrefix', 'Configure') }}
          <span class="font-semibold">{{
            getI18nText('streamStatsLiveAnalytics', 'Live analytics')
          }}</span>
          {{
            getI18nText('streamStatsNotConfiguredSuffix', 'in admin/stream to enable Stream Stats.')
          }}
        </div>

        <div class="flex flex-col items-center justify-center text-center">
          <img
            src="https://static.odycdn.com/stickers/MISC/PNG/actually.png"
            alt=""
            class="h-[8.75rem] w-[8.75rem] max-w-full select-none object-contain"
            loading="lazy" />
        </div>
      </div>

      <div
        v-else-if="!isLiveNow"
        class="py-4 flex flex-col items-center justify-center text-center">
        <div class="text-xs text-muted-foreground font-semibold text-center mb-5">
          {{ getI18nText('streamStatsActiveDaysRange', 'Active days (range):') }}
          <span class="text-foreground font-semibold">{{
            formatNumber(perfRange.activeDays)
          }}</span>
          · {{ getI18nText('streamStatsAllTimeHoursStreamed', 'All-time hours streamed:') }}
          <span class="text-foreground font-semibold">{{
            formatNumber(perfAllTime.totalHoursStreamed)
          }}</span>
        </div>
        <img
          src="https://static.odycdn.com/stickers/MISC/PNG/waiting.png"
          alt=""
          class="h-[8.75rem] w-[8.75rem] max-w-full select-none object-contain"
          loading="lazy" />
        <div class="mt-2 text-sm font-semibold text-foreground">{{ offlineText }}</div>
      </div>

      <div v-else class="grid grid-cols-2 gap-3">
        <div class="rounded-os border border-border bg-secondary/30 p-3">
          <div class="text-[12px] uppercase tracking-wide font-semibold text-muted-foreground">
            {{ getI18nText('streamStatsAvgViewers', 'Avg viewers') }}
          </div>
          <div class="mt-1 text-xl font-semibold text-foreground">
            {{ formatNumber(perfRange.avgViewers) }}
          </div>
        </div>
        <div class="rounded-os border border-border bg-secondary/30 p-3">
          <div class="text-[12px] uppercase tracking-wide font-semibold text-muted-foreground">
            {{ getI18nText('streamStatsPeakViewers', 'Peak viewers') }}
          </div>
          <div class="mt-1 text-xl font-semibold text-foreground">
            {{ formatNumber(perfRange.peakViewers) }}
          </div>
        </div>
        <div class="rounded-os border border-border bg-secondary/30 p-3">
          <div class="text-[12px] uppercase tracking-wide font-semibold text-muted-foreground">
            {{ getI18nText('streamStatsHoursStreamed', 'Hours streamed') }}
          </div>
          <div class="mt-1 text-xl font-semibold text-foreground">
            {{ formatNumber(perfRange.hoursStreamed) }}
          </div>
          <div
            v-if="hoursStreamedDelta"
            class="mt-1 text-[11px] font-semibold"
            :class="hoursStreamedDelta.className">
            {{ hoursStreamedDelta.arrow }} {{ hoursStreamedDelta.text }}
          </div>
        </div>
        <div class="rounded-os border border-border bg-secondary/30 p-3">
          <div class="text-[11px] uppercase tracking-wide text-muted-foreground">
            {{ getI18nText('streamStatsHoursWatched', 'Hours watched') }}
          </div>
          <div class="mt-1 text-xl font-semibold text-foreground">
            {{ formatNumber(perfRange.hoursWatched) }}
          </div>
        </div>
      </div>

      <div v-if="!needsConfiguration && isLiveNow" class="text-xs text-muted-foreground">
        {{ getI18nText('streamStatsActiveDaysRange', 'Active days (range):') }}
        <span class="text-foreground font-medium">{{ formatNumber(perfRange.activeDays) }}</span>
        · {{ getI18nText('streamStatsAllTimeHoursStreamed', 'All-time hours streamed:') }}
        <span class="text-foreground font-medium">{{
          formatNumber(perfAllTime.totalHoursStreamed)
        }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue';
import { useWidgetStore } from '../../../stores/widgetStore';
// @ts-ignore
import { i18nTrigger } from '../languageManager';

const store = useWidgetStore();

let pollTimer: number | null = null;

const isLiveNow = computed(() => !!store.streamHistoryStatus?.live);
const liveNowText = computed(() => getI18nText('liveNow', 'Live now').toUpperCase());
const offlineText = computed(() => getI18nText('publicProfileOffline', 'Offline').toUpperCase());

const needsConfiguration = computed(() => {
  const reason = store.streamHistoryStatus?.reason;
  return reason === 'no_claimid';
});

const statusReasonText = computed(() => {
  const st: any = store.streamHistoryStatus;
  if (!st) return '';
  if (st.reason === 'no_claimid') {
    return getI18nText('streamStatsStatusNotConfigured', 'Not configured').toUpperCase();
  }
  if (st.connected === false && st.reason === 'stale') {
    return getI18nText('streamStatsStatusStale', 'Stale').toUpperCase();
  }
  if (st.connected === true) {
    return getI18nText('streamStatsStatusConnected', 'Connected').toUpperCase();
  }
  return '';
});

const perfRange = computed(() => {
  const r = (store.streamHistoryPerf as any)?.range;
  return {
    hoursStreamed: Number(r?.hoursStreamed || 0),
    avgViewers: Number(r?.avgViewers || 0),
    peakViewers: Number(r?.peakViewers || 0),
    hoursWatched: Number(r?.hoursWatched || 0),
    activeDays: Number(r?.activeDays || 0),
  };
});

const perfAllTime = computed(() => {
  const a = (store.streamHistoryPerf as any)?.allTime;
  return {
    totalHoursStreamed: Number(a?.totalHoursStreamed || 0),
  };
});

const hoursStreamedDelta = computed<null | { arrow: string; text: string; className: string }>(
  () => {
    const summary = store.streamHistorySummary as any;
    const data = Array.isArray(summary?.data) ? summary.data : null;
    if (!data || data.length < 2) return null;

    const prev = Number(data[data.length - 2]?.hours);
    const cur = Number(data[data.length - 1]?.hours);
    if (!Number.isFinite(prev) || !Number.isFinite(cur)) return null;

    const delta = +(cur - prev).toFixed(2);
    if (!Number.isFinite(delta) || delta === 0) return null;

    const up = delta > 0;
    const arrow = up ? '▲' : '▼';
    const className = up ? 'text-green-500' : 'text-red-500';
    const abs = Math.abs(delta);
    const text = `${formatNumber(abs)} ${getI18nText('streamStatsVsYesterday', 'vs yesterday')}`;
    return { arrow, text, className };
  }
);

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

function formatNumber(n: any): string {
  const num = Number(n);
  if (!Number.isFinite(num)) return '0';
  if (Math.abs(num) >= 1000) return num.toLocaleString();
  return String(num);
}

async function refresh() {
  await store.fetchStreamHistoryStatus?.().catch(() => {});
  await store.fetchStreamHistoryPerformance?.().catch(() => {});
  await store.fetchStreamHistorySummary?.({ period: 'day', span: 2 }).catch(() => {});
}

onMounted(() => {
  refresh();
  pollTimer = window.setInterval(() => {
    refresh();
  }, 15000);
});

onBeforeUnmount(() => {
  if (pollTimer != null) window.clearInterval(pollTimer);
  pollTimer = null;
});
</script>
