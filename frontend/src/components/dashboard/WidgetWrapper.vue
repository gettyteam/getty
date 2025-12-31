<template>
  <div
    class="widget-wrapper relative h-full flex flex-col bg-card border border-[#f1f5f9] dark:border-border overflow-hidden transition-shadow duration-200"
    :class="{ 'cap-pulse': capPulse }">
    <div
      v-if="isEditMode"
      class="resize-zone resize-zone-left"
      :title="getI18nText('dashboardResizeWidth', 'Resize Width')"
      @mousedown.prevent.stop="startResize('left', $event)"></div>
    <div
      v-if="isEditMode"
      class="resize-zone resize-zone-right"
      :title="getI18nText('dashboardResizeWidth', 'Resize Width')"
      @mousedown.prevent.stop="startResize('right', $event)"></div>

    <div
      v-if="isEditMode && h > 10"
      class="resize-zone resize-zone-bottom-panel"
      :title="getI18nText('dashboardResizeHeight', 'Resize Height')"
      @mousedown.prevent.stop="startResize('bottom', $event)"></div>

    <div
      class="widget-header relative flex items-center justify-between px-3 py-2 bg-secondary border-b border-border select-none group"
      :class="{ 'cursor-move': isEditMode }"
      @mousedown="startDrag">
      <div
        v-if="isEditMode"
        class="resize-zone resize-zone-top"
        :title="getI18nText('dashboardResizeHeight', 'Resize Height')"
        @mousedown.prevent.stop="startResize('top', $event)"></div>
      <div
        v-if="isEditMode"
        class="resize-zone resize-zone-bottom"
        :title="getI18nText('dashboardResizeHeight', 'Resize Height')"
        @mousedown.prevent.stop="startResize('bottom', $event)"></div>

      <div class="flex items-center gap-2">
        <div
          v-if="isEditMode"
          class="drag-handle text-muted-foreground/50 group-hover:text-foreground cursor-move mr-1">
          <svg
            width="10"
            height="16"
            viewBox="0 0 10 16"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg">
            <path
              d="M4 2C4 3.10457 3.10457 4 2 4C0.89543 4 0 3.10457 0 2C0 0.89543 0.89543 0 2 0C3.10457 0 4 0.89543 4 2Z" />
            <path
              d="M4 8C4 9.10457 3.10457 10 2 10C0.89543 10 0 9.10457 0 8C0 6.89543 0.89543 6 2 6C3.10457 6 4 6.89543 4 8Z" />
            <path
              d="M4 14C4 15.1046 3.10457 16 2 16C0.89543 16 0 15.1046 0 14C0 12.8954 0.89543 12 2 12C3.10457 12 4 12.8954 4 14Z" />
            <path
              d="M10 2C10 3.10457 9.10457 4 8 4C6.89543 4 6 3.10457 6 2C6 0.89543 6.89543 0 8 0C9.10457 0 10 0.89543 10 2Z" />
            <path
              d="M10 8C10 9.10457 9.10457 10 8 10C6.89543 10 6 9.10457 6 8C6 6.89543 6.89543 6 8 6C9.10457 6 10 6.89543 10 8Z" />
            <path
              d="M10 14C10 15.1046 9.10457 16 8 16C6.89543 16 6 15.1046 6 14C6 12.8954 6.89543 12 8 12C9.10457 12 10 12.8954 10 14Z" />
          </svg>
        </div>
        <span class="text-base font-bold text-foreground">{{ title }}</span>
      </div>

      <div v-if="isEditMode" class="flex items-center gap-1">
        <button
          @click="$emit('settings')"
          class="p-1 hover:bg-secondary hover:text-foreground text-muted-foreground rounded transition-colors"
          :title="getI18nText('settings', 'Settings')">
          <i class="pi pi-cog text-xs"></i>
        </button>
        <button
          @click="$emit('remove')"
          class="p-1 hover:bg-destructive/10 hover:text-destructive text-muted-foreground rounded transition-colors"
          :title="getI18nText('dashboardRemoveWidget', 'Remove Widget')">
          <i class="pi pi-times text-xs"></i>
        </button>
      </div>
    </div>

    <div
      class="flex-1 overflow-hidden relative transition-all duration-300"
      :class="{ 'pointer-events-none': isEditMode }">
      <slot></slot>

      <div v-if="isEditMode" class="absolute inset-0 z-10"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { useDashboardStore } from '../../stores/dashboardStore';
import { storeToRefs } from 'pinia';
// @ts-ignore
import { i18nTrigger } from '../../pages/dashboard/languageManager';

const props = defineProps<{
  title: string;
  type: string;
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rowHeight: number;
  colWidth: number;
}>();

