<template>
  <div class="wuzzy-panel">
    <div class="wuzzy-header centered-header">
      <div class="wuzzy-input-group wide-input-group">
        <input
          class="ann-input wuzzy-input"
          :placeholder="t('wuzzyAudioSearchPlaceholder')"
          v-model="searchQuery"
          @keyup.enter="() => executeSearch(true)" />
        <button class="btn" type="button" @click="() => executeSearch(true)" :disabled="loading">
          <span v-if="!loading">{{ t('wuzzySearchButton') }}</span>
          <span v-else>{{ t('wuzzySearchLoading') }}</span>
        </button>
      </div>
    </div>
    <p class="wuzzy-hint-secondary text-center mb-2">
      {{ t('wuzzyAudioMaxDurationHint', { max: MAX_DURATION_SECONDS }) }}
    </p>

    <div v-if="error" class="wuzzy-error" role="alert">
      <span>{{ error }}</span>
      <button
        class="btn-secondary btn-compact-secondary"
        type="button"
        @click="() => executeSearch(true)">
        {{ t('wuzzySearchTryAgain') }}
      </button>
    </div>

    <div v-if="loading && hasSearched" class="wuzzy-loading">
      {{ t('wuzzySearchLoading') }}
    </div>

    <div v-else-if="hasSearched && filteredResults.length === 0" class="wuzzy-empty">
      {{ t('wuzzyAudioDurationFilterEmpty', { max: MAX_DURATION_SECONDS }) }}
    </div>

    <div v-else class="wuzzy-audio-list">
      <article v-for="item in filteredResults" :key="item.id" class="wuzzy-audio-card">
        <div class="audio-thumb" aria-hidden="true">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            role="presentation"
            focusable="false">
            <title>{{ t('wuzzyAudioSearchTitle') }}</title>
            <g fill="none" stroke="currentColor" stroke-width="1.5">
              <path
                stroke-linecap="round"
                d="M11.5 6C7.022 6 4.782 6 3.391 7.172S2 10.229 2 14s0 5.657 1.391 6.828S7.021 22 11.5 22c4.478 0 6.718 0 8.109-1.172S21 17.771 21 14c0-1.17 0-2.158-.041-3" />
              <path
                stroke-linejoin="round"
                d="m18.5 2 .258.697c.338.914.507 1.371.84 1.704c.334.334.791.503 1.705.841L22 5.5l-.697.258c-.914.338-1.371.507-1.704.84c-.334.334-.503.791-.841 1.705L18.5 9l-.258-.697c-.338-.914-.507-1.371-.84-1.704c-.334-.334-.791-.503-1.705-.841L15 5.5l.697-.258c.914-.338 1.371-.507 1.704-.84c.334-.334.503-.791.841-1.705z" />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 10v8m-3-6v4m-3-3v2m9-3v4m3-3v2" />
            </g>
          </svg>
        </div>
        <div class="audio-card-header">
          <div class="audio-name" :title="item.displayName">{{ item.displayName }}</div>
          <span v-if="item.contentType" class="audio-type">{{ item.contentType }}</span>
        </div>
        <div class="audio-meta">
          <span class="audio-duration">
            {{ t('wuzzyAudioDurationLabel') }}
            <template v-if="item.durationSeconds">
              {{ formatDurationLabel(item.durationSeconds) }}
            </template>
            <template v-else>
              {{ t('wuzzyAudioDurationUnknown') }}
            </template>
          </span>
          <span>{{ formatBytes(item.size) }}</span>
          <span v-if="item.blockHeight">#{{ item.blockHeight }}</span>
        </div>
        <div class="audio-owner" :title="item.owner">
          {{ item.owner.length > 35 ? item.owner.substring(0, 35) + '...' : item.owner }}
        </div>
        <audio class="audio-preview" :src="item.url" controls preload="none"></audio>
        <div class="wuzzy-actions">
          <button class="btn" type="button" @click="() => handleSelect(item)">
            {{ t('wuzzyAudioUseBtn') }}
          </button>
          <button
            class="btn-secondary btn-compact-secondary"
            type="button"
            @click="() => openInNewTab(item.url)">
            {{ t('wuzzySearchOpen') }}
          </button>
          <button
            class="btn-secondary btn-compact-secondary"
            type="button"
            @click="() => copyUrl(item)">
            {{ copiedId === item.id ? t('wuzzySearchCopied') : t('wuzzySearchCopy') }}
          </button>
        </div>
      </article>
    </div>

    <div v-if="showPagination" class="wuzzy-pagination">
      <button
        class="btn-secondary btn-compact-secondary"
        type="button"
        :disabled="!canGoPrev || loading"
        @click="goToPreviousPage">
        {{ t('wuzzyPaginationPrev') }}
      </button>
      <span class="wuzzy-pagination-label" aria-live="polite">
        {{ t('wuzzyPaginationPage', { current: currentPageDisplay }) }}
      </span>
      <button
        class="btn-secondary btn-compact-secondary"
        type="button"
        :disabled="!canGoNext || loading"
        @click="goToNextPage">
        {{ t('wuzzyPaginationNext') }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  searchWuzzyAudio,
  formatBytes,
  MAX_WUZZY_AUDIO_DURATION_SECONDS,
} from '@/services/wuzzySearch';

