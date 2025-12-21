<template>
  <div
    class="recommendation-card bg-card text-card-foreground rounded-md shadow-sm p-4 flex flex-col w-full md:w-[16rem] min-h-[16rem]"
    style="border: 1px solid var(--card-border)">
    <div class="card-header flex items-start justify-between gap-3 mb-4">
      <div class="flex items-center gap-3 min-w-0">
        <i :class="[module.icon, 'text-2xl']"></i>
        <h3 class="text-xl font-semibold truncate">
          {{ $t(`home.recommendations.modules.${module.id}.title`, module.name) }}
        </h3>
      </div>

      <div class="relative flex-shrink-0">
        <button
          ref="menuTrigger"
          type="button"
          class="flex items-center justify-center p-2 rounded-lg border border-border text-sm hover:bg-card transition-colors"
          :aria-expanded="menuOpen.toString()"
          aria-haspopup="true"
          :aria-label="$t('home.actions.openMenu')"
          @click="toggleMenu">
          <i class="pi pi-ellipsis-v" aria-hidden="true"></i>
        </button>

        <div
          v-show="menuOpen"
          ref="menuPopover"
          class="absolute right-0 mt-2 w-44 bg-card border border-border rounded-xl shadow-lg p-2 z-50"
          role="menu">
          <button
            type="button"
            class="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-[var(--bg-chat)] flex items-center gap-2"
            role="menuitem"
            @click="discard">
            <i class="pi pi-eye-slash" aria-hidden="true"></i>
            <span>{{ $t('home.actions.discard') }}</span>
          </button>
        </div>
      </div>
    </div>
    <div class="card-content flex-1 flex flex-col justify-between">
      <p class="text-muted-foreground mb-4" style="font-size: 0.8rem">
        {{ $t(`home.recommendations.modules.${module.id}.description`, module.description) }}
      </p>
      <button
        @click="$emit('configure', module)"
        class="btn btn-secondary btn-compact-secondary self-center px-6 justify-center hover:bg-[#553fee] transition-colors">
        {{ $t('home.actions.configure') }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps({
  module: { type: Object, required: true },
});

const emit = defineEmits(['configure', 'discard']);

const menuOpen = ref(false);
const menuTrigger = ref(null);
const menuPopover = ref(null);

function toggleMenu() {
  menuOpen.value = !menuOpen.value;
}

function discard() {
  menuOpen.value = false;
  emit('discard', props.module);
}

function handlePointerDown(event) {
  if (!menuOpen.value) return;
  const target = event.target;
  const within = (triggerRef, popoverRef) => {
    try {
      if (triggerRef && triggerRef.contains(target)) return true;
      if (popoverRef && popoverRef.contains(target)) return true;
    } catch {}
    return false;
  };

  if (!within(menuTrigger.value, menuPopover.value)) {
    menuOpen.value = false;
  }
}

function handleKeydown(event) {
  if (event.key === 'Escape' && menuOpen.value) {
    menuOpen.value = false;
    event.preventDefault();
    event.stopPropagation();
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', handlePointerDown, true);
  window.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handlePointerDown, true);
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<style>
html:not(.dark) .recommendation-card .btn.btn-secondary:hover {
  color: white !important;
}
</style>
