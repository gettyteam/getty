<template>
  <div class="channel-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">{{ t('channelAnalyticsEyebrow') }}</p>
        <p class="muted">{{ t('channelAnalyticsSubtitle') }}</p>
      </div>
      <div class="actions" v-if="!isBlocked">
        <ChannelRangeFilter v-model="range" />
        <button
          class="ghost-btn"
          type="button"
          @click="toggleConfigVisibility"
          :aria-pressed="configVisible ? 'true' : 'false'">
          <i class="pi" :class="configVisible ? 'pi-eye-slash' : 'pi-eye'" aria-hidden="true"></i>
          <span class="sr-only md:not-sr-only">{{
            configVisible ? t('channelHideConfig') : t('channelShowConfig')
          }}</span>
        </button>
        <button
          class="ghost-btn"
          type="button"
          @click="refreshOverview"
          :disabled="overview.loading || configState.loading || !analyticsReady">
          <i class="pi pi-sync" aria-hidden="true"></i>
          <span class="sr-only md:not-sr-only">{{ t('commonRefresh') }}</span>
        </button>
      </div>
    </header>

    <BlockedState
      v-if="isBlocked"
      :module-name="t('channelAnalyticsEyebrow')"
      :details="blockDetails" />

    <section v-else class="layout-grid" :class="{ 'layout-single': !configVisible }">
      <article class="overview-card">
        <div class="totals">
          <div class="total-card" v-for="card in totalCards" :key="card.key">
            <p class="label">
              <i v-if="card.icon" class="pi" :class="card.icon" aria-hidden="true"></i>
              <!-- eslint-disable-next-line vue/no-v-html -->
              <span v-else-if="card.svg" class="custom-icon" v-html="card.svg"></span>
              <span>{{ card.label }}</span>
            </p>
            <p class="value">
              <SkeletonLoader v-if="overview.loading" class="w-24 h-10" />
              <span v-else-if="totalsUnavailable" class="text-[1.5rem] font-semibold">
                {{ t('commonNotAvailable') }}
              </span>
              <AnimatedNumber v-else :value="card.rawValue" :formatter="numberFormatter" />
            </p>
            <p class="hint">{{ card.hint }}</p>
          </div>
        </div>

        <div v-if="highlights" class="highlights-card">
          <div class="highlights-header">
            <div>
              <h3 class="highlight-title">
                <i class="pi pi-trophy" aria-hidden="true"></i>
                <span>{{ t('channelHighlightsTitle') }}</span>
              </h3>
              <p class="muted">{{ t('channelHighlightsSubtitle') }}</p>
            </div>
          </div>
          <div class="highlight-stats">
            <div class="highlight-stat">
              <p class="stat-label">{{ t('channelHighlightsViews') }}</p>
              <p class="stat-value">{{ formatMetric(highlights.views) }}</p>
              <p class="delta" :class="deltaClass(highlights.viewsChange)">
                {{ formatDelta(highlights.viewsChange) }}
                <span class="delta-range">({{ deltaRangeLabel }})</span>
              </p>
              <div class="highlight-trend-icon">
                <svg
                  v-if="highlights.viewsChange && highlights.viewsChange > 0"
                  width="2rem"
                  height="2rem"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  class="icon-positive">
                  <path
                    d="M22 7L14.1314 14.8686C13.7354 15.2646 13.5373 15.4627 13.309 15.5368C13.1082 15.6021 12.8918 15.6021 12.691 15.5368C12.4627 15.4627 12.2646 15.2646 11.8686 14.8686L9.13137 12.1314C8.73535 11.7354 8.53735 11.5373 8.30902 11.4632C8.10817 11.3979 7.89183 11.3979 7.69098 11.4632C7.46265 11.5373 7.26465 11.7354 6.86863 12.1314L2 17M22 7H15M22 7V14"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round" />
                </svg>
                <svg
                  v-else-if="highlights.viewsChange && highlights.viewsChange < 0"
                  width="2rem"
                  height="2rem"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  class="icon-negative">
                  <path
                    d="M22 17L14.1314 9.13137C13.7354 8.73535 13.5373 8.53735 13.309 8.46316C13.1082 8.3979 12.8918 8.3979 12.691 8.46316C12.4627 8.53735 12.2646 8.73535 11.8686 9.13137L9.13137 11.8686C8.73535 12.2646 8.53735 12.4627 8.30902 12.5368C8.10817 12.6021 7.89183 12.6021 7.69098 12.5368C7.46265 12.4627 7.26465 12.2646 6.86863 11.8686L2 7M22 17H15M22 17V10"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round" />
                </svg>
                <svg
                  v-else
                  width="2rem"
                  height="2rem"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  class="icon-negative">
                  <path
                    d="M22 17L14.1314 9.13137C13.7354 8.73535 13.5373 8.53735 13.309 8.46316C13.1082 8.3979 12.8918 8.3979 12.691 8.46316C12.4627 8.53735 12.2646 8.73535 11.8686 9.13137L9.13137 11.8686C8.73535 12.2646 8.53735 12.4627 8.30902 12.5368C8.10817 12.6021 7.89183 12.6021 7.69098 12.5368C7.46265 12.4627 7.26465 12.2646 6.86863 11.8686L2 7M22 17H15M22 17V10"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round" />
                </svg>
              </div>
            </div>
            <div class="highlight-stat">
              <p class="stat-label">{{ t('channelHighlightsFollowers') }}</p>
              <p class="stat-value">{{ formatMetric(highlights.subs) }}</p>
              <p class="delta" :class="deltaClass(highlights.subsChange)">
                {{ formatDelta(highlights.subsChange) }}
                <span class="delta-range">({{ deltaRangeLabel }})</span>
              </p>
              <div class="highlight-trend-icon">
                <svg
                  v-if="highlights.subsChange && highlights.subsChange > 0"
                  width="2rem"
                  height="2rem"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  class="icon-positive">
                  <path
                    d="M22 7L14.1314 14.8686C13.7354 15.2646 13.5373 15.4627 13.309 15.5368C13.1082 15.6021 12.8918 15.6021 12.691 15.5368C12.4627 15.4627 12.2646 15.2646 11.8686 14.8686L9.13137 12.1314C8.73535 11.7354 8.53735 11.5373 8.30902 11.4632C8.10817 11.3979 7.89183 11.3979 7.69098 11.4632C7.46265 11.5373 7.26465 11.7354 6.86863 12.1314L2 17M22 7H15M22 7V14"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round" />
                </svg>
                <svg
                  v-else-if="highlights.subsChange && highlights.subsChange < 0"
                  width="2rem"
                  height="2rem"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  class="icon-negative">
                  <path
                    d="M22 17L14.1314 9.13137C13.7354 8.73535 13.5373 8.53735 13.309 8.46316C13.1082 8.3979 12.8918 8.3979 12.691 8.46316C12.4627 8.53735 12.2646 8.73535 11.8686 9.13137L9.13137 11.8686C8.73535 12.2646 8.53735 12.4627 8.30902 12.5368C8.10817 12.6021 7.89183 12.6021 7.69098 12.5368C7.46265 12.4627 7.26465 12.2646 6.86863 11.8686L2 7M22 17H15M22 17V10"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round" />
                </svg>
                <svg
                  v-else
                  width="2rem"
                  height="2rem"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  class="icon-negative">
                  <path
                    d="M22 17L14.1314 9.13137C13.7354 8.73535 13.5373 8.53735 13.309 8.46316C13.1082 8.3979 12.8918 8.3979 12.691 8.46316C12.4627 8.53735 12.2646 8.73535 11.8686 9.13137L9.13137 11.8686C8.73535 12.2646 8.53735 12.4627 8.30902 12.5368C8.10817 12.6021 7.89183 12.6021 7.69098 12.5368C7.46265 12.4627 7.26465 12.2646 6.86863 11.8686L2 7M22 17H15M22 17V10"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round" />
                </svg>
              </div>
            </div>
          </div>
          <div v-if="highlightVideoCards.length" class="highlight-videos">
            <article
              v-for="entry in highlightVideoCards"
              :key="entry.key"
              class="highlight-video-card">
              <div
                v-if="entry.trend"
                class="trend-chart-wrapper"
                :class="{ 'trend-neutral': entry.trend.neutral }">
                <MiniTrendChart
                  v-if="!entry.trend.neutral"
                  class="trend-chart"
                  :points="entry.trend.series"
                  :color="entry.trend.color"
                  :height="120"
                  :aria-label="trendAriaLabel(entry.trend)" />
                <div v-else class="trend-neutral-line" role="presentation" aria-hidden="true">
                  <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    class="trend-neutral-svg icon-negative">
                    <path
                      d="M22 17L14.1314 9.13137C13.7354 8.73535 13.5373 8.53735 13.309 8.46316C13.1082 8.3979 12.8918 8.3979 12.691 8.46316C12.4627 8.53735 12.2646 8.73535 11.8686 9.13137L9.13137 11.8686C8.73535 12.2646 8.53735 12.4627 8.30902 12.5368C8.10817 12.6021 7.89183 12.6021 7.69098 12.5368C7.46265 12.4627 7.26465 12.2646 6.86863 11.8686L2 7M22 17H15M22 17V10"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round" />
                  </svg>
                </div>
              </div>
              <i
                v-if="entry.trend && !entry.trend.neutral"
                class="pi trend-icon"
                :class="[entry.trend.icon, entry.trend.direction]"
                aria-hidden="true"></i>
              <p class="video-label">{{ entry.label }}</p>
              <template v-if="entry.video">
                <p class="video-title">
                  <a
                    v-if="entry.video?.url"
                    class="video-title-link"
                    :href="entry.video.url"
                    target="_blank"
                    rel="noreferrer"
                    :title="resolveVideoTitle(entry.video)">
                    <span>{{ formatVideoTitle(entry.video) }}</span>
                    <i class="pi pi-link link-indicator" aria-hidden="true"></i>
                  </a>
                  <span v-else :title="resolveVideoTitle(entry.video)">
                    {{ formatVideoTitle(entry.video) }}
                  </span>
                </p>
                <p class="video-views">
                  {{ formatMetric(entry.video?.views) }}
                  {{
                    entry.metricKey === 'comments'
                      ? t('channelHighlightsCommentsShort')
                      : t('channelHighlightsViewsShort')
                  }}
                  <span class="delta" :class="deltaClass(entry.video?.change)">
                    {{ formatDelta(entry.video?.change) }}
                    <span class="delta-range">({{ deltaRangeLabel }})</span>
                  </span>
                </p>
              </template>
              <p v-else class="video-empty">{{ t('channelHighlightsNoVideo') }}</p>
            </article>
          </div>
          <p v-else class="muted">{{ t('channelHighlightsNoVideo') }}</p>
        </div>

        <div class="chart-card">
          <div class="chart-header">
            <div>
              <h3 class="chart-title">
                <i class="pi pi-video" aria-hidden="true"></i>
                <span>{{ t('channelChartTitle') }}</span>
              </h3>
              <p class="muted">{{ t('channelChartHint') }}</p>
            </div>
            <div class="chart-meta">
              <p v-if="overview.data?.updatedAt" class="muted text-sm">
                {{ t('lastUpdated') }} · {{ formatRelative(overview.data.updatedAt) }}
              </p>
              <button
                v-if="showRefreshButton"
                type="button"
                class="refresh-btn"
                :disabled="refreshBlocked"
                @click="handleRefresh"
                :title="refreshBlocked ? t('channelRefreshBlocked') : t('channelRefreshTooltip')">
                <i class="pi pi-sync" :class="{ spinning: overview.loading }"></i>
              </button>
            </div>
          </div>

          <div v-if="overview.loading || configState.loading" class="skeleton-chart"></div>
          <div v-else-if="emptyState" class="empty-state">
            <p>{{ emptyStateMessage }}</p>
          </div>
          <ChannelBarChart v-else :labels="chartLabels" :datasets="chartDatasets" :height="320" />
        </div>
      </article>

      <ChannelAnalyticsConfig
        v-if="configVisible"
        :config="configState.data"
        :loading="configState.loading"
        @saved="handleConfigSaved" />
    </section>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import ChannelRangeFilter from './ChannelRangeFilter.vue';
