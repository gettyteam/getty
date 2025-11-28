<template>
  <Teleport to="body">
    <transition name="audio-library-fade">
      <div
        v-if="open"
        class="audio-library-overlay"
        role="dialog"
        aria-modal="true"
        :aria-label="t('audioLibraryTitle')"
        @click.self="emitClose">
        <div class="audio-library-panel">
          <header class="audio-library-header">
            <div class="audio-library-header-text">
              <h2 class="audio-library-title">{{ t('audioLibraryTitle') }}</h2>
              <p class="audio-library-subtitle">{{ t('audioLibrarySubtitle') }}</p>
            </div>
            <div class="audio-library-header-actions">
              <button
                class="btn-secondary btn-compact-secondary"
                type="button"
                :disabled="loading"
                @click="emitRefresh">
                {{ t('commonRefresh') }}
              </button>
              <button class="btn-secondary btn-compact-secondary" type="button" @click="emitClose">
                {{ t('commonClose') }}
              </button>
            </div>
          </header>
          <section class="audio-library-body" aria-live="polite">
            <div v-if="loading" class="audio-library-status">{{ t('commonLoading') }}</div>
            <div v-else-if="error" class="audio-library-status is-error">
              <span>{{ error }}</span>
              <button
                class="btn-secondary btn-compact-secondary"
                type="button"
                @click="emitRefresh">
                {{ t('commonRefresh') }}
              </button>
            </div>
            <div v-else-if="!items.length" class="audio-library-empty">
              <p>{{ t('audioLibraryEmpty') }}</p>
              <p class="audio-library-empty-hint">{{ t('audioLibraryEmptyHint') }}</p>
            </div>
            <ul v-else class="audio-library-grid">
              <li v-for="item in items" :key="item.id" class="audio-library-item">
                <div class="audio-thumb group relative overflow-hidden" aria-hidden="true">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    role="presentation"
                    focusable="false"
                    class="transition-transform duration-200 group-hover:scale-105">
                    <title>{{ t('audioLibraryPreviewLabel') }}</title>
                    <path
                      d="M10.75 18.692q.816 0 1.379-.563q.563-.564.563-1.379v-3.98h2.731v-1.54h-3.5v4.087q-.236-.257-.53-.383q-.293-.126-.643-.126q-.815 0-1.379.563q-.563.564-.563 1.379t.563 1.379q.564.563 1.379.563M6.616 21q-.691 0-1.153-.462T5 19.385V4.615q0-.69.463-1.152T6.616 3H14.5L19 7.5v11.885q0 .69-.462 1.153T17.384 21zM14 8h4l-4-4z" />
                  </svg>
                  <div
                    class="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/70 opacity-0 transition-opacity flex flex-col justify-between p-2 group-hover:opacity-100 pointer-events-none"></div>
                </div>
                <div class="audio-meta">
                  <div class="audio-meta-primary">
                    <span class="audio-name">{{ formatName(item) }}</span>
                    <span v-if="itemSize(item)" class="audio-size">{{ itemSize(item) }}</span>
                  </div>
                  <div class="audio-meta-secondary">
                    <span v-if="itemUploaded(item)">{{ itemUploaded(item) }}</span>
                  </div>
                </div>
                <audio
                  v-if="item.url"
                  class="audio-preview"
                  :src="item.url"
                  controls
                  preload="none"
                  :aria-label="t('audioLibraryPreviewLabel')"></audio>
                <div class="audio-actions">
                  <button class="btn" type="button" @click="emitSelect(item)">
                    {{ t('audioLibraryUseAudio') }}
                  </button>
                  <button
                    v-if="canDelete(item)"
                    class="btn-secondary btn-compact-secondary audio-delete-btn"
                    type="button"
                    @click="emitDelete(item)">
                    {{ t('commonDelete') }}
                  </button>
                </div>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

/**
 * @typedef {Object} LibraryItem
 * @property {string} id
 * @property {string} url
 * @property {number} [size]
 * @property {string} [originalName]
 * @property {string} [uploadedAt]
 * @property {string} [sha256]
 * @property {string} [fingerprint]
 */

defineProps({
  open: { type: Boolean, required: true },
  items: { type: Array, required: true },
  loading: { type: Boolean, required: true },
  error: { type: String, default: '' },
});

const emit = defineEmits(['close', 'select', 'refresh', 'delete']);

const { t } = useI18n();

const dateFormatter = computed(() => {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
});

function emitClose() {
  emit('close');
}

/**
 * @param {LibraryItem} item
 */
function emitSelect(item) {
  emit('select', item);
}

function emitRefresh() {
  emit('refresh');
}

function emitDelete(item) {
  emit('delete', item);
}

