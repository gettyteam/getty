import { onUnmounted } from 'vue';

const registry = [];

export function registerDirty(fn, label) {
  if (typeof fn === 'function') {
    const exists = registry.some((entry) => entry.fn === fn);
    if (!exists) {
      let safeLabel = label;
      if (!safeLabel || typeof safeLabel !== 'string' || !safeLabel.trim()) {
        safeLabel = 'Settings';
      }
      registry.push({ fn, label: safeLabel });
    }
  }
}

export function unregisterDirty(fn) {
  const idx = registry.findIndex((entry) => entry.fn === fn);
  if (idx >= 0) registry.splice(idx, 1);
}

export function anyDirty() {
  return registry.some((entry) => {
    try {
      return entry.fn();
    } catch {
      return false;
    }
  });
}

export function getDirtyLabels() {
  return registry
    .filter((entry) => {
      try {
        return entry.fn();
      } catch {
        return false;
      }
    })
    .map((entry) => entry.label);
}

export function clearDirty(fn) {
  if (fn) {
    unregisterDirty(fn);
  } else {
    registry.splice(0, registry.length);
  }
}

export function useDirty(fn, label) {
  registerDirty(fn, label);
  try {
    onUnmounted(() => {
      unregisterDirty(fn);
    });
  } catch {
  }
}