import ChannelBarChart from './ChannelBarChart.vue';
import ChannelAnalyticsConfig from './ChannelAnalyticsConfig.vue';
import MiniTrendChart from './MiniTrendChart.vue';
import BlockedState from '../shared/BlockedState.vue';
import SkeletonLoader from '../SkeletonLoader.vue';
import {
  fetchChannelAnalyticsEnvelope,
  fetchChannelAnalyticsConfig,
  type ChannelAnalyticsOverview,
  type ChannelAnalyticsConfigResponse,
  type ChannelAnalyticsRange,
  type ChannelAnalyticsHighlightVideo,
} from '../../services/channelAnalytics';
import { pushToast } from '../../services/toast';
import { useWalletSession } from '../../composables/useWalletSession';
import AnimatedNumber from './AnimatedNumber.vue';

const { t, locale } = useI18n();

const contentViewsSeriesEnabled = true;
const wallet = useWalletSession();
const range = ref<ChannelAnalyticsRange>('week');
const configVisible = ref(false);
const overview = reactive<{
  loading: boolean;
  data: ChannelAnalyticsOverview | null;
  error: boolean;
  stale: boolean;
  fetchedAt: string | null;
}>({
  loading: false,
  data: null,
  error: false,
  stale: false,
  fetchedAt: null,
});
const configState = reactive<{ loading: boolean; data: ChannelAnalyticsConfigResponse | null }>({
  loading: false,
  data: null,
});
const isBlocked = ref(false);
const blockDetails = ref({});
const numberFormatter = computed(() => createNumberFormatter());
const analyticsReady = computed(() => {
  const cfg = configState.data;
  return Boolean(cfg?.claimId && cfg?.hasAuthToken);
});

