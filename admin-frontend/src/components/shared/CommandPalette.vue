<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] p-4 sm:p-6">
    <div class="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" @click="close"></div>

    <div
      class="relative w-full max-w-2xl transform overflow-hidden rounded bg-card border border-border shadow-2xl transition-all flex flex-col max-h-[60vh]">
      <div class="flex items-center border-b border-border px-4 py-3">
        <i class="pi pi-search text-muted-foreground mr-3 text-lg"></i>
        <input
          ref="searchInput"
          v-model="query"
          type="text"
          class="flex-1 bg-transparent border-none outline-none text-lg text-foreground placeholder:text-muted-foreground mr-4 rounded"
          :placeholder="$t('commonSearch') || 'Search...'"
          @keydown.down.prevent="navigateResults(1)"
          @keydown.up.prevent="navigateResults(-1)"
          @keydown.enter.prevent="selectResult"
          @keydown.esc="close" />
        <button @click="close" class="text-muted-foreground hover:text-foreground">
          <span class="text-xs border border-border rounded px-1.5 py-0.5">ESC</span>
        </button>
      </div>

      <div class="overflow-y-auto p-2">
        <div v-if="filteredResults.length === 0" class="p-8 text-center text-muted-foreground">
          No results found.
        </div>
        <ul v-else class="space-y-1">
          <li
            v-for="(item, index) in filteredResults"
            :key="item.id"
            :class="[
              'flex items-center gap-3 px-3 py-3 rounded cursor-pointer transition-colors',
              selectedIndex === index
                ? 'bg-accent/80 text-accent-foreground'
                : 'hover:bg-accent/50 text-foreground',
            ]"
            @click="executeResult(item)"
            @mouseenter="selectedIndex = index">
            <i :class="[item.icon, 'text-lg opacity-70']"></i>
            <div class="flex flex-col">
              <span class="font-medium text-sm">{{ item.title }}</span>
              <span class="text-xs text-muted-foreground opacity-80" v-if="item.section">{{
                item.section
              }}</span>
            </div>
            <i class="pi pi-arrow-right ml-auto opacity-50 text-xs"></i>
          </li>
        </ul>
      </div>

      <div
        class="bg-muted/30 px-4 py-2 border-t border-border text-xs text-muted-foreground flex justify-between">
        <span>Search commands and navigation</span>
        <div class="flex gap-3">
          <span><kbd class="font-sans border border-border rounded px-1">↑↓</kbd> to navigate</span>
          <span><kbd class="font-sans border border-border rounded px-1">↵</kbd> to select</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';
import { useCommandPalette } from '@/composables/useCommandPalette';

const props = defineProps({
  isOpen: Boolean,
});

const emit = defineEmits(['close']);

const { query, filteredResults, execute } = useCommandPalette();
const searchInput = ref(null);
const selectedIndex = ref(0);

watch(
  () => props.isOpen,
  (val) => {
    if (val) {
      query.value = '';
      selectedIndex.value = 0;
      nextTick(() => {
        searchInput.value?.focus();
      });
    }
  }
);

watch(filteredResults, () => {
  selectedIndex.value = 0;
});

function close() {
  emit('close');
}

function navigateResults(direction) {
  const newIndex = selectedIndex.value + direction;
  if (newIndex >= 0 && newIndex < filteredResults.value.length) {
    selectedIndex.value = newIndex;
  }
}

function selectResult() {
  if (filteredResults.value[selectedIndex.value]) {
    executeResult(filteredResults.value[selectedIndex.value]);
  }
}

function executeResult(item) {
  execute(item);
  close();
}
</script>
