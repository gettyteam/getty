<template>
  <Teleport v-for="u in activeUsers" :key="u.userKey" :to="u.slotEl" :disabled="!u.slotEl">
    <template v-if="u.progress > 0 && u.progress <= 100">
      <div
        class="chat-activity-flame"
        :class="{ blue: u.progress >= 80 }"
        :style="{ '--intensity': String(u.progress / 100) }"
        :title="`Intensity: ${u.progress}%`"
        aria-hidden="true">
        <svg
          class="chat-activity-flame__svg"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 64 64"
          role="img"
          aria-label="">
          <defs>
            <linearGradient id="__gettyFlameGrad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stop-color="rgba(255, 107, 0, 1)" />
              <stop offset="55%" stop-color="rgba(255, 166, 0, 1)" />
              <stop offset="100%" stop-color="rgba(255, 235, 150, 1)" />
            </linearGradient>
            <linearGradient id="__gettyFlameGradBlue" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stop-color="rgba(0, 80, 255, 1)" />
              <stop offset="55%" stop-color="rgba(0, 140, 255, 1)" />
              <stop offset="100%" stop-color="rgba(150, 200, 255, 1)" />
            </linearGradient>
          </defs>
          <path
            class="chat-activity-flame__outer"
            fill="url(#__gettyFlameGrad)"
            d="M33 2c2 10-3 15-7 20-5 6-7 10-6 16 1 9 9 17 18 17 10 0 18-8 18-18 0-11-8-17-12-25-2-4-4-7-3-10-4 2-6 6-8 10z" />
          <path
            class="chat-activity-flame__inner"
            fill="rgba(255,255,255,0.9)"
            d="M33 20c1 6-2 9-4 12-3 3-4 6-3 9 1 5 5 9 10 9 6 0 10-4 10-10 0-6-4-9-7-13-1-2-2-4-2-7-2 1-3 3-4 5z" />
        </svg>
      </div>
      <div
        v-if="u.combo > 1"
        :key="u.combo"
        class="chat-combo-counter"
        :class="{ blue: u.progress >= 80 }">
        x{{ u.combo }}
      </div>
    </template>
  </Teleport>

  <div v-if="announce" class="sr-only" aria-live="polite" aria-atomic="true">
    {{ liveText }}
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue';

const props = defineProps({
  windowMs: { type: Number, default: 120_000 },
  threshold: { type: Number, default: 20 },
  maxMessages: { type: Number, default: 45 },
  highlightDurationMs: { type: Number, default: 30_000 },
  announce: { type: Boolean, default: false },
});

const emit = defineEmits(['milestone']);

const userStates = shallowRef(new Map());

const renderVersion = ref(0);

const liveText = ref('');

