<template>
  <div v-if="isOpen" class="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
    <div
      class="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      @click="handleClose"></div>

    <div
      class="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 p-8 text-center shadow-2xl transition-all border border-zinc-200 dark:border-zinc-800">
      <div
        class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 mb-6">
        <svg
          class="h-8 w-8 text-amber-600 dark:text-amber-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      </div>

      <h3 class="text-xl font-bold text-zinc-900 dark:text-white mb-3">
        {{ t('configBlockedTitle') || 'Restricted Access' }}
      </h3>

      <div class="mb-8">
        <p class="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
          {{
            t('configBlockedMessage', { name: configName }) ||
            `The configuration for ${configName} has been temporarily disabled by a moderator.`
          }}
        </p>
        <p
          v-if="details && details.reason"
          class="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mt-2 italic">
          "{{ details.reason }}"
        </p>
        <p class="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mt-2">
          {{ t('suspendedContact') || 'If this is an error, please contact support.' }}
        </p>
      </div>

      <button
        type="button"
        class="w-full inline-flex justify-center items-center rounded-xl bg-zinc-900 dark:bg-white px-4 py-3 text-sm font-semibold !text-[#ffffff] dark:!text-zinc-900 shadow-sm hover:bg-zinc-800 dark:hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600 transition-colors"
        @click="handleClose">
        {{ t('close') || 'Close' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n';
import { watch, onUnmounted } from 'vue';

const props = defineProps({
  isOpen: Boolean,
  configName: {
    type: String,
    default: 'Settings',
  },
  details: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(['close']);
const { t } = useI18n();

watch(
  () => props.isOpen,
  (val) => {
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.overflow = val ? 'hidden' : '';
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  if (typeof document !== 'undefined' && document.body) {
    document.body.style.overflow = '';
  }
});

function handleClose() {
  emit('close');
}
</script>
