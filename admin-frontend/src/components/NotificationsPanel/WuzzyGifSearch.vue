<template>
  <div class="wuzzy-panel">
    <div class="wuzzy-header">
      <div>
        <h4 class="wuzzy-title">{{ t('wuzzySearchTitle') }}</h4>
        <p class="wuzzy-hint">{{ t('wuzzyProviderDesc') }}</p>
      </div>
      <div class="wuzzy-input-group">
        <input
          class="ann-input wuzzy-input"
          :placeholder="t('wuzzySearchPlaceholder')"
          v-model="searchQuery"
          @keyup.enter="() => executeSearch(true)" />
        <button class="btn" type="button" @click="() => executeSearch(true)" :disabled="loading">
          <span v-if="!loading">{{ t('wuzzySearchButton') }}</span>
          <span v-else>{{ t('wuzzySearchLoading') }}</span>
        </button>
      </div>
    </div>

    <div v-if="error" class="wuzzy-error" role="alert">
      <span>{{ error }}</span>
      <button
        class="btn-secondary btn-compact-secondary"
        type="button"
        @click="() => executeSearch(true)">
        {{ t('wuzzySearchTryAgain') }}
      </button>
    </div>

    <div v-if="!hasSearched && !loading" class="wuzzy-placeholder">
      {{ t('wuzzyProviderHint') }}
    </div>

    <div v-if="loading && hasSearched" class="wuzzy-loading">
      {{ t('wuzzySearchLoading') }}
    </div>

    <div v-else-if="hasSearched && visibleResults.length === 0" class="wuzzy-empty">
      {{ t('wuzzySearchNoResults') }}
    </div>

    <div v-else class="wuzzy-grid">
      <article v-for="item in visibleResults" :key="item.id" class="wuzzy-card">
        <div class="wuzzy-thumb">
          <img :src="item.url" :alt="item.displayName" loading="lazy" decoding="async" />
        </div>
        <div class="wuzzy-meta">
          <div class="wuzzy-name" :title="item.displayName">{{ item.displayName }}</div>
          <div class="wuzzy-meta-row">
            <span>{{ formatBytes(item.size) }}</span>
            <span v-if="item.blockHeight">#{{ item.blockHeight }}</span>
          </div>
          <div class="wuzzy-owner" :title="item.owner">
            {{
              item.owner && item.owner.length > 18
                ? item.owner.substring(0, 18) + '...'
                : item.owner
            }}
          </div>
        </div>
        <div class="wuzzy-actions">
          <button class="btn" type="button" @click="() => handleSelect(item)">
            {{ t('wuzzySearchUseGif') }}
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
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { searchWuzzyGifs, formatBytes } from '@/services/wuzzySearch';

const emit = defineEmits(['select']);
const { t } = useI18n();

const PAGE_SIZE = 12;

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
    error.value = t('wuzzySearchPlaceholder');
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
    const response = await searchWuzzyGifs({
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
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.wuzzy-title {
  margin: 0;
  font-size: 16px;
}

.wuzzy-hint {
  margin: 4px 0 0;
  font-size: 13px;
  opacity: 0.8;
}

.wuzzy-input-group {
  display: flex;
  gap: 8px;
  min-width: 260px;
}

.wuzzy-input {
  min-width: 220px;
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

.wuzzy-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.wuzzy-card {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: rgba(16, 21, 33, 0.8);
}

:global([data-theme='light']) .wuzzy-card {
  background: #f8fafc;
  border-color: rgba(15, 23, 42, 0.08);
}

.wuzzy-thumb {
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 4 / 3;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
}

.wuzzy-thumb img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.wuzzy-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.wuzzy-name {
  font-weight: 600;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wuzzy-meta-row {
  display: flex;
  gap: 8px;
  font-size: 12px;
  opacity: 0.8;
}

.wuzzy-owner {
  font-size: 12px;
  opacity: 0.75;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wuzzy-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
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