const emit = defineEmits(['select']);
const { t } = useI18n();

const PAGE_SIZE = 12;
const MAX_DURATION_SECONDS = MAX_WUZZY_AUDIO_DURATION_SECONDS;

const searchQuery = ref('');
const loading = ref(false);
const error = ref('');
const pages = ref([]);
const currentPageIndex = ref(0);
const hasMore = ref(false);
const hasSearched = ref(false);
const nextCursor = ref(null);
const copiedId = ref('');
const activeQuery = ref('');
let abortController = null;
const durationState = reactive({});
const probedIds = new Set();

function resetAbortController() {
  if (abortController) {
    abortController.abort();
  }
  abortController = new AbortController();
  return abortController.signal;
}

function mapDisplayName(item) {
  if (item.originalName) return item.originalName;
  if (item.tags?.length) {
    const titleTag = item.tags.find((tag) => tag.name?.toLowerCase() === 'title');
    if (titleTag?.value) return titleTag.value;
  }
  return item.id;
}

async function executeSearch(reset = false) {
  const rawQuery = reset ? searchQuery.value : activeQuery.value;
  const query = rawQuery.trim();
  if (!query) {
    error.value = t('wuzzyAudioSearchPlaceholder');
    return;
  }
  try {
    loading.value = true;
    error.value = '';
    if (reset) {
      pages.value = [];
      nextCursor.value = null;
      hasMore.value = false;
      currentPageIndex.value = 0;
      activeQuery.value = query;
    }
    const signal = resetAbortController();
    const response = await searchWuzzyAudio({
      query,
      cursor: reset ? null : nextCursor.value,
      signal,
      pageSize: PAGE_SIZE,
    });
    const mapped = response.edges.map((edge) => ({
      ...edge,
      displayName: mapDisplayName(edge),
    }));
    if (reset) {
      pages.value = mapped.length ? [{ items: mapped }] : [];
      currentPageIndex.value = 0;
    } else if (mapped.length) {
      pages.value = pages.value.concat({ items: mapped });
      currentPageIndex.value = pages.value.length - 1;
    }
    hasMore.value = !!response.pageInfo?.hasNextPage;
    nextCursor.value = response.edges.length
      ? response.edges[response.edges.length - 1].cursor
      : null;
    hasSearched.value = true;
  } catch (err) {
    if (err?.name === 'AbortError') return;
    error.value = err?.message || 'Unable to fetch results.';
  } finally {
    loading.value = false;
  }
}

function handleSelect(item) {
  emit('select', item);
}

function openInNewTab(url) {
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

async function copyUrl(item) {
  if (!navigator?.clipboard || !item?.url) return;
  try {
    await navigator.clipboard.writeText(item.url);
    copiedId.value = item.id;
    setTimeout(() => {
      if (copiedId.value === item.id) copiedId.value = '';
    }, 2000);
  } catch (err) {
    console.warn('[wuzzy] failed to copy url', err);
  }
}

const visibleResults = computed(() => {
  if (!pages.value.length) return [];
  return pages.value[currentPageIndex.value]?.items || [];
});

const filteredResults = computed(() => visibleResults.value.filter(isDurationAllowed));

const currentPageDisplay = computed(() => (pages.value.length ? currentPageIndex.value + 1 : 0));

const canGoPrev = computed(() => currentPageIndex.value > 0 && pages.value.length > 0);

const canGoNext = computed(
  () => currentPageIndex.value < pages.value.length - 1 || (hasMore.value && pages.value.length > 0)
);

const showPagination = computed(() => hasSearched.value && pages.value.length > 0);

function goToPreviousPage() {
  if (!canGoPrev.value || loading.value) return;
  currentPageIndex.value -= 1;
}

async function goToNextPage() {
  if (!canGoNext.value || loading.value) return;
  if (currentPageIndex.value < pages.value.length - 1) {
    currentPageIndex.value += 1;
    return;
  }
  await executeSearch(false);
}

function formatDurationLabel(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const remaining = Math.round(seconds % 60)
      .toString()
      .padStart(2, '0');
    return `${minutes}m ${remaining}s`;
  }
  if (seconds >= 1) {
    return `${seconds.toFixed(seconds >= 10 ? 0 : 1)}s`;
  }
  return `${(seconds * 1000).toFixed(0)}ms`;
}