let sessionUpdatedHandler: ((e?: Event) => void) | null = null;

async function ensureSession() {
  try {
    await wallet.refresh();
  } catch {}
}

async function loadConfig() {
  configState.loading = true;
  isBlocked.value = false;
  try {
    configState.data = await fetchChannelAnalyticsConfig();
  } catch (err: any) {
    if (
      err?.response?.data?.error === 'CONFIGURATION_BLOCKED' ||
      err?.response?.data?.error === 'configuration_blocked'
    ) {
      isBlocked.value = true;
      const details = err.response.data.details;
      blockDetails.value = typeof details === 'string' ? { reason: details } : details || {};
      return;
    }
    pushToast({ type: 'error', message: t('channelConfigLoadFailed') });
    console.error(err);
  } finally {
    configState.loading = false;
  }
}

function extractApiErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const response = (error as { response?: unknown }).response;
  if (typeof response !== 'object' || response === null) return undefined;
  const data = (response as { data?: unknown }).data;
  if (typeof data !== 'object' || data === null) return undefined;
  const code = (data as { error?: unknown }).error;
  return typeof code === 'string' ? code : undefined;
}

async function loadOverview(selectedRange = range.value) {
  if (!analyticsReady.value) {
    overview.data = null;
    overview.loading = false;
    overview.error = false;
    overview.stale = false;
    overview.fetchedAt = null;
    return;
  }
  overview.loading = true;
  overview.error = false;
  overview.stale = false;
  overview.fetchedAt = null;
  try {
    const envelope = await fetchChannelAnalyticsEnvelope(selectedRange);
    overview.data = envelope?.data || null;
    overview.stale = !!envelope?.stale;
    overview.fetchedAt = envelope?.fetchedAt || null;
  } catch (err) {
    overview.data = null;
    overview.error = true;
    overview.stale = false;
    overview.fetchedAt = null;
    const code = extractApiErrorCode(err);
    if (code === 'missing_claim' || code === 'missing_auth') {
      pushToast({ type: 'warning', message: t('channelAnalyticsMissingConfig') });
    } else {
      pushToast({ type: 'error', message: t('channelAnalyticsLoadFailed') });
    }
    console.error(err);
  } finally {
    overview.loading = false;
  }
}

function handleConfigSaved(next: ChannelAnalyticsConfigResponse) {
  configState.data = next;
  refreshOverview();
}

