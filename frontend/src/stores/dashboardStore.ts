import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { DashboardWidget, LayoutConfig, WidgetType } from '../types/dashboard';
import { nanoid } from 'nanoid';
import { useStorage, watchDebounced } from '@vueuse/core';

export const useDashboardStore = defineStore('dashboard', () => {
  const layoutStorageKey = computed(() => {
    let token = '';
    try {
      const match = window.location.pathname.match(/^\/user\/([A-Za-z0-9_-]+)/);
      if (match) token = match[1];
    } catch {}

    const scope = token ? `token:${token}` : `host:${window.location.host}`;
    return `getty:dashboard:layout:${scope}`;
  });

  const legacyStorage = useStorage<DashboardWidget[]>('getty-dashboard-layout', []);
  const storage = useStorage<DashboardWidget[]>(layoutStorageKey, []);

  try {
    if ((!storage.value || storage.value.length === 0) && legacyStorage.value?.length) {
      storage.value = legacyStorage.value;
    }
  } catch {}

  const layout = ref<DashboardWidget[]>(storage.value);

  const ROW_HEIGHT_PX = 30;
  const MIN_H_ROWS = 7;
  const DEFAULT_TALL_ROWS = 26;

  const getRecommendedHeightRows = (type: WidgetType): number => {
    switch (type) {
      case 'chat':
        return 14;
      case 'alerts':
        return 13;
      case 'achievements':
        return 16;
      case 'raffle':
        return 17;
      case 'stats':
        return 11;
      case 'goal':
        return MIN_H_ROWS;
      case 'last-tip':
        return 13;
      default:
        return 9;
    }
  };

  function rectsOverlap(
    a: { x: number; y: number; w: number; h: number },
    b: { x: number; y: number; w: number; h: number }
  ) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function findNextColumnPosition(w: number, h: number): { x: number; y: number } | null {
    if (w !== 4) return null;

    const xCandidates = [0, 4, 8];

    const ranked = xCandidates
      .map((x) => {
        const stackCount = layout.value.filter((it) => it.x === x && it.w === w).length;
        return { x, stackCount };
      })
      .sort((a, b) => (a.stackCount !== b.stackCount ? a.stackCount - b.stackCount : a.x - b.x));

    for (const cand of ranked) {
      const x = cand.x;
      const bottom = layout.value
        .filter((it) => x < it.x + it.w && x + w > it.x)
        .reduce((acc, it) => Math.max(acc, it.y + it.h), 0);

      let y = bottom;
      const guardMax = 500;
      let guard = 0;
      const selfRect = { x, y, w, h };
      const collidesAt = (testY: number) =>
        layout.value.some((other) => rectsOverlap({ ...selfRect, y: testY }, other));

      while (collidesAt(y) && guard < guardMax) {
        y += 1;
        guard += 1;
      }

      if (guard < guardMax) return { x, y };
    }

    return null;
  }

  watchDebounced(
    layout,
    () => {
      storage.value = layout.value;
    },
    { debounce: 1000, deep: true }
  );

  const isEditMode = ref(false);
  const isResizing = ref(false);
  const availableWidgets = ref<WidgetType[]>([
    'chat',
    'stats',
    'alerts',
    'goal',
    'last-tip',
    'raffle',
    'achievements'
  ]);

  function addWidget(type: WidgetType) {
    const existing = layout.value.find((w) => w.type === type);
    if (existing) {
      if (existing.isMinimized) {
        existing.isMinimized = false;
      }
      return;
    }

    const w = 4;

    const h = Math.max(MIN_H_ROWS, getRecommendedHeightRows(type));

    const pos = findNextColumnPosition(w, h) ?? findFirstAvailablePosition(w, h);

    const sameColumn = layout.value.filter((it) => it.x === pos.x && it.w === w);
    const topWidget = sameColumn
      .slice()
      .sort((a, b) => a.y - b.y)[0];
    if (topWidget && sameColumn.length === 1) {
      const oldBottom = topWidget.y + topWidget.h;
      if (pos.y === oldBottom && topWidget.h > getRecommendedHeightRows(topWidget.type)) {
        const TOP_ROW_BASELINE = Math.max(MIN_H_ROWS, getRecommendedHeightRows('chat'));
        const recommendedTopH = TOP_ROW_BASELINE;
        const shrinkBy = topWidget.h - recommendedTopH;
        topWidget.h = recommendedTopH;
        pos.y = Math.max(0, pos.y - shrinkBy);

        const TOP_COLUMNS = [0, 4, 8];
        for (const colX of TOP_COLUMNS) {
          if (colX === pos.x) continue;
          const colItems = layout.value
            .filter((it) => it.x === colX && it.w === w)
            .slice()
            .sort((a, b) => a.y - b.y);

          if (colItems.length !== 1) continue;
          const only = colItems[0];
          if (only.y !== 0) continue;
          if (only.h <= TOP_ROW_BASELINE) continue;
          only.h = TOP_ROW_BASELINE;
        }
      }
    }

    const newWidget: DashboardWidget = {
      id: nanoid(),
      type,
      x: pos.x,
      y: pos.y,
      w,
      h,
      i: nanoid(),
      isMinimized: false,
      settings: {},
      props: {}
    };
    layout.value.push(newWidget);
  }

  function findFirstAvailablePosition(w: number, h: number): { x: number; y: number } {
    const cols = 12;
    let y = 0;
    let x = 0;

    while (true) {
      const overlaps = layout.value.some((item) => {
        if (x + w > cols) return true;

        return (
          x < item.x + item.w &&
          x + w > item.x &&
          y < item.y + item.h &&
          y + h > item.y
        );
      });

      if (!overlaps && x + w <= cols) {
        return { x, y };
      }

      x++;
      if (x + w > cols) {
        x = 0;
        y++;
      }
    }
  }

  function removeWidget(i: string) {
    const widget = layout.value.find((w) => w.i === i);
    if (!widget) return;
    widget.isMinimized = true;
  }

  function updateLayout(newLayout: DashboardWidget[]) {
    layout.value = newLayout;
  }

  function updateWidget(i: string, patch: Partial<DashboardWidget>) {
    const widget = layout.value.find(w => w.i === i);
    if (!widget) return;
    Object.assign(widget, patch);
  }

  function resizeWidgetTransaction(i: string, edge: 'top' | 'bottom' | 'left' | 'right', delta: number) {
    const target = layout.value.find(w => w.i === i);
    if (!target) return;

    const MIN_H = MIN_H_ROWS;
    const MIN_W = 2;
    const MAX_COLS = 12;

    const getMaxHeightRows = (type: string) => {
      if (type === 'goal' || type === 'last-tip') return 13;
      if (type === 'raffle') return 17;
      return 9999;
    };

    if (edge === 'bottom') {
      const neighbor = layout.value.find(w => 
        w.i !== i && 
        w.x === target.x && 
        w.w === target.w && 
        w.y === target.y + target.h
      );

      const MAX_H_ROWS = getMaxHeightRows(target.type);

      if (neighbor) {
        let actualDelta = delta;
        if (delta > 0) {
          const spaceToMax = Math.max(0, MAX_H_ROWS - target.h);
          const maxGrowth = Math.min(Math.max(0, neighbor.h - MIN_H), spaceToMax);
          actualDelta = Math.min(delta, maxGrowth);
        } else {
          const maxShrink = Math.max(0, target.h - MIN_H);
          actualDelta = Math.max(delta, -maxShrink);
        }

        if (actualDelta !== 0) {
          target.h += actualDelta;
          neighbor.y += actualDelta;
          neighbor.h -= actualDelta;
        }
      } else {
        let actualDelta = delta;
        if (delta > 0) {
            const spaceToMax = Math.max(0, MAX_H_ROWS - target.h);
            actualDelta = Math.min(delta, spaceToMax);
        }
        const newH = Math.max(MIN_H, target.h + actualDelta);
        target.h = newH;
      }
    } 
    else if (edge === 'top') {
      const neighbor = layout.value.find(w => 
        w.i !== i && 
        w.x === target.x && 
        w.w === target.w &&
        w.y + w.h === target.y
      );

      const MAX_H_ROWS = getMaxHeightRows(target.type);

      if (neighbor) {
        let actualDelta = delta;
        if (delta < 0) {
           const spaceToMax = Math.max(0, MAX_H_ROWS - target.h);
           const maxGrowth = Math.min(Math.max(0, neighbor.h - MIN_H), spaceToMax);
           actualDelta = Math.max(delta, -maxGrowth);
        } else {
           const maxShrink = Math.max(0, target.h - MIN_H);
           actualDelta = Math.min(delta, maxShrink);
        }

        if (actualDelta !== 0) {
          target.y += actualDelta;
          target.h -= actualDelta;
          neighbor.h += actualDelta;
        }
      } else {
        if (target.y + delta < 0) delta = -target.y;
        
        let actualDelta = delta;
        if (delta < 0) {
            const spaceToMax = Math.max(0, MAX_H_ROWS - target.h);
            actualDelta = Math.max(delta, -spaceToMax);
        }

        if (target.h - actualDelta < MIN_H) actualDelta = target.h - MIN_H;
        
        if (actualDelta !== 0) {
            target.y += actualDelta;
            target.h -= actualDelta;
        }
      }
    }
    else if (edge === 'right') {
        const edgeX = target.x + target.w;
        
        const leftGroup = layout.value.filter(w => w.x + w.w === edgeX);
        
        const rightGroup = layout.value.filter(w => w.x === edgeX);

        if (rightGroup.length > 0) {
            let actualDelta = delta;
            if (delta > 0) {
                const minAvailableWidth = Math.min(...rightGroup.map(n => n.w - MIN_W));
                const maxGrowth = Math.max(0, minAvailableWidth);
                actualDelta = Math.min(delta, maxGrowth);
            } else {
                const minAvailableWidth = Math.min(...leftGroup.map(n => n.w - MIN_W));
                const maxShrink = Math.max(0, minAvailableWidth);
                actualDelta = Math.max(delta, -maxShrink);
            }
            
            if (actualDelta !== 0) {
                leftGroup.forEach(w => {
                    w.w += actualDelta;
                });
                rightGroup.forEach(w => {
                    w.x += actualDelta;
                    w.w -= actualDelta;
                });
            }
        } else {
            const maxW = MAX_COLS - target.x;
             const newW = Math.max(MIN_W, Math.min(target.w + delta, MAX_COLS - target.x));
             target.w = newW;
        }
    }
    else if (edge === 'left') {
        const edgeX = target.x;

        const rightGroup = layout.value.filter(w => w.x === edgeX);

        const leftGroup = layout.value.filter(w => w.x + w.w === edgeX);

        if (leftGroup.length > 0) {
            let actualDelta = delta;
            if (delta < 0) {
                const minAvailableWidth = Math.min(...leftGroup.map(n => n.w - MIN_W));
                const maxGrowth = Math.max(0, minAvailableWidth);
                actualDelta = Math.max(delta, -maxGrowth);
            } else {
                const minAvailableWidth = Math.min(...rightGroup.map(n => n.w - MIN_W));
                const maxShrink = Math.max(0, minAvailableWidth);
                actualDelta = Math.min(delta, maxShrink);
            }

            if (actualDelta !== 0) {
                rightGroup.forEach(w => {
                    w.x += actualDelta;
                    w.w -= actualDelta;
                });
                leftGroup.forEach(w => {
                    w.w += actualDelta;
                });
            }
        } else {
             if (target.x + delta < 0) delta = -target.x;
             if (target.w - delta < MIN_W) delta = target.w - MIN_W;
             
             if (delta !== 0) {
                 target.x += delta;
                 target.w -= delta;
             }
        }
    }
  }

  function swapWidgetPosition(i: string, targetX: number, targetY: number) {
    const widget = layout.value.find((w) => w.i === i);
    if (!widget) return;

    const targetWidget = layout.value.find(
      (w) =>
        w.i !== i &&
        targetX >= w.x &&
        targetX < w.x + w.w &&
        targetY >= w.y &&
        targetY < w.y + w.h
    );

    if (targetWidget) {
      const oldX = widget.x;
      const oldY = widget.y;
      const nextWidget = { ...widget, x: targetWidget.x, y: targetWidget.y };
      const nextTarget = { ...targetWidget, x: oldX, y: oldY };

      layout.value = layout.value.map((w) => {
        if (w.i === nextWidget.i) return nextWidget;
        if (w.i === nextTarget.i) return nextTarget;
        return w;
      });
      return;
    }

    const nextWidget = { ...widget, x: targetX, y: targetY };
    layout.value = layout.value.map((w) => (w.i === nextWidget.i ? nextWidget : w));
  }

  function toggleEditMode() {
    isEditMode.value = !isEditMode.value;
  }

  function resetLayout() {
    const nextLayout: DashboardWidget[] = [
      { id: nanoid(), type: 'chat', x: 0, y: 0, w: 4, h: DEFAULT_TALL_ROWS, i: nanoid(), props: {} },
      { id: nanoid(), type: 'alerts', x: 4, y: 0, w: 4, h: DEFAULT_TALL_ROWS, i: nanoid(), props: {} },
      { id: nanoid(), type: 'achievements', x: 8, y: 0, w: 4, h: DEFAULT_TALL_ROWS, i: nanoid(), props: {} }
    ];

    layout.value = nextLayout;
    storage.value = nextLayout;
  }

  return {
    layout,
    isEditMode,
    isResizing,
    availableWidgets,
    addWidget,
    removeWidget,
    updateLayout,
    updateWidget,
    resizeWidgetTransaction,
    swapWidgetPosition,
    toggleEditMode,
    resetLayout
  };
});