function canDelete(item) {
  if (!item) return false;
  const provider = (item.provider || '').toString().trim().toLowerCase();
  return !provider || provider === 'supabase';
}

/**
 * @param {LibraryItem} item
 */
function itemSize(item) {
  if (!item.size || item.size <= 0) return '';
  const kiloBytes = item.size / 1024;
  if (!Number.isFinite(kiloBytes)) return '';
  if (kiloBytes >= 1024) {
    const megaBytes = kiloBytes / 1024;
    const precision = megaBytes >= 10 ? 0 : 1;
    return `${megaBytes.toFixed(precision)} MB`;
  }
  const precision = kiloBytes >= 10 ? 0 : 1;
  return `${kiloBytes.toFixed(precision)} KB`;
}

/**
 * @param {LibraryItem} item
 */
function itemUploaded(item) {
  if (!item.uploadedAt) return '';
  const parsed = new Date(item.uploadedAt);
  if (Number.isNaN(parsed.getTime())) return '';
  return dateFormatter.value.format(parsed);
}

/**
 * @param {LibraryItem} item
 */
function formatName(item) {
  const val = item.originalName || item.id;
  if (!val) return t('audioLibraryUnknown');
  return val.length > 28 ? `${val.slice(0, 28)}…` : val;
}
</script>

<style scoped>
.audio-library-fade-enter-active,
.audio-library-fade-leave-active {
  transition: opacity 0.2s ease;
}
.audio-library-fade-enter-from,
.audio-library-fade-leave-to {
  opacity: 0;
}

.audio-library-overlay {
  position: fixed;
  inset: 0;
  background: color-mix(in srgb, var(--bg-overlay, rgb(14 14 14 / 92%)) 78%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 60;
  padding: 30px;
}

:global([data-theme='light']) .audio-library-overlay {
  background: color-mix(in srgb, rgba(244, 247, 255, 0.84) 86%, transparent);
}

.audio-library-panel {
  width: min(720px, 92vw);
  max-height: min(600px, 90vh);
  background: var(--card, #0f1214);
  color: var(--text-strong, #f4f7ff);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(16px);
}

:global([data-theme='light']) .audio-library-panel {
  background: var(--card, #ffffff);
  color: var(--text-strong, #0f172a);
  border-color: rgba(15, 23, 42, 0.08);
  box-shadow: 0 24px 55px rgba(15, 23, 42, 0.12);
}

.audio-library-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 22px 26px 18px;
  border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.14));
}

:global([data-theme='light']) .audio-library-header {
  border-bottom-color: rgba(15, 23, 42, 0.08);
}

.audio-library-header-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.audio-library-title {
  font-size: 20px;
  font-weight: 600;
  color: inherit;
}

.audio-library-subtitle {
  font-size: 13px;
  opacity: 0.78;
  max-width: 500px;
}

.audio-library-header-actions {
  display: flex;
  gap: 8px;
}

.audio-library-body {
  padding: 18px 26px 26px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.audio-library-status {
  display: inline-flex;
  gap: 10px;
  align-items: center;
  font-size: 13px;
  opacity: 0.9;
  color: inherit;
}

.audio-library-status.is-error {
  color: #f88;
}

.audio-library-empty {
  text-align: center;
  font-size: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  opacity: 0.82;
  color: inherit;
}

.audio-library-empty-hint {
  font-size: 12px;
}

.audio-library-grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 18px;
}

.audio-library-item {
  background: color-mix(in srgb, var(--card, rgba(23, 28, 40, 0.94)) 86%, transparent);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
  border-radius: 14px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 14px 32px rgba(2, 6, 14, 0.32);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.audio-library-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 36px rgba(2, 6, 14, 0.38);
}

:global([data-theme='light']) .audio-library-item {
  background: color-mix(in srgb, var(--card, #ffffff) 96%, transparent);
  border-color: rgba(15, 23, 42, 0.08);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
}

:global([data-theme='light']) .audio-library-item:hover {
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.16);
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
  width: 70px;
  height: 70px;
}

:global([data-theme='light']) .audio-thumb {
  background: rgba(23, 26, 33, 0.65);
  color: #0c0c0c;
}

.audio-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.audio-meta-primary {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  font-weight: 600;
  font-size: 13px;
}

.audio-meta-secondary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
  opacity: 0.78;
}

.audio-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.audio-size {
  opacity: 0.78;
}

.audio-preview {
  width: 100%;
  height: 32px;
}

.audio-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.audio-delete-btn {
  white-space: nowrap;
}

@media (max-width: 720px) {
  .audio-library-overlay {
    padding: 16px;
  }
  .audio-library-panel {
    width: 100%;
    max-height: 92vh;
  }
  .audio-library-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .audio-library-header-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