function refreshOverview() {
  if (!analyticsReady.value) {
    pushToast({ type: 'warning', message: t('channelAnalyticsMissingConfig') });
    return;
  }
  loadOverview(range.value);
}

function toggleConfigVisibility() {
  configVisible.value = !configVisible.value;
}

watch(range, (next) => {
  if (analyticsReady.value && !['halfyear', 'year'].includes(next)) {
    loadOverview(next);
  }
});

watch(
  () => analyticsReady.value,
  (ready) => {
    if (ready && !['halfyear', 'year'].includes(range.value)) {
      loadOverview(range.value);
    } else if (!ready) {
      overview.data = null;
      overview.error = false;
    }
  }
);

const totalsUnavailable = computed(() => {
  if (overview.loading) return false;
  if (overview.error) return true;
  if (!analyticsReady.value) return false;
  if (['halfyear', 'year'].includes(range.value)) return false;
  return !overview.data;
});

onMounted(async () => {
  await ensureSession();
  await loadConfig();
  if (analyticsReady.value && !['halfyear', 'year'].includes(range.value)) {
    await loadOverview(range.value);
  }
});

onMounted(() => {
  try {
    sessionUpdatedHandler = async () => {
      await ensureSession();
      await loadConfig();
    };
    window.addEventListener('getty-session-updated', sessionUpdatedHandler as any);
  } catch {}
});

onUnmounted(() => {
  try {
    if (sessionUpdatedHandler) {
      window.removeEventListener('getty-session-updated', sessionUpdatedHandler as any);
    }
  } catch {}
  sessionUpdatedHandler = null;
});

const emptyState = computed(() => {
  if (!analyticsReady.value) return true;
  if (!overview.data) return !['halfyear', 'year'].includes(range.value);
  return overview.data.bars.every((bar) => bar.views === 0 && bar.videos === 0);
});
const emptyStateMessage = computed(() => {
  if (!analyticsReady.value) return t('channelAnalyticsMissingConfig');
  if (['halfyear', 'year'].includes(range.value) && !overview.data) {
    return t('channelChartEmptyManual');
  }
  return t('channelChartEmpty');
});
const highlights = computed(() => overview.data?.highlights || null);
const deltaRangeLabel = computed(() => t('channelHighlightsDeltaRangeWeek'));

const chartLabels = computed(() => {
  if (!overview.data) return [];
  const currentRange = overview.data.range?.key;
  return overview.data.bars.map((bar) => formatBucketLabel(bar, currentRange));
});

const chartDatasets = computed(() => {
  if (!overview.data) return [];
  const accent = '#553FEE';
  const mint = '#22d3ee';
  const datasets = [] as Array<{
    label: string;
    backgroundColor: string;
    borderRadius: number;
    data: number[];
    yAxisID?: string;
  }>;
  if (contentViewsSeriesEnabled) {
    datasets.push({
      label: t('channelMetricViews'),
      backgroundColor: accent,
      borderRadius: 8,
      data: overview.data.bars.map((bar) => bar.views),
      yAxisID: 'y',
    });
  }
  datasets.push({
    label: t('channelMetricVideos'),
    backgroundColor: mint,
    borderRadius: 8,
    data: overview.data.bars.map((bar) => bar.videos),
    yAxisID: contentViewsSeriesEnabled ? 'y1' : 'y',
  });
  return datasets;
});