function cssEscapeCompat(value) {
  const s = String(value ?? '');
  try {
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(s);
  } catch {}
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function computeTargetFromCount(count) {
  const t = Number(props.threshold);
  const max = Math.max(t + 1, Number(props.maxMessages));
  if (!Number.isFinite(count) || count <= t) return 0;
  const ratio = (count - t) / (max - t);
  return Math.round(clamp01(ratio) * 100);
}

function ensureState(userKey) {
  const key = String(userKey || '').trim();
  if (!key) return null;

  const map = userStates.value;
  if (map.has(key)) return map.get(key);

  const st = {
    timestamps: [],
    progress: 0,
    target: 0,
    lastMessageId: '',
    highlightedUntil: 0,
    lastMilestone: { 50: false, 100: false },
    preview: null,
    totalCount: 0,
    streakReached: false,
    combo: 0,
  };
  map.set(key, st);
  return st;
}

function dispatchMilestone(userKey, milestone) {
  try {
    emit('milestone', { userKey, milestone });
  } catch {}
  try {
    window.dispatchEvent(
      new CustomEvent('getty:chat-activity-milestone', {
        detail: { userKey, milestone },
      })
    );
  } catch {}

  if (props.announce) {
    if (milestone === '50') liveText.value = `High activity: ${userKey}`;
    else if (milestone === '100') liveText.value = `Max activity: ${userKey}`;
    else if (milestone === 'reset') liveText.value = `Activity reset: ${userKey}`;
  }
}

function setHighlightedDom(userKey, highlighted) {
  try {
    const selector = `.message[data-user-id="${cssEscapeCompat(String(userKey))}"]`;
    const nodes = document.querySelectorAll(selector);
    nodes.forEach((el) => {
      try {
        el.classList.toggle('user-message--highlighted', !!highlighted);
      } catch {}
    });
  } catch {}
}

function onMessageAdded(ev) {
  const d = ev?.detail || {};
  const userKey = String(d.userKey || '').trim();
  if (!userKey) return;

  const now = typeof d.at === 'number' ? d.at : Date.now();
  const messageId = String(d.messageId || '').trim();

  const st = ensureState(userKey);
  if (!st) return;

  st.lastMessageId = messageId || st.lastMessageId;

  const threshold = Number(props.threshold);
  if (st.progress > 0 || st.timestamps.length >= threshold) {
    st.combo = (st.combo || 0) + 1;
  } else {
    st.combo = 1;
  }

  st.totalCount = (st.totalCount || 0) + 1;
  if (st.totalCount === 50 && !st.streakReached) {
    st.streakReached = true;
    try {
      window.dispatchEvent(
        new CustomEvent('getty:chat-streak-reached', {
          detail: { userKey, username: d.username },
        })
      );
    } catch {}
  }

  st.timestamps.push(now);
}

function onPreview(ev) {
  const d = ev?.detail || {};
  const userKey = String(d.userKey || '').trim();
  if (!userKey) return;

  const st = ensureState(userKey);
  if (!st) return;

  if (d.reset) {
    st.timestamps = [];
    st.preview = null;
    st.target = 0;
    st.progress = 0;
    st.highlightedUntil = 0;
    st.lastMilestone['50'] = false;
    st.lastMilestone['100'] = false;
    st.streakReached = false;
    st.totalCount = 0;
    st.combo = 0;
    setHighlightedDom(userKey, false);
    dispatchMilestone(userKey, 'reset');
    return;
  }

  if (d.streak) {
    try {
      window.dispatchEvent(
        new CustomEvent('getty:chat-streak-reached', {
          detail: { userKey, username: userKey },
        })
      );
    } catch {}
    return;
  }

  const p = Number(d.progress);
  const progress = Math.max(0, Math.min(100, Number.isFinite(p) ? p : 0));
  st.preview = { until: Date.now() + 10_000, value: progress };
  st.lastMessageId = String(d.messageId || st.lastMessageId || '');

  if (progress >= 100) {
    st.highlightedUntil = Date.now() + Number(props.highlightDurationMs);
  } else {
    st.highlightedUntil = 0;
    setHighlightedDom(userKey, false);
  }
}

let rafId = 0;
function tick() {
  const now = Date.now();
  const map = userStates.value;

  for (const [userKey, st] of map.entries()) {
    const win = Number(props.windowMs);
    const cutoff = now - win;
    if (Array.isArray(st.timestamps) && st.timestamps.length) {
      let idx = 0;
      while (idx < st.timestamps.length && st.timestamps[idx] < cutoff) idx++;
      if (idx > 0) st.timestamps.splice(0, idx);
    }

    const previewActive = st.preview && now < st.preview.until;
    const highlighted = st.highlightedUntil && now < st.highlightedUntil;

    let target = 0;
    if (previewActive) {
      target = st.preview.value;
    } else {
      const count = st.totalCount || 0;
      const threshold = Number(props.threshold);
      const isFrequencyMatch = count > threshold && count % 6 === 0;
      const isStreakEnd = count === 50;
      const isCooldown = count > 50;

      if (!isCooldown && (isFrequencyMatch || isStreakEnd)) {
        target = computeTargetFromCount(st.timestamps.length);
      } else {
        target = 0;
      }
    }

    if (target >= 100) {
      st.highlightedUntil = Math.max(
        st.highlightedUntil || 0,
        now + Number(props.highlightDurationMs)
      );
    }

    st.target = target;

    const current = Number(st.progress) || 0;
    const diff = st.target - current;
    const factor = diff > 0 ? 0.18 : 0.05;
    const step = diff * factor;
    const next = Math.abs(diff) < 0.15 ? st.target : current + step;
    st.progress = Math.max(0, Math.min(100, next));

    const reached50 = st.progress >= 50;
    const reached100 = st.progress >= 100;

    if (reached50 && !st.lastMilestone['50']) {
      st.lastMilestone['50'] = true;
      dispatchMilestone(userKey, '50');
    }

    if (reached100 && !st.lastMilestone['100']) {
      st.lastMilestone['100'] = true;
      dispatchMilestone(userKey, '100');
    }

    if (st.progress < 1 && st.target < 1) {
      st.combo = 0;
      if (st.lastMilestone['50'] || st.lastMilestone['100']) {
        st.lastMilestone['50'] = false;
        st.lastMilestone['100'] = false;
        dispatchMilestone(userKey, 'reset');
      }
    }

    const shouldHighlight = st.progress >= 100 || highlighted;
    setHighlightedDom(userKey, shouldHighlight);

    const inactive =
      !previewActive &&
      !shouldHighlight &&
      (!st.timestamps || st.timestamps.length === 0) &&
      st.progress < 0.5;
    if (inactive) {
      setHighlightedDom(userKey, false);
      map.delete(userKey);
    }
  }

  if (map.size) renderVersion.value++;

  rafId = requestAnimationFrame(tick);
}

const activeUsers = computed(() => {
  void renderVersion.value;
  const out = [];
  for (const [userKey, st] of userStates.value.entries()) {
    const progress = Number(st.progress) || 0;
    const lastId = String(st.lastMessageId || '').trim();
    const slotEl = lastId ? document.getElementById(`chat-activity-slot-${lastId}`) : null;
    if (progress > 0 && progress <= 100 && slotEl) {
      out.push({ userKey, progress, slotEl, combo: st.combo || 0 });
    }
  }
  return out;
});

onMounted(() => {
  try {
    window.addEventListener('getty:chat-message-added', onMessageAdded);
    window.addEventListener('getty:chat-activity-preview', onPreview);
  } catch {}
  rafId = requestAnimationFrame(tick);
});

onUnmounted(() => {
  try {
    window.removeEventListener('getty:chat-message-added', onMessageAdded);
    window.removeEventListener('getty:chat-activity-preview', onPreview);
  } catch {}
  if (rafId) cancelAnimationFrame(rafId);
});

try {
  window.__gettyChatActivity = {
    setPreview: (userKey, progress) => {
      window.dispatchEvent(
        new CustomEvent('getty:chat-activity-preview', { detail: { userKey, progress } })
      );
    },
    reset: (userKey) => {
      window.dispatchEvent(
        new CustomEvent('getty:chat-activity-preview', { detail: { userKey, reset: true } })
      );
    },
  };
} catch {}
</script>