const emit = defineEmits(['remove', 'settings', 'drag-start']);

const store = useDashboardStore();
const { isEditMode } = storeToRefs(store);

const getI18nText = (key: string, fallback: string) => {
  i18nTrigger.value;
  if (
    (window as any).languageManager &&
    typeof (window as any).languageManager.getText === 'function'
  ) {
    const translated = (window as any).languageManager.getText(key);
    return translated && translated !== key ? translated : fallback;
  }
  return fallback;
};

const capPulse = ref(false);

function triggerCapPulse() {
  capPulse.value = false;
  requestAnimationFrame(() => {
    capPulse.value = true;
    window.setTimeout(() => {
      capPulse.value = false;
    }, 160);
  });
}

function getMaxHeightRowsForType(type: string): number | null {
  if (type === 'raffle') return 17;
  return null;
}

type ResizeDirection = 'top' | 'bottom' | 'left' | 'right';

let stopListeners: null | (() => void) = null;

function startDrag(e: MouseEvent) {
  if (!isEditMode.value) return;
  if (e.button !== 0) return;

  const target = e.target as HTMLElement;
  if (target.closest('button') || target.classList.contains('resize-zone')) return;

  e.preventDefault();
  emit('drag-start', e);
}

function startResize(direction: ResizeDirection, e: MouseEvent) {
  if (!isEditMode.value) return;

  store.isResizing = true;

  const startClientX = e.clientX;
  const startClientY = e.clientY;

  let lastAppliedRows = 0;
  let lastAppliedCols = 0;

  const onMove = (moveEvent: MouseEvent) => {
    const deltaPxY = moveEvent.clientY - startClientY;
    const deltaPxX = moveEvent.clientX - startClientX;

    const deltaRows = Math.round(deltaPxY / props.rowHeight);
    const deltaCols = Math.round(deltaPxX / props.colWidth);

    if (direction === 'top' || direction === 'bottom') {
      const diff = deltaRows - lastAppliedRows;
      if (diff !== 0) {
        const maxRows = getMaxHeightRowsForType(props.type);
        if (maxRows != null) {
          const attemptedDeltaH = direction === 'bottom' ? diff : -diff;
          if (attemptedDeltaH > 0 && (props.h >= maxRows || props.h + attemptedDeltaH > maxRows)) {
            triggerCapPulse();
          }
        }

        store.resizeWidgetTransaction(props.i, direction, diff);
        lastAppliedRows = deltaRows;
      }
    } else {
      const diff = deltaCols - lastAppliedCols;
      if (diff !== 0) {
        store.resizeWidgetTransaction(props.i, direction, diff);
        lastAppliedCols = deltaCols;
      }
    }
  };

  const onUp = () => {
    store.isResizing = false;
    if (stopListeners) stopListeners();
    stopListeners = null;
  };

  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp, { once: true });

  stopListeners = () => {
    window.removeEventListener('mousemove', onMove);
  };
}

onBeforeUnmount(() => {
  if (stopListeners) stopListeners();
});
</script>

<style scoped>
.cap-pulse {
  animation: capPulse 160ms ease-in-out;
}

@keyframes capPulse {
  0% {
    box-shadow: 0 0 0 0 rgba(85, 63, 238, 0);
  }
  50% {
    box-shadow: 0 0 0 2px rgba(85, 63, 238, 0.9);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(85, 63, 238, 0);
  }
}

.widget-header {
  height: 40px;
}

.resize-zone {
  position: absolute;
  z-index: 20;
}

.resize-zone-top,
.resize-zone-bottom {
  left: 0;
  right: 0;
  height: 6px;
  cursor: row-resize;
}

.resize-zone-top {
  top: 0;
}
.resize-zone-bottom {
  bottom: 0;
}

.resize-zone-left,
.resize-zone-right {
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: col-resize;
}

.resize-zone-left {
  left: 0;
}
.resize-zone-right {
  right: 0;
}

.resize-zone:hover::after {
  content: '';
  position: absolute;
  background-color: #553fee;
  z-index: 30;
}

.resize-zone-top:hover::after {
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
}

.resize-zone-bottom:hover::after {
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
}

.resize-zone-left:hover::after {
  top: 0;
  bottom: 0;
  left: 0;
  width: 2px;
}

.resize-zone-right:hover::after {
  top: 0;
  bottom: 0;
  right: 0;
  width: 2px;
}

.resize-zone-bottom-panel {
  bottom: 0;
  left: 0;
  right: 0;
  height: 8px;
  cursor: row-resize;
  z-index: 25;
}

.resize-zone-bottom-panel:hover::after {
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
}
</style>