function isDurationAllowed(item) {
  if (!item) return false;
  if (Number.isFinite(item.durationSeconds)) {
    return item.durationSeconds <= MAX_DURATION_SECONDS;
  }
  const measured = getMeasuredDuration(item.id);
  if (Number.isFinite(measured)) {
    return measured <= MAX_DURATION_SECONDS;
  }
  return false; // hide unknowns until probed
}

function getMeasuredDuration(id) {
  const entry = durationState[id];
  if (!entry) return null;
  return Number.isFinite(entry.duration) ? entry.duration : null;
}

function probeDuration(item) {
  if (!item?.id || !item.url || probedIds.has(item.id)) return;
  probedIds.add(item.id);
  const audioEl = document.createElement('audio');
  audioEl.preload = 'metadata';
  const cleanup = () => {
    audioEl.removeAttribute('src');
    audioEl.load();
  };
  audioEl.addEventListener('loadedmetadata', () => {
    const measured = Number(audioEl.duration);
    durationState[item.id] = {
      duration: Number.isFinite(measured) ? measured : null,
      updatedAt: Date.now(),
    };
    cleanup();
  });
  audioEl.addEventListener('error', () => {
    durationState[item.id] = { duration: null, updatedAt: Date.now(), error: true };
    cleanup();
  });
  audioEl.src = item.url;
}

watch(
  visibleResults,
  (items) => {
    items.forEach((item) => {
      if (!item?.durationSeconds) {
        probeDuration(item);
      }
    });
  },
  { immediate: true }
);
</script>

<style scoped>
.wuzzy-panel {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 16px;
  background: color-mix(in srgb, var(--card, rgba(14, 18, 27, 0.8)) 90%, transparent);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

:global([data-theme='light']) .wuzzy-panel {
  background: #fff;
  border-color: rgba(15, 23, 42, 0.08);
}

.wuzzy-header {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.wuzzy-input-group {
  display: flex;
  gap: 8px;
  width: 100%;
  max-width: 600px;
}

.wuzzy-input {
  flex: 1;
  min-width: 0;
  border-radius: 4px;
}

.wuzzy-error {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.15);
  color: #fecaca;
}

.wuzzy-placeholder,
.wuzzy-loading,
.wuzzy-empty {
  padding: 8px 0;
  font-size: 14px;
  opacity: 0.85;
}

.wuzzy-audio-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.wuzzy-audio-card {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 16px;
  background: rgb(7, 10, 12);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

:global([data-theme='light']) .wuzzy-audio-card {
  background: #f8fafc;
  border-color: rgba(15, 23, 42, 0.08);
}

.audio-thumb {
  width: 100%;
  height: 110px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(250, 250, 250, 0.85);
}

.audio-thumb svg {
  width: 56px;
  height: 56px;
}

:global([data-theme='light']) .audio-thumb {
  background: rgba(23, 26, 33, 0.65);
  color: #0c0c0c;
}

.audio-card-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}

.audio-name {
  font-weight: 600;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.audio-type {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.15);
  color: rgba(96, 165, 250, 0.95);
}

.audio-meta {
  display: flex;
  gap: 8px;
  font-size: 12px;
  opacity: 0.8;
}

.audio-duration {
  font-weight: 600;
}

.audio-owner {
  font-size: 12px;
  opacity: 0.75;
  overflow: hidden;
  text-overflow: ellipsis;
}

.audio-preview {
  width: 100%;
}

.wuzzy-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  justify-content: center;
}

.wuzzy-pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.wuzzy-pagination-label {
  font-size: 14px;
  opacity: 0.85;
}

@media (max-width: 720px) {
  .wuzzy-header {
    flex-direction: column;
  }
  .wuzzy-input-group {
    width: 100%;
  }
  .wuzzy-input {
    width: 100%;
  }
  .wuzzy-pagination {
    justify-content: space-between;
  }
}
</style>