const totalCards = computed(() => {
  const totals = overview.data?.totals;
  const formatNumber = numberFormatter.value;

  const fireSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon--FireActive icon-fire" aria-hidden="true"><path d="M11.3969 23.04C11.3969 23.04 18.4903 21.8396 18.9753 16.2795C19.3997 9.89148 14.2161 7.86333 13.2915 4.56586C13.1861 4.2261 13.1051 3.88045 13.049 3.53109C12.9174 2.68094 12.8516 1.82342 12.852 0.964865C12.852 0.964865 5.607 0.426785 4.87947 10.6227C4.34858 10.1469 3.92655 9.57999 3.63777 8.9548C3.349 8.32962 3.19921 7.65853 3.19706 6.98033C3.19706 6.98033 -4.32074 18.7767 8.45649 23.04C7.94555 22.1623 7.67841 21.1842 7.67841 20.1909C7.67841 19.1976 7.94555 18.2195 8.45649 17.3418C9.54778 15.0653 9.97218 13.8788 9.97218 13.8788C9.97218 13.8788 15.5044 18.6525 11.3969 23.04Z" fill="#d62912" stroke-width="0"></path></svg>`;

  const slimeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon--SlimeActive" aria-hidden="true"><path d="M13.065 4.18508C12.5638 4.47334 11.9699 4.5547 11.4096 4.41183C10.8494 4.26896 10.367 3.91315 10.065 3.42008C9.70126 2.96799 9.52899 2.39146 9.58506 1.81392C9.64113 1.23639 9.92109 0.703759 10.365 0.330081C10.8662 0.0418164 11.4601 -0.0395341 12.0204 0.103332C12.5806 0.246199 13.063 0.602008 13.365 1.09508C13.7287 1.54717 13.901 2.12371 13.8449 2.70124C13.7889 3.27877 13.5089 3.8114 13.065 4.18508ZM2.565 6.76508C1.98518 6.6732 1.39241 6.81157 0.913189 7.15066C0.433971 7.48976 0.106262 8.00272 0 8.58008C0.0118186 9.17159 0.256137 9.73464 0.680058 10.1473C1.10398 10.56 1.67339 10.7891 2.265 10.7851C2.84509 10.8863 3.44175 10.7561 3.92691 10.4224C4.41207 10.0886 4.74707 9.57801 4.86 9.00008C4.85804 8.7046 4.79789 8.41241 4.683 8.14018C4.56811 7.86794 4.40072 7.62101 4.1904 7.41347C3.98007 7.20593 3.73093 7.04185 3.45719 6.9306C3.18345 6.81935 2.89048 6.7631 2.595 6.76508H2.565ZM22.2 15.1951C21.9286 15.0703 21.635 15.0008 21.3364 14.9907C21.0379 14.9806 20.7403 15.0301 20.461 15.1362C20.1818 15.2423 19.9264 15.403 19.7099 15.6088C19.4934 15.8146 19.3201 16.0615 19.2 16.3351C19.1369 16.6299 19.1337 16.9345 19.1906 17.2306C19.2475 17.5267 19.3634 17.8084 19.5313 18.0588C19.6992 18.3093 19.9157 18.5235 20.168 18.6886C20.4203 18.8537 20.7033 18.9665 21 19.0201C21.2714 19.1449 21.565 19.2143 21.8636 19.2244C22.1621 19.2346 22.4597 19.1851 22.739 19.079C23.0182 18.9729 23.2736 18.8122 23.4901 18.6064C23.7066 18.4005 23.8799 18.1536 24 17.8801C24.0634 17.5873 24.0677 17.2849 24.0127 16.9904C23.9577 16.696 23.8444 16.4155 23.6795 16.1654C23.5147 15.9153 23.3015 15.7007 23.0526 15.5341C22.8037 15.3674 22.524 15.2522 22.23 15.1951H22.2ZM20.34 10.2451C20.0073 9.99542 19.6009 9.86349 19.185 9.87008C18.4572 9.93018 17.7485 10.1341 17.1 10.4701C16.7447 10.6341 16.3789 10.7744 16.005 10.8901H15.69C15.5961 10.9108 15.4989 10.9108 15.405 10.8901C15 9.97508 16.5 9.00008 18.285 7.93508C18.8914 7.60883 19.4599 7.21644 19.98 6.76508C20.3961 6.30667 20.646 5.72169 20.6895 5.10413C20.733 4.48658 20.5677 3.87232 20.22 3.36008C19.9329 2.89588 19.5307 2.51381 19.0523 2.25098C18.574 1.98815 18.0358 1.85349 17.49 1.86008C17.2067 1.85969 16.9245 1.89496 16.65 1.96508C16.1585 2.08101 15.7042 2.31914 15.3293 2.65739C14.9543 2.99565 14.6708 3.42308 14.505 3.90008C14.16 4.75508 13.14 7.30508 12.135 7.71008C12.0359 7.72949 11.9341 7.72949 11.835 7.71008C11.6138 7.70259 11.3956 7.65692 11.19 7.57508C9.96 7.12508 9.6 5.62508 9.225 4.03508C9.06457 3.15891 8.79234 2.30695 8.415 1.50008C8.17043 1.04181 7.80465 0.659541 7.3576 0.395014C6.91055 0.130487 6.39941 -0.00612938 5.88 8.05856e-05C5.30686 0.011692 4.74338 0.149999 4.23 0.405081C3.872 0.589131 3.5547 0.843345 3.297 1.15258C3.03931 1.46182 2.84648 1.81976 2.73 2.20508C2.58357 2.66415 2.532 3.1482 2.57841 3.62781C2.62483 4.10743 2.76826 4.57261 3 4.99508C3.63898 5.99088 4.39988 6.90294 5.265 7.71008C5.59239 8.0233 5.90283 8.35377 6.195 8.70008C6.41249 8.94283 6.57687 9.22833 6.67761 9.5383C6.77835 9.84826 6.81322 10.1759 6.78 10.5001C6.68279 10.762 6.52008 10.9947 6.30737 11.1759C6.09467 11.3571 5.83908 11.4808 5.565 11.5351H5.19C4.89755 11.5247 4.60651 11.4896 4.32 11.4301C3.94485 11.3508 3.56329 11.3056 3.18 11.2951H3C2.50224 11.3269 2.02675 11.513 1.63964 11.8275C1.25253 12.142 0.973032 12.5694 0.84 13.0501C0.685221 13.5092 0.678705 14.0053 0.821373 14.4683C0.964041 14.9313 1.24867 15.3377 1.635 15.6301C1.97288 15.8809 2.38429 16.0127 2.805 16.0051C3.4891 15.9504 4.15377 15.751 4.755 15.4201C5.18104 15.1991 5.64344 15.0568 6.12 15.0001H6.285C6.32317 15.0086 6.35846 15.0269 6.38739 15.0532C6.41632 15.0795 6.4379 15.1129 6.45 15.1501C6.52858 15.4213 6.49621 15.7127 6.36 15.9601C5.80418 16.8088 4.95508 17.4229 3.975 17.6851C3.38444 17.8608 2.85799 18.205 2.46025 18.6756C2.06252 19.1462 1.81078 19.7226 1.73592 20.3342C1.66107 20.9458 1.76635 21.5659 2.03886 22.1185C2.31136 22.6711 2.73924 23.1321 3.27 23.4451C3.81477 23.8292 4.46349 24.0384 5.13 24.0451C6.1389 23.9485 7.08103 23.4979 7.7894 22.773C8.49778 22.0482 8.92665 21.0959 9 20.0851V19.9501C9.135 19.0351 9.33 17.7751 10.05 17.3401C10.2442 17.2216 10.4675 17.1593 10.695 17.1601C11.0828 17.1781 11.4558 17.3142 11.7641 17.5501C12.0724 17.786 12.3012 18.1105 12.42 18.4801C13.155 21.2251 13.725 23.4001 16.14 23.4001C16.4527 23.3961 16.7643 23.361 17.07 23.2951C17.8256 23.2158 18.5231 22.8527 19.0214 22.2792C19.5198 21.7057 19.7819 20.9644 19.755 20.2051C19.6664 19.6213 19.4389 19.0673 19.0918 18.5896C18.7446 18.112 18.2879 17.7246 17.76 17.4601C17.4534 17.2574 17.1625 17.0317 16.89 16.7851C16.005 15.9301 15.855 15.4051 15.885 15.1051C15.9198 14.8698 16.0313 14.6526 16.2021 14.4871C16.373 14.3217 16.5937 14.2173 16.83 14.1901H17.055C17.31 14.1901 17.61 14.1901 17.895 14.1901C18.18 14.1901 18.57 14.1901 18.84 14.1901H19.14C19.6172 14.1642 20.0748 13.9919 20.4505 13.6967C20.8263 13.4014 21.102 12.9976 21.24 12.5401C21.3316 12.1166 21.2981 11.6757 21.1436 11.2709C20.9892 10.8661 20.7204 10.5149 20.37 10.2601L20.34 10.2451Z" fill="#81C554" stroke-width="0"></path></svg>`;

  return [
    {
      key: 'views',
      label: t('channelTotalViews'),
      value: formatNumber(totals?.views || 0),
      rawValue: totals?.views || 0,
      hint: t('channelTotalViewsHint'),
      icon: 'pi-eye',
    },
    {
      key: 'videos',
      label: t('channelTotalVideos'),
      value: formatNumber(totals?.videos || 0),
      rawValue: totals?.videos || 0,
      hint: t('channelTotalVideosHint'),
      icon: 'pi-cloud-upload',
    },
    {
      key: 'subs',
      label: t('channelTotalSubs'),
      value: formatNumber(totals?.subscribers || 0),
      rawValue: totals?.subscribers || 0,
      hint: t('channelTotalSubsHint'),
      icon: 'pi-users',
    },
    {
      key: 'likes',
      label: t('channelTotalLikes'),
      value: formatNumber(totals?.likes || 0),
      rawValue: totals?.likes || 0,
      hint: t('channelTotalLikesHint'),
      svg: fireSvg,
    },
    {
      key: 'dislikes',
      label: t('channelTotalDislikes'),
      value: formatNumber(totals?.dislikes || 0),
      rawValue: totals?.dislikes || 0,
      hint: t('channelTotalDislikesHint'),
      svg: slimeSvg,
    },
  ];
});

