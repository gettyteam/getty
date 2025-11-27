<template>
  <transition name="gif-library-fade">
    <div
      v-if="open"
      class="gif-library-overlay"
      role="dialog"
      aria-modal="true"
      :aria-label="t('wuzzyImageDrawerTitle')"
      @click.self="emitClose">
      <div class="gif-library-panel wuzzy-drawer-panel">
        <header class="gif-library-header">
          <div class="gif-library-header-text">
            <h2 class="gif-library-title">{{ t('wuzzyImageDrawerTitle') }}</h2>
            <p class="gif-library-subtitle">{{ t('wuzzyImageDrawerSubtitle') }}</p>
          </div>
          <div class="gif-library-header-actions">
            <button class="btn-secondary btn-compact-secondary" type="button" @click="emitClose">
              {{ t('commonClose') }}
            </button>
          </div>
        </header>
        <section class="wuzzy-drawer-body" aria-live="polite">
          <WuzzyImageSearch @select="handleSelect" />
        </section>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { useI18n } from 'vue-i18n';
import WuzzyImageSearch from './WuzzyImageSearch.vue';

defineProps({
  open: { type: Boolean, required: true },
});

const emit = defineEmits(['close', 'select']);
const { t } = useI18n();

function emitClose() {
  emit('close');
}

function handleSelect(item) {
  emit('select', item);
}
</script>

<style scoped>
.gif-library-fade-enter-active,
.gif-library-fade-leave-active {
  transition: opacity 0.2s ease;
}
.gif-library-fade-enter-from,
.gif-library-fade-leave-to {
  opacity: 0;
}

.gif-library-overlay {
  position: fixed;
  inset: 0;
  background: color-mix(in srgb, var(--bg-overlay, rgb(14 14 14 / 92%)) 78%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 60;
  padding: 30px;
}

:global([data-theme='light']) .gif-library-overlay {
  background: color-mix(in srgb, rgba(244, 247, 255, 0.84) 86%, transparent);
}

.gif-library-panel {
  width: 100%;
  max-width: 960px;
  max-height: min(680px, 92vh);
  background: var(--card, #0f1214);
  color: var(--text-strong, #f4f7ff);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(16px);
}

:global([data-theme='light']) .gif-library-panel {
  background: var(--card, #ffffff);
  color: var(--text-strong, #0f172a);
  border-color: rgba(15, 23, 42, 0.08);
  box-shadow: 0 24px 55px rgba(15, 23, 42, 0.12);
}

.gif-library-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 22px 26px 18px;
  border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.14));
}

:global([data-theme='light']) .gif-library-header {
  border-bottom-color: rgba(15, 23, 42, 0.08);
}

.gif-library-header-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.gif-library-title {
  font-size: 20px;
  font-weight: 600;
  color: inherit;
}

.gif-library-subtitle {
  font-size: 13px;
  opacity: 0.78;
  max-width: 520px;
}

.gif-library-header-actions {
  display: flex;
  gap: 8px;
}

.wuzzy-drawer-body {
  padding: 18px 26px 26px;
  overflow-y: auto;
  overflow-x: hidden;
}

.wuzzy-drawer-body :deep(.wuzzy-panel) {
  background: transparent;
  border: none;
  box-shadow: none;
  padding: 0;
}
</style>
