<template>
  <div
    v-if="isVisible"
    class="relative bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 border border-primary/20 dark:border-primary/30 rounded-lg p-4 mb-8 flex items-start gap-4">
    <div class="p-2 shrink-0">
      <i class="pi pi-megaphone text-primary dark:text-primary-400 text-xl"></i>
    </div>
    <div class="flex-1 pt-1">
      <h3 class="font-semibold text-foreground mb-1">{{ title }}</h3>
      <p class="text-sm text-muted-foreground leading-relaxed">
        {{ message }}
        <a
          v-if="link"
          :href="link"
          target="_blank"
          rel="noopener noreferrer"
          class="text-primary hover:underline font-bold ml-1 inline-flex items-center gap-1">
          {{ linkText || 'Read more' }}
          <i class="pi pi-external-link text-xs"></i>
        </a>
      </p>
    </div>
    <button
      @click="dismiss"
      class="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-accent"
      aria-label="Close banner">
      <i class="pi pi-times"></i>
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';

const props = defineProps({
  id: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  link: { type: String, default: '' },
  linkText: { type: String, default: '' },
});

const isVisible = ref(false);

onMounted(() => {
  checkVisibility();
});

watch(
  () => props.id,
  () => {
    checkVisibility();
  }
);

function checkVisibility() {
  const dismissedId = localStorage.getItem('dismissed_banner_id');
  if (dismissedId !== props.id) {
    isVisible.value = true;
  } else {
    isVisible.value = false;
  }
}

function dismiss() {
  isVisible.value = false;
  localStorage.setItem('dismissed_banner_id', props.id);
}
</script>