const highlightVideoCards = computed(() => {
  const stats = highlights.value;
  if (!stats) return [];
  return [
    {
      key: 'all-time',
      label: t('channelHighlightsTopAllTime'),
      video: stats.topAllTime,
      metricKey: 'views' as const,
    },
    {
      key: 'recent',
      label: t('channelHighlightsTopRecent'),
      video: stats.topNew,
      metricKey: 'views' as const,
    },
    {
      key: 'commented',
      label: t('channelHighlightsTopComment'),
      video: stats.topCommented,
      metricKey: 'comments' as const,
    },
  ].map((entry) => ({
    ...entry,
    trend: entry.video && entry.metricKey !== 'comments' ? createTrendData(entry.video) : null,
  }));
});

function formatBucketLabel(
  bar: { label: string; start: string | null },
  rangeKey: ChannelAnalyticsRange | undefined
) {
  const fallbackLabel = formatDateLabel(bar.start);
  if (rangeKey === 'week') {
    if (bar.label && fallbackLabel) return `${bar.label} · ${fallbackLabel}`;
    if (bar.label) return bar.label;
    return fallbackLabel;
  }
  if (bar.label) return bar.label;
  return fallbackLabel;
}

function formatDateLabel(fallback: string | null) {
  if (!fallback) return '';
  try {
    const formatter = new Intl.DateTimeFormat(locale.value || 'en', {
      month: 'short',
      day: 'numeric',
    });
    return formatter.format(new Date(fallback));
  } catch {
    return fallback;
  }
}

function formatRelative(iso: string) {
  try {
    const target = new Date(iso).getTime();
    const now = Date.now();
    const diffMinutes = Math.round((target - now) / (60 * 1000));
    const formatter = new Intl.RelativeTimeFormat(locale.value || 'en', { numeric: 'auto' });
    if (Math.abs(diffMinutes) < 60) return formatter.format(diffMinutes, 'minute');
    const diffHours = Math.round(diffMinutes / 60);
    return formatter.format(diffHours, 'hour');
  } catch {
    return iso;
  }
}

function createNumberFormatter() {
  try {
    const nf = new Intl.NumberFormat(locale.value || 'en', {
      maximumFractionDigits: 1,
    });
    return (value: number) => nf.format(value);
  } catch {
    return (value: number) => String(value);
  }
}

function formatMetric(value?: number | null) {
  const formatter = numberFormatter.value;
  return formatter(value ?? 0);
}

function formatDelta(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '0';
  if (value > 0) return `+${numberFormatter.value(value)}`;
  if (value < 0) return `-${numberFormatter.value(Math.abs(value))}`;
  return '0';
}

function deltaClass(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value) || value === 0) return 'delta neutral';
  return value > 0 ? 'delta positive' : 'delta negative';
}

