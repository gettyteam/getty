<template>
  <div class="dashboard-container relative h-full w-full overflow-hidden flex bg-background">
    <div
      class="flex-1 h-full overflow-auto no-scrollbar transition-[padding] duration-300 relative bg-background"
      :class="{
        'pr-8': isEditMode,
        'is-resizing-mode': store.isResizing,
        'bg-grid-pattern': isEditMode,
      }"
      ref="gridContainer">
      <div v-if="dropPreview" class="absolute inset-0 pointer-events-none z-[55]">
        <div
          class="absolute border-2 border-primary bg-primary/10"
          :style="{
            left: dropPreview.left + 'px',
            top: dropPreview.top + 'px',
            width: dropPreview.width + 'px',
            height: dropPreview.height + 'px',
          }" />
      </div>

      <GridLayout
        v-model:layout="layout"
        :col-num="12"
        :row-height="30"
        :margin="[0, 0]"
        :is-draggable="false"
        :is-resizable="false"
        :vertical-compact="true"
        :use-css-transforms="true">
        <GridItem
          v-for="item in layout"
          :key="item.i"
          :x="item.x"
          :y="item.y"
          :w="item.w"
          :h="item.h"
          :i="item.i"
          drag-allow-from=".drag-handle">
          <WidgetWrapper
            :title="getWidgetTitle(item.type)"
            :type="item.type"
            :i="item.i"
            :x="item.x"
            :y="item.y"
            :w="item.w"
            :h="item.h"
            :row-height="30"
            :col-width="colWidth"
            @settings="openSettings(item)"
            @drag-start="onDragStart(item, $event)"
            @remove="removeWidget(item.i)">
            <component
              :is="getWidgetComponent(item.type)"
              v-bind="{
                ...item.props,
                ...(item.type === 'achievements' ? { inCustomGrid: true } : {}),
                ...(item.type === 'chat' ? { inCustomGrid: true } : {}),
                ...(item.type === 'alerts' ? { inCustomGrid: true } : {}),
              }"
              class="h-full w-full" />
          </WidgetWrapper>
        </GridItem>
      </GridLayout>
    </div>

    <div
      v-if="isEditMode"
      class="absolute right-0 top-0 h-full z-50 flex transition-transform duration-300 ease-in-out translate-x-[calc(100%-24px)] hover:translate-x-0">
      <div
        class="w-6 h-full bg-card border-l border-border flex items-center justify-center cursor-pointer hover:bg-secondary/50 transition-colors shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">
        <i class="pi pi-angle-left text-muted-foreground"></i>
      </div>
      <div class="w-72 h-full bg-card border-l border-border shadow-2xl">
        <WidgetSelector @add="store.addWidget" />
      </div>
    </div>

    <div
      v-if="dragGhost"
      class="fixed z-[100] pointer-events-none bg-primary/20 border-2 border-primary rounded shadow-xl flex items-center justify-center"
      :style="{
        left: dragGhost.x + 'px',
        top: dragGhost.y + 'px',
        width: dragGhost.w + 'px',
        height: dragGhost.h + 'px',
      }">
      <span class="text-primary font-bold bg-background/80 px-2 py-1 rounded">{{
        dragGhost.title
      }}</span>
    </div>

    <div
      v-if="activeSettingsWidget"
      class="absolute inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      @click.self="closeSettings">
      <div class="bg-card border border-border rounded-lg shadow-xl w-96 max-w-full p-4 m-4">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-semibold text-lg">
            {{ getWidgetTitle(activeSettingsWidget.type) }}
            {{ getI18nText('settings', 'Settings') }}
          </h3>
          <button @click="closeSettings" class="text-muted-foreground hover:text-foreground">
            <i class="pi pi-times"></i>
          </button>
        </div>
        <div class="space-y-4">
          <p class="text-sm text-muted-foreground">
            {{ getSettingsDescription(activeSettingsWidget.type) }}
          </p>
        </div>
        <div class="mt-6 flex justify-end">
          <button
            @click="closeSettings"
            class="px-4 py-2 rounded border border-border bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors text-sm font-medium">
            {{ getI18nText('dashboardDone', 'Done') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { GridLayout, GridItem } from 'grid-layout-plus';
import { storeToRefs } from 'pinia';
import { useDashboardStore } from '../../stores/dashboardStore';
import WidgetWrapper from './WidgetWrapper.vue';
import WidgetSelector from './WidgetSelector.vue';
import { getWidgetComponent, widgetTitles } from '../../utils/widgetRegistry';
import type { DashboardWidget } from '../../types/dashboard';
import { ref, computed } from 'vue';
import { useElementSize } from '@vueuse/core';
// @ts-ignore
import { i18nTrigger } from '../../pages/dashboard/languageManager';

const store = useDashboardStore();
const { layout, isEditMode } = storeToRefs(store);
const { removeWidget } = store;

const gridContainer = ref<HTMLElement | null>(null);
const { width: containerWidth } = useElementSize(gridContainer);
const colWidth = computed(() => (containerWidth.value || 1200) / 12);
const ROW_HEIGHT = 30;
const COLS = 12;

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

const widgetTitleKeys: Record<string, string> = {
  chat: 'chat',
  'last-tip': 'lastTip',
  goal: 'tipGoal',
  alerts: 'recentEventsTitle',
  raffle: 'giveawaysTitle',
  achievements: 'achievementsTitle',
  stats: 'streamStatsTitle',
};

const getWidgetTitle = (type: string) => {
  const fallback = widgetTitles[type as keyof typeof widgetTitles] || 'Widget';
  const key = widgetTitleKeys[type];
  return key ? getI18nText(key, fallback) : fallback;
};

const activeSettingsWidget = ref<DashboardWidget | null>(null);

const openSettings = (widget: DashboardWidget) => {
  activeSettingsWidget.value = widget;
};

const closeSettings = () => {
  activeSettingsWidget.value = null;
};

const getSettingsDescription = (type: string) => {
  if (type === 'alerts') {
    return getI18nText(
      'dashboardRecentEventsSettingsDesc',
      'This widget shows tips, achievements, and giveaway activity in a single feed.'
    );
  }

  return getI18nText(
    'dashboardWidgetSettingsDesc',
    'Configuration options for this widget will appear here.'
  );
};

const dragGhost = ref<{ x: number; y: number; w: number; h: number; title: string } | null>(null);
const dragGridSize = ref<{ w: number; h: number } | null>(null);
const dropPreview = ref<{ left: number; top: number; width: number; height: number } | null>(null);
let dragOffset = { x: 0, y: 0 };
let draggedWidgetId: string | null = null;

function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function findWidgetAtPoint(
  gridX: number,
  gridY: number,
  excludeI?: string
): DashboardWidget | null {
  const hit = layout.value.find(
    (w) =>
      w.i !== excludeI && gridX >= w.x && gridX < w.x + w.w && gridY >= w.y && gridY < w.y + w.h
  );
  return hit || null;
}

function computeGhostCenterInGrid(): { centerX: number; centerY: number } | null {
  if (!dragGhost.value || !gridContainer.value) return null;

  const containerRect = gridContainer.value.getBoundingClientRect();
  const centerClientX = dragGhost.value.x + dragGhost.value.w / 2;
  const centerClientY = dragGhost.value.y + dragGhost.value.h / 2;

  const relCenterX = centerClientX - containerRect.left + (gridContainer.value.scrollLeft || 0);
  const relCenterY = centerClientY - containerRect.top + (gridContainer.value.scrollTop || 0);

  const centerX = Math.floor(relCenterX / colWidth.value);
  const centerY = Math.floor(relCenterY / ROW_HEIGHT);
  return { centerX, centerY };
}

function computeMoveDockFromCenter(
  centerX: number,
  centerY: number
): { x: number; y: number } | null {
  if (!dragGridSize.value) return null;

  const w = dragGridSize.value.w;
  const h = dragGridSize.value.h;

  const leftX = Math.round(centerX - w / 2);
  const topY = Math.round(centerY - h / 2);

  const clampedX = Math.min(Math.max(leftX, 0), Math.max(0, COLS - w));
  const desiredY = Math.max(topY, 0);

  const candidateYs = Array.from(new Set([0, ...layout.value.map((w) => w.y), desiredY])).sort(
    (a, b) => a - b
  );
  const rankedYs = candidateYs
    .map((y) => ({ y, d: Math.abs(y - desiredY) }))
    .sort((a, b) => a.d - b.d);

  const selfRect = { x: clampedX, y: desiredY, w, h };
  const collidesAt = (y: number) => {
    const testRect = { ...selfRect, y };
    return layout.value.some(
      (other) => other.i !== draggedWidgetId && rectsOverlap(testRect, other)
    );
  };

  const SNAP_MAX_DIST = 8;
  for (const cand of rankedYs) {
    if (cand.d > SNAP_MAX_DIST) break;
    if (!collidesAt(cand.y)) return { x: clampedX, y: cand.y };
  }

  let y = desiredY;
  let guard = 0;
  while (collidesAt(y) && guard < 500) {
    y += 1;
    guard += 1;
  }
  return { x: clampedX, y };
}

function computeDock(): { x: number; y: number } | null {
  if (!draggedWidgetId || !dragGridSize.value) return null;

  const center = computeGhostCenterInGrid();
  if (!center) return null;

  const hit = findWidgetAtPoint(center.centerX, center.centerY, draggedWidgetId);
  if (hit) return { x: hit.x, y: hit.y };

  return computeMoveDockFromCenter(center.centerX, center.centerY);
}

function updateDropPreview() {
  const target = computeDock();
  if (!target || !dragGridSize.value) {
    dropPreview.value = null;
    return;
  }

  dropPreview.value = {
    left: target.x * colWidth.value,
    top: target.y * ROW_HEIGHT,
    width: dragGridSize.value.w * colWidth.value,
    height: dragGridSize.value.h * ROW_HEIGHT,
  };
}

const onDragStart = (item: DashboardWidget, e: MouseEvent) => {
  if (!store.isEditMode) return;

  const target = (e.target as HTMLElement).closest('.widget-wrapper');
  if (!target) return;

  const rect = target.getBoundingClientRect();
  dragOffset = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };

  draggedWidgetId = item.i;
  dragGridSize.value = { w: item.w, h: item.h };
  dragGhost.value = {
    x: rect.left,
    y: rect.top,
    w: rect.width,
    h: rect.height,
    title: getWidgetTitle(item.type),
  };

  updateDropPreview();

  window.addEventListener('mousemove', onDragMove);
  window.addEventListener('mouseup', onDragEnd);
};

const onDragMove = (e: MouseEvent) => {
  if (!dragGhost.value) return;
  dragGhost.value.x = e.clientX - dragOffset.x;
  dragGhost.value.y = e.clientY - dragOffset.y;

  updateDropPreview();
};

const onDragEnd = (e: MouseEvent) => {
  if (draggedWidgetId) {
    const target = computeDock();
    if (target) {
      store.swapWidgetPosition(draggedWidgetId, target.x, target.y);
    }
  }

  dragGhost.value = null;
  dragGridSize.value = null;
  dropPreview.value = null;
  draggedWidgetId = null;
  window.removeEventListener('mousemove', onDragMove);
  window.removeEventListener('mouseup', onDragEnd);
};
</script>

<style scoped>
.vgl-item--placeholder {
  background: #f1f5f9 !important;
  opacity: 0.3;
  z-index: 0;
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}

.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.is-resizing-mode :deep(.vgl-item) {
  transition:
    transform 200ms ease,
    width 200ms ease,
    height 200ms ease !important;
  z-index: 100;
}

:deep(.os-card) {
  padding: 0 !important;
  border-radius: 0 !important;
  border: none !important;
  box-shadow: none !important;
}

.bg-grid-pattern {
  background-color: var(--bg-background);
  background-image: radial-gradient(#cbd5e1 1px, var(--bg-background) 1px);
  background-size: 20px 20px;
}

:global(.dark) .bg-grid-pattern {
  background-color: var(--bg-background);
  background-image: radial-gradient(#334155 1px, var(--bg-background) 1px);
}
</style>
