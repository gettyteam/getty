<template>
  <div
    class="p-4 text-center border border-zinc-200 dark:border-zinc-800 rounded-md bg-white dark:bg-zinc-900 shadow-sm mb-6 h-full flex flex-col justify-center items-center">
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
    <h3 class="text-xl font-bold text-zinc-900 dark:text-white mb-3">{{ title }}</h3>
    <p class="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
      {{ message }}
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue';
// @ts-ignore
import { i18nTrigger } from '../languageManager';

const props = defineProps({
  moduleName: {
    type: String,
    default: 'Module',
  },
});

const getI18nText = (key, fallback) => {
  i18nTrigger.value;
  if (window.languageManager && typeof window.languageManager.getText === 'function') {
    return window.languageManager.getText(key) || fallback;
  }
  return fallback;
};

const title = computed(() => getI18nText('blockedAccessTitle', 'Restricted Access'));
const message = computed(() => {
  const text = getI18nText(
    'blockedAccessMessage',
    'The configuration for {moduleName} has been temporarily disabled by a moderator.'
  );
  return text.replace('{moduleName}', props.moduleName);
});
</script>