function resolveVideoTitle(video?: ChannelAnalyticsHighlightVideo | null) {
  if (!video) return t('channelHighlightsUntitled');
  return video.title || video.uri || t('channelHighlightsUntitled');
}

const VIDEO_TITLE_MAX_LENGTH = 70;

function formatVideoTitle(video?: ChannelAnalyticsHighlightVideo | null) {
  const title = resolveVideoTitle(video);
  if (title.length <= VIDEO_TITLE_MAX_LENGTH) return title;
  const safeLength = Math.max(VIDEO_TITLE_MAX_LENGTH - 3, 0);
  return `${title.slice(0, safeLength).trimEnd()}...`;
}

type TrendDirection = 'up' | 'down' | 'neutral';

type TrendData = {
  series: number[];
  direction: TrendDirection;
  icon: string;
  color: string;
  neutral?: boolean;
};

function normalizeTrendNumber(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return value;
}

function createTrendData(video?: ChannelAnalyticsHighlightVideo | null): TrendData | null {
  if (!video) return null;
  const current = normalizeTrendNumber(video.views);
  const delta = normalizeTrendNumber(video.change);
  if (current === null || delta === null) return null;
  if (delta === 0) {
    return {
      series: [],
      direction: 'neutral',
      icon: 'pi-minus',
      color: '#de0050',
      neutral: true,
    };
  }
  const previous = current - delta;
  if (!Number.isFinite(previous)) return null;
  const direction: TrendDirection = current >= previous ? 'up' : 'down';
  const steps = 6;
  const diff = current - previous;
  const wobbleBase = Math.abs(diff || current || 1) * 0.05;
  const series: number[] = [];
  for (let index = 0; index < steps; index += 1) {
    const ratio = index / (steps - 1);
    const base = previous + diff * ratio;
    const wobble = Math.sin(ratio * Math.PI * 2) * wobbleBase;
    const adjusted = direction === 'up' ? base + Math.abs(wobble) : base - Math.abs(wobble);
    series.push(Number(Math.max(adjusted, 0).toFixed(2)));
  }
  const minValue = Math.min(...series);
  if (Number.isFinite(minValue) && minValue > 0) {
    for (let idx = 0; idx < series.length; idx += 1) {
      const value = series[idx] ?? 0;
      series[idx] = Number(Math.max(value - minValue, 0).toFixed(2));
    }
  }
  return {
    series,
    direction,
    icon: direction === 'up' ? 'pi-trending-up' : 'pi-trending-down',
    color: direction === 'up' ? '#22c55e' : '#de0050',
  };
}

const showRefreshButton = computed(() => ['halfyear', 'year'].includes(range.value));
const refreshBlocked = computed(() => {
  const blocked = getRefreshBlocked(range.value);
  return blocked > Date.now();
});

function handleRefresh() {
  if (refreshBlocked.value) {
    pushToast({ type: 'warning', message: t('channelRefreshBlockedMessage') });
    return;
  }
  recordRefreshAttempt(range.value);
  loadOverview(range.value);
}

function getRefreshBlocked(rangeKey: ChannelAnalyticsRange): number {
  if (!['halfyear', 'year'].includes(rangeKey)) return 0;
  try {
    const key = `analytics_refresh_blocked_${rangeKey}`;
    const stored = localStorage.getItem(key);
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
}

function trendAriaLabel(trend: TrendData | null): string {
  if (!trend) return '';
  if (trend.neutral) return t('channelTrendNeutral');
  const direction = trend.direction === 'up' ? t('channelTrendUp') : t('channelTrendDown');
  return `${direction} ${t('channelTrendLabel')}`;
}

function recordRefreshAttempt(rangeKey: ChannelAnalyticsRange) {
  if (!['halfyear', 'year'].includes(rangeKey)) return;
  try {
    const key = `analytics_refresh_attempts_${rangeKey}`;
    const stored = localStorage.getItem(key);
    const attempts: number[] = stored ? JSON.parse(stored) : [];
    const now = Date.now();
    const recent = attempts.filter((ts) => now - ts < 20000);
    recent.push(now);
    localStorage.setItem(key, JSON.stringify(recent));
    if (recent.length > 3) {
      const blockedUntil = now + 72 * 60 * 60 * 1000;
      localStorage.setItem(`analytics_refresh_blocked_${rangeKey}`, String(blockedUntil));
      pushToast({ type: 'error', message: t('channelRefreshRateLimited') });
    }
  } catch {}
}
</script>
<style scoped>
.channel-page {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}
.page-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}
.ghost-btn {
  border: 1px solid var(--card-border);
  border-radius: 0.75rem;
  padding: 0.5rem 0.9rem;
  background: rgba(148, 163, 184, 0.12);
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-weight: 600;
}
.ghost-btn .pi {
  font-size: 1rem;
}

@media (max-width: 767.98px) {
  .actions {
    width: 100%;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .ghost-btn {
    padding: 0.5rem;
  }
}
.layout-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 360px);
  gap: 1.5rem;
}
.layout-grid.layout-single {
  grid-template-columns: 1fr;
}
@media (max-width: 1024px) {
  .layout-grid {
    grid-template-columns: 1fr;
  }
}
.overview-card {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-width: 0;
  padding: 0;
  border: none;
  background: transparent;
}
.totals {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}
.total-card {
  padding: 1rem;
  border-radius: 1rem;
  background: var(--bg-chat, var(--bg-card));
  border: 1px solid var(--card-border);
}
.total-card .label {
  font-size: 1.16rem;
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.total-card .label .pi {
  font-size: 1.1rem;
  color: var(--text-secondary);
}
.total-card .value {
  font-size: 2rem;
  font-weight: 700;
}
.total-card .hint {
  font-size: 0.85rem;
  color: var(--text-secondary);
}
.chart-card {
  border: 1px solid var(--card-border);
  border-radius: 1.2rem;
  padding: 1.5rem;
  background: var(--card-bg, var(--bg-card));
  min-width: 0;
}
.highlights-card {
  border: 1px solid var(--card-border);
  border-radius: 1.2rem;
  padding: 1rem;
  background: var(--bg-card);
}
.highlight-title,
.chart-title {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0;
  font-weight: 600;
}
.highlight-title {
  font-weight: 600;
  font-size: 1.16rem;
}
.highlight-title .pi,
.chart-title .pi {
  font-size: 1.15rem;
  color: var(--text-secondary);
}
.highlights-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}
.highlight-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}
.highlight-stat {
  border: 1px solid var(--card-border);
  border-radius: 1rem;
  padding: 1rem;
  background: var(--bg-chat, transparent);
  position: relative;
}
.highlight-stat .stat-label {
  font-size: 1rem;
  font-weight: 600;
  color: #de0050;
}
.highlight-stat .stat-value {
  font-size: 1.8rem;
  font-weight: 700;
  margin: 0.25rem 0;
}
.highlight-trend-icon {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 2rem;
  height: 2rem;
}
.highlight-videos {
  margin-top: 1.25rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}
.highlight-video-card {
  border: 1px solid var(--card-border);
  border-radius: 1rem;
  padding: 1rem;
  background: var(--bg-card);
  position: relative;
  overflow: hidden;
  isolation: isolate;
}
.highlight-video-card .video-label {
  font-size: 1.15rem;
  font-weight: 600;
  margin-bottom: 0.3rem;
  color: #196eed;
}
.highlight-video-card .video-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.35rem;
  word-break: break-word;
}
.highlight-video-card .video-label,
.highlight-video-card .video-title,
.highlight-video-card .video-views {
  position: relative;
  z-index: 1;
}
.highlight-video-card .video-title-link {
  color: inherit;
  text-decoration: none;
  transition: color 0.15s ease;
}
.highlight-video-card .video-title-link:hover,
.highlight-video-card .video-title-link:focus {
  color: #de0050;
  text-decoration: none;
}
.highlight-video-card .video-title-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.link-indicator {
  font-size: 0.85rem;
  color: var(--text-secondary);
}
.highlight-video-card .video-views {
  font-size: 0.9rem;
  color: var(--text-secondary);
  display: flex;
  gap: 0.4rem;
  align-items: baseline;
}
.highlight-video-card .video-empty {
  font-size: 0.92rem;
  color: var(--text-secondary);
  margin-top: 0.35rem;
}
.trend-chart-wrapper {
  position: absolute;
  top: 0.5rem;
  bottom: 0.5rem;
  left: 50%;
  right: 0.65rem;
  display: flex;
  align-items: center;
  pointer-events: none;
  z-index: 0;
}
.trend-chart-wrapper.trend-neutral {
  justify-content: flex-end;
  align-items: flex-end;
}
.trend-chart {
  width: 100%;
  height: 100%;
}
.trend-neutral-line {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0.85rem;
  height: 3px;
  border-radius: 999px;
  opacity: 0.9;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.trend-neutral-svg {
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
}
.trend-icon {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  z-index: 2;
  font-size: 0.9rem;
}
.trend-icon.up {
  color: rgb(34, 197, 94);
}
.trend-icon.down {
  color: rgb(248, 113, 113);
}
.trend-icon.neutral {
  color: rgb(248, 113, 113);
}
.delta {
  font-size: 0.85rem;
  font-weight: 600;
}
.delta.positive {
  color: rgb(34, 197, 94);
}
.delta.negative {
  color: rgb(248, 113, 113);
}
.delta.neutral {
  color: var(--text-secondary);
}
.delta-range {
  margin-left: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-secondary);
}
.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 15px;
}
.chart-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.refresh-btn {
  border: 1px solid var(--card-border);
  border-radius: 0.5rem;
  padding: 0.4rem;
  background: transparent;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background 0.2s ease,
    color 0.2s ease;
}
.refresh-btn:hover:not(:disabled) {
  background: rgba(148, 163, 184, 0.1);
  color: var(--text-primary);
}
.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.refresh-btn .pi {
  font-size: 1rem;
}
.refresh-btn .pi.spinning {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
.skeleton-chart {
  height: 320px;
  border-radius: 1rem;
  background: linear-gradient(
    90deg,
    rgba(148, 163, 184, 0.1),
    rgba(148, 163, 184, 0.3),
    rgba(148, 163, 184, 0.1)
  );
  background-size: 600px 100%;
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer {
  0% {
    background-position: -600px 0;
  }
  100% {
    background-position: 600px 0;
  }
}
.empty-state {
  border: 1px dashed var(--card-border);
  border-radius: 1rem;
  padding: 2rem;
  text-align: center;
  color: var(--text-secondary);
  background: var(--bg-chat, transparent);
}
.eyebrow {
  font-size: 1.33rem;
  font-weight: 700;
  margin-bottom: 0.2rem;
}
.muted {
  font-size: 1rem;
  font-weight: 500;
}
.icon-positive {
  color: #22c55e;
}
.icon-negative {
  color: #de0050;
}
.icon-fire {
  color: #d62912;
}
</style>
