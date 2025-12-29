<template>
  <section class="admin-tab active goal-followers-root" role="form">
    <BlockedState v-if="isBlocked" :module-name="t('goalFollowersTitle')" :details="blockDetails" />

    <div v-else>
      <div class="goal-followers-grid">
        <div class="goal-followers-box" aria-labelledby="gf-basics-title">
          <div class="goal-followers-head">
            <HeaderIcon>
              <i class="pi pi-users" aria-hidden="true"></i>
            </HeaderIcon>
            <h3 id="gf-basics-title" class="goal-followers-title">
              {{ t('goalFollowersBasicsTitle') }}
            </h3>
          </div>

          <div class="gf-setting-item is-vertical" aria-live="polite">
            <div class="gf-setting-text">
              <div class="gf-setting-title">{{ t('goalFollowersCustomTitleLabel') }}</div>
            </div>
            <div class="gf-setting-control full-width">
              <input
                id="gf-title"
                class="input"
                type="text"
                maxlength="40"
                v-model="form.title"
                :aria-invalid="!!errors.title"
                :class="{ 'input-error': errors.title }"
                :placeholder="t('goalFollowersCustomTitlePlaceholder')" />
              <div class="gf-field-foot">
                <span :class="errors.title ? 'error' : ''">{{
                  errors.title || t('goalFollowersCustomTitleHint')
                }}</span>
                <span aria-live="polite" aria-atomic="true">{{
                  t('charsUsed', { used: form.title.length, max: 40 })
                }}</span>
              </div>
            </div>
          </div>

          <div class="gf-setting-item">
            <div class="gf-setting-text">
              <div class="gf-setting-title">{{ t('goalFollowersTargetLabel') }}</div>
              <div class="gf-setting-desc">{{ t('goalFollowersTargetHint') }}</div>
            </div>
            <div class="gf-setting-control">
              <input
                id="gf-goal"
                class="input"
                type="number"
                min="1"
                v-model.number="form.goal"
                :aria-invalid="!!errors.goal"
                :class="{ 'input-error': errors.goal }" />
              <div class="gf-field-foot">
                <span :class="errors.goal ? 'error' : ''">{{ errors.goal }}</span>
              </div>
            </div>
          </div>

          <div class="gf-setting-item">
            <div class="gf-setting-text">
              <div class="gf-setting-title">{{ t('goalFollowersCurrentLabel') }}</div>
              <div class="gf-setting-desc">{{ currentFollowersHint }}</div>
            </div>
            <div class="gf-setting-control">
              <input
                id="gf-current"
                class="input"
                type="number"
                :value="currentFollowers"
                disabled />
            </div>
          </div>

          <div class="gf-section-header" aria-hidden="true">
            {{ t('goalFollowersChannelTitle') }}
          </div>

          <div class="gf-setting-item is-vertical">
            <div class="gf-setting-text">
              <div class="gf-setting-title">{{ t('goalFollowersClaimIdLabel') }}</div>
              <div class="gf-setting-desc">{{ t('goalFollowersClaimIdHint') }}</div>
            </div>
            <div class="gf-setting-control full-width">
              <input
                id="gf-claim"
                class="input"
                type="text"
                v-model="form.claimId"
                :aria-invalid="!!errors.claimId"
                :class="{ 'input-error': errors.claimId }"
                :placeholder="t('goalFollowersClaimIdPlaceholder')" />
              <div class="gf-field-foot">
                <span :class="errors.claimId ? 'error' : ''">{{ errors.claimId }}</span>
              </div>
            </div>
          </div>

          <div class="gf-setting-item is-vertical">
            <div class="gf-setting-text">
              <div class="gf-setting-title">{{ t('goalFollowersAuthTitle') }}</div>
              <div class="gf-setting-desc">
                {{ hasAuthToken ? t('goalFollowersAuthReady') : t('goalFollowersAuthMissing') }}
              </div>
            </div>
          </div>
        </div>

        <div class="goal-followers-box" aria-labelledby="gf-visual-title">
          <div class="goal-followers-head">
            <HeaderIcon>
              <svg
                class="os-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M14.31 8l5.74 9.94" />
                <path d="M9.69 8h11.48" />
                <path d="M7.38 12l5.74-9.94" />
                <path d="M9.69 16L3.95 6.06" />
                <path d="M14.31 16H2.83" />
              </svg>
            </HeaderIcon>
            <h3 id="gf-visual-title" class="goal-followers-title">
              {{ t('goalFollowersVisualTitle') }}
            </h3>
          </div>

          <div class="gf-setting-item is-vertical">
            <div class="gf-colors-grid">
              <ColorInput v-model="form.bgColor" :label="t('goalFollowersBackgroundColorLabel')" />
              <ColorInput v-model="form.color" :label="t('goalFollowersColorLabel')" />
            </div>
          </div>

          <div class="gf-setting-item">
            <div class="gf-setting-text">
              <div class="gf-setting-title">{{ t('goalFollowersRadiusLabel') }}</div>
              <div class="gf-setting-desc">{{ t('goalFollowersRadiusHint') }}</div>
            </div>
            <div class="gf-setting-control">
              <input
                id="gf-radius"
                class="input"
                type="number"
                min="0"
                max="999"
                v-model.number="form.borderRadius" />
            </div>
          </div>

          <div class="gf-setting-item">
            <div class="gf-setting-text">
              <div class="gf-setting-title">{{ t('goalFollowersWidthLabel') }}</div>
              <div class="gf-setting-desc">{{ t('goalFollowersSizeHint') }}</div>
            </div>
            <div class="gf-setting-control">
              <input
                id="gf-width"
                class="input"
                type="number"
                min="1"
                max="1920"
                v-model.number="form.width" />
            </div>
          </div>

          <div class="gf-setting-item">
            <div class="gf-setting-text">
              <div class="gf-setting-title">{{ t('goalFollowersHeightLabel') }}</div>
              <div class="gf-setting-desc">{{ t('goalFollowersSizeHint') }}</div>
            </div>
            <div class="gf-setting-control">
              <input
                id="gf-height"
                class="input"
                type="number"
                min="1"
                max="1080"
                v-model.number="form.height" />
            </div>
          </div>

          <div class="gf-preview-wrapper">
            <div class="gf-preview-stage" ref="previewStage">
              <div class="gf-preview-card" :style="previewVars">
                <div class="gf-preview-title">{{ previewTitle }}</div>
                <div class="gf-preview-row">
                  <span class="gf-preview-current">{{ previewCurrent }}</span>
                  <span class="gf-preview-target"
                    >/ {{ previewGoal }} {{ t('goalFollowersShortLabel') }}</span
                  >
                </div>
                <div class="gf-preview-track">
                  <div class="gf-preview-fill"></div>
                </div>
              </div>
            </div>
            <div class="gf-preview-note">{{ t('goalFollowersPreviewNote') }}</div>
          </div>
        </div>

        <div class="goal-followers-box" aria-labelledby="gf-audio-title">
          <div class="goal-followers-head">
            <HeaderIcon>
              <svg
                class="os-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round">
                <path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6l-5 4H4a1 1 0 0 0-1 1Z" />
                <path d="M16 12h2" />
                <path d="M16 8h2" />
                <path d="M16 16h2" />
              </svg>
            </HeaderIcon>
            <h3 id="gf-audio-title" class="goal-followers-title">
              {{ t('goalFollowersAudioTitle') }}
            </h3>
          </div>

          <div class="gf-setting-item is-vertical">
            <div class="gf-setting-text">
              <div class="gf-setting-title">{{ t('audioSource') }}</div>
              <div class="gf-setting-desc">{{ t('goalFollowersAudioHint') }}</div>
            </div>
            <LegacyAudioControls
              compact
              force-stack
              :show-label="false"
              :enabled="audioCfg.enabled"
              :volume="audioCfg.volume"
              :audio-source="audio.audioSource"
              :has-custom-audio="audioState.hasCustomAudio"
              :audio-file-name="audioState.audioFileName"
              :audio-file-size="audioState.audioFileSize"
              :audio-library-id="audioState.audioLibraryId"
              :library-enabled="true"
              :storage-provider="audioStorageProvider"
              :storage-providers="storageOptions"
              :storage-loading="storageLoading"
              save-endpoint="/api/goal-followers-audio-settings"
              delete-endpoint="/api/goal-followers-audio-settings"
              custom-audio-endpoint="/api/goal-followers-custom-audio"
              @update:enabled="(val) => (audioCfg.enabled = val)"
              @update:volume="(val) => (audioCfg.volume = val)"
              @update:audio-source="(val) => (audio.audioSource = val)"
              @update:storage-provider="handleAudioStorageProviderChange"
              @audio-saved="handleAudioSaved"
              @audio-deleted="handleAudioDeleted"
              @toast="handleAudioToast" />
          </div>
        </div>

        <div class="goal-followers-box" aria-labelledby="gf-widget-title">
          <div class="goal-followers-head">
            <HeaderIcon>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
            </HeaderIcon>
            <h3 id="gf-widget-title" class="goal-followers-title">{{ t('obsIntegration') }}</h3>
          </div>
          <div class="gf-setting-item is-vertical">
            <div class="gf-setting-text">
              <div class="gf-setting-title">{{ t('goalFollowersWidgetUrl') }}</div>
              <div class="gf-setting-desc">{{ t('tipWidgetObsHint') }}</div>
            </div>
            <div class="copy-field-row">
              <CopyField :value="widgetUrl" :aria-label="t('goalFollowersWidgetUrl')" secret />
            </div>

            <div class="gf-obs-actions">
              <button
                class="btn btn-secondary btn-compact-secondary"
                type="button"
                :disabled="testCelebrationBusy"
                @click="testGoalCelebration">
                <i class="pi pi-sparkles" aria-hidden="true"></i
                ><span class="gf-obs-action-label">{{ t('goalFollowersTestCelebration') }}</span>
              </button>

              <button
                class="btn btn-secondary btn-compact-secondary"
                type="button"
                :disabled="saving"
                @click="resetColors">
                <i class="pi pi-palette" aria-hidden="true"></i
                ><span class="gf-obs-action-label">{{ t('goalFollowersResetColors') }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="gf-actions">
        <button
          class="btn"
          type="button"
          :disabled="saving"
          @click="save"
          :aria-busy="saving ? 'true' : 'false'">
          {{ saving ? t('commonSaving') : t('saveSettings') }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { reactive, computed, onMounted, ref, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDirty } from '../composables/useDirtyRegistry';
import api from '../services/api';
import { pushToast } from '../services/toast';
import { usePublicToken } from '../composables/usePublicToken';
import { useStorageProviders } from '../composables/useStorageProviders';
import CopyField from './shared/CopyField.vue';
import ColorInput from './shared/ColorInput.vue';
import LegacyAudioControls from './shared/LegacyAudioControls.vue';
import HeaderIcon from './shared/HeaderIcon.vue';
import BlockedState from './shared/BlockedState.vue';

const { t } = useI18n();
const WUZZY_PROVIDER_ID = 'wuzzy';

const isBlocked = ref(false);
const blockDetails = ref({});

const form = reactive({
  title: '',
  goal: 100,
  claimId: '',
  color: '#00ff7f',
  bgColor: '#080c10',
  borderRadius: 16,
  width: 560,
  height: 140,
});

const hasAuthToken = ref(false);
const currentFollowers = ref(0);
const currentLoading = ref(false);

const audio = reactive({ audioSource: 'remote' });
const audioCfg = reactive({ enabled: true, volume: 0.8 });

const audioState = reactive({
  hasCustomAudio: false,
  audioFileName: '',
  audioFileSize: 0,
  audioLibraryId: '',
  storageProvider: '',
});

const errors = reactive({
  title: '',
  goal: '',
  claimId: '',
});

const saving = ref(false);
const originalSnapshot = ref('');

const { withToken, refresh } = usePublicToken();
const widgetUrl = computed(() => withToken(`${location.origin}/widgets/goal-followers`));

const storage = useStorageProviders();
const selectedStorageProvider = computed({
  get: () => storage.selectedProvider.value,
  set: (val) => storage.setSelectedProvider(val),
});
const storageOptions = computed(() => storage.providerOptions.value);
const storageLoading = computed(() => storage.loading.value);
const audioStorageProvider = computed(
  () => audioState.storageProvider || selectedStorageProvider.value || ''
);

watch(selectedStorageProvider, (next) => {
  if (audioState.storageProvider === WUZZY_PROVIDER_ID) return;
  audioState.storageProvider = typeof next === 'string' ? next : '';
});

const previewTitle = computed(
  () => (form.title && form.title.trim()) || t('goalFollowersDefaultTitleAdmin')
);
const previewGoal = computed(() => (Number(form.goal) || 0).toLocaleString());
const previewCurrent = computed(() =>
  Math.min(previewCurrentValue.value, previewGoalValue.value).toLocaleString()
);

const previewStage = ref(null);
const previewForceComplete = ref(false);
const testCelebrationBusy = ref(false);

const previewGoalValue = computed(() => Math.max(1, Number(form.goal) || 1));
const previewCurrentValue = computed(() => {
  if (previewForceComplete.value) return previewGoalValue.value;
  return Math.max(0, Number(currentFollowers.value) || 0);
});
const previewPctValue = computed(() => {
  if (previewForceComplete.value) return 100;
  const goal = previewGoalValue.value;
  const current = Math.min(previewCurrentValue.value, goal);
  return Math.min(100, Math.max(0, (current / Math.max(1, goal)) * 100));
});

const PREVIEW_WIDTH = 400;
const PREVIEW_HEIGHT = 140;

const previewVars = computed(() => ({
  '--gf-width': `${PREVIEW_WIDTH}px`,
  '--gf-height': `${PREVIEW_HEIGHT}px`,
  '--gf-radius': `${Math.max(0, Math.min(999, Number(form.borderRadius) || 16))}px`,
  '--gf-card-bg': form.bgColor || '#080c10',
  '--gf-progress': form.color || '#00ff7f',
  '--gf-progress-pct': `${previewPctValue.value.toFixed(1)}%`,
}));

function clamp(n, min, max) {
  const v = Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.min(max, Math.max(min, v));
}

function perceptual(vol) {
  const v = clamp(vol, 0, 1);
  return Math.pow(v, 2);
}

function getVueScopeAttrName(el) {
  if (!el || !el.attributes) return '';
  const attrs = Array.from(el.attributes);
  const scope = attrs.find(
    (attr) => typeof attr?.name === 'string' && attr.name.startsWith('data-v-')
  );
  return scope?.name || '';
}

function spawnPreviewConfetti() {
  const stage = previewStage.value;
  if (!stage) return;

  const scopeAttr = getVueScopeAttrName(stage);

  const colors = ['#00ff7f', '#7c3aed', '#22c55e', '#38bdf8', '#f59e0b', '#fb7185'];
  const rect = stage.getBoundingClientRect();
  const nodes = [];

  for (let i = 0; i < 46; i += 1) {
    const node = document.createElement('div');
    node.className = 'gf-preview-confetti';
    if (scopeAttr) node.setAttribute(scopeAttr, '');

    const startX = Math.random() * rect.width;
    const dx = (Math.random() - 0.5) * rect.width * 0.9;
    const dy = rect.height + 160 + Math.random() * 160;
    const rot = 180 + Math.random() * 540;
    const delay = Math.random() * 0.16;
    const bg = colors[Math.floor(Math.random() * colors.length)];

    node.style.setProperty('--x', `${startX}px`);
    node.style.setProperty('--dx', `${dx}px`);
    node.style.setProperty('--dy', `${dy}px`);
    node.style.setProperty('--rot', `${rot}deg`);
    node.style.setProperty('--bg', bg);
    node.style.animationDelay = `${delay}s`;

    stage.appendChild(node);
    nodes.push(node);
  }

  setTimeout(() => {
    try {
      nodes.forEach((n) => n.remove());
    } catch {}
  }, 2200);
}

async function playGoalCompletionAudio() {
  if (!audioCfg.enabled) return;

  const linear = clamp(audioCfg.volume, 0, 1);
  const eff = perceptual(linear);
  const fallbackRemote =
    'https://52agquhrbhkx3u72ikhun7oxngtan55uvxqbp4pzmhslirqys6wq.arweave.net/7oBoUPEJ1X3T-kKPRv3XaaYG97St4Bfx-WHktEYYl60';

  const wantsCustom = audio.audioSource === 'custom';
  const hasCustom = !!audioState.hasCustomAudio;

  let url = fallbackRemote;
  try {
    if (wantsCustom) {
      if (!hasCustom) {
        pushToast({ type: 'info', message: t('goalFollowersTestCelebrationNoCustomAudio') });
        return;
      }
      const response = await api.get('/api/goal-followers-custom-audio');
      if (response?.data?.url) url = response.data.url;
    } else {
      const response = await api.get('/api/goal-followers-audio');
      if (response?.data?.url) url = response.data.url;
    }
  } catch {
    return;
  }

  const audioEl = new Audio(url);
  audioEl.volume = eff;
  await audioEl.play();
}

async function testGoalCelebration() {
  if (testCelebrationBusy.value) return;
  testCelebrationBusy.value = true;
  try {
    previewForceComplete.value = true;
    await nextTick();
    spawnPreviewConfetti();
    await playGoalCompletionAudio();
  } catch {
    pushToast({ type: 'error', message: t('goalFollowersTestCelebrationFailed') });
  } finally {
    setTimeout(() => {
      previewForceComplete.value = false;
    }, 1400);
    testCelebrationBusy.value = false;
  }
}

function resetColors() {
  form.bgColor = '#080c10';
  form.color = '#00ff7f';
}

const currentFollowersHint = computed(() =>
  hasAuthToken.value ? t('goalFollowersCurrentHint') : t('goalFollowersCurrentHintMissingAuth')
);

function serializeSnapshot() {
  return JSON.stringify({
    title: form.title,
    goal: form.goal,
    claimId: form.claimId,
    color: form.color,
    bgColor: form.bgColor,
    borderRadius: form.borderRadius,
    width: form.width,
    height: form.height,
    audioSource: audio.audioSource,
    audioEnabled: audioCfg.enabled,
    audioVolume: audioCfg.volume,
  });
}

function validate() {
  errors.title = form.title.length > 40 ? t('valMax40') : '';
  errors.goal = (Number(form.goal) || 0) < 1 ? t('valMin1') : '';
  const claim = (form.claimId || '').trim();
  errors.claimId = claim && !/^[a-f0-9]{40}$/i.test(claim) ? t('valInvalid') : '';

  form.width = Math.max(1, Math.min(1920, Number(form.width) || 1));
  form.height = Math.max(1, Math.min(1080, Number(form.height) || 1));
  form.borderRadius = Math.max(0, Math.min(999, Number(form.borderRadius) || 0));

  return !errors.title && !errors.goal && !errors.claimId;
}

async function loadConfig() {
  isBlocked.value = false;
  try {
    const { data } = await api.get('/api/goal-followers');
    if (data && data.success) {
      form.title = data.title || '';
      form.goal = typeof data.goal === 'number' ? data.goal : 100;
      form.claimId = data.claimId || '';
      form.color = data.color || '#00ff7f';
      form.bgColor = data.bgColor || '#080c10';
      form.borderRadius = typeof data.borderRadius === 'number' ? data.borderRadius : 16;
      form.width = typeof data.width === 'number' ? data.width : 560;
      form.height = typeof data.height === 'number' ? data.height : 140;
      currentFollowers.value =
        typeof data.currentFollowers === 'number' ? data.currentFollowers : 0;
      hasAuthToken.value = !!data.hasAuthToken;
    }
  } catch (e) {
    if (
      e.response?.data?.error === 'CONFIGURATION_BLOCKED' ||
      e.response?.data?.error === 'configuration_blocked'
    ) {
      isBlocked.value = true;
      const details = e.response.data.details;
      blockDetails.value = typeof details === 'string' ? { reason: details } : details || {};
      return;
    }
    if (!(e?.response?.status === 404)) {
      pushToast({ type: 'error', message: t('goalFollowersLoadFailed') });
    }
  }
}

async function refreshCurrentFollowers() {
  if (currentLoading.value) return;
  currentLoading.value = true;
  try {
    const { data } = await api.get('/api/goal-followers/current');
    if (data && data.active && typeof data.currentFollowers === 'number') {
      currentFollowers.value = data.currentFollowers;
    }
  } catch {
    // silent
  } finally {
    currentLoading.value = false;
  }
}

async function loadAudioState() {
  try {
    const { data } = await api.get('/api/goal-followers-audio-settings');
    if (!data) return;
    audioState.hasCustomAudio = !!data.hasCustomAudio;
    audioState.audioFileName = data.audioFileName || '';
    audioState.audioFileSize = data.audioFileSize || 0;
    audioState.audioLibraryId = data.audioLibraryId || '';
    audioState.storageProvider =
      typeof data.storageProvider === 'string' ? data.storageProvider : audioState.storageProvider;
    if (typeof data.audioSource === 'string') audio.audioSource = data.audioSource;
    if (Object.prototype.hasOwnProperty.call(data, 'enabled')) audioCfg.enabled = !!data.enabled;
    if (Object.prototype.hasOwnProperty.call(data, 'volume')) {
      const vol = Number(data.volume);
      if (!Number.isNaN(vol)) audioCfg.volume = Math.min(Math.max(vol, 0), 1);
    }
    if (audioState.storageProvider && audioState.storageProvider !== WUZZY_PROVIDER_ID) {
      storage.registerProvider(audioState.storageProvider);
    }
  } catch (e) {
    if (
      e.response?.data?.error === 'CONFIGURATION_BLOCKED' ||
      e.response?.data?.error === 'configuration_blocked'
    ) {
      isBlocked.value = true;
      const details = e.response.data.details;
      blockDetails.value = typeof details === 'string' ? { reason: details } : details || {};
      return;
    }
  }
}

function resolveStorageSelection(preferred = '') {
  const candidates = [];
  if (preferred) candidates.push(preferred);
  if (audioState.storageProvider) candidates.push(audioState.storageProvider);
  storage.ensureSelection(candidates);
}

async function loadAll() {
  await loadConfig();
  await loadAudioState();
  resolveStorageSelection();
  originalSnapshot.value = serializeSnapshot();
}

async function save() {
  if (!validate()) return;
  try {
    saving.value = true;
    const payload = {
      title: form.title,
      goal: form.goal,
      claimId: form.claimId,
      color: form.color,
      bgColor: form.bgColor,
      borderRadius: form.borderRadius,
      width: form.width,
      height: form.height,
    };
    const res = await api.post('/api/goal-followers', payload);
    if (res?.data?.success) {
      const audioForm = new FormData();
      audioForm.append('audioSource', audio.audioSource || 'remote');
      audioForm.append('enabled', String(!!audioCfg.enabled));
      audioForm.append(
        'volume',
        String(Number.isFinite(Number(audioCfg.volume)) ? audioCfg.volume : 0.8)
      );
      if (audio.audioSource === 'custom') {
        const provider = audioStorageProvider.value || '';
        if (provider) audioForm.append('storageProvider', provider);
      }

      await api.post('/api/goal-followers-audio-settings', audioForm);
      await loadAudioState();
      resolveStorageSelection();

      await refreshCurrentFollowers();

      originalSnapshot.value = serializeSnapshot();
      pushToast({ type: 'success', message: t('goalFollowersSaveSuccess') });
    }
  } catch (e) {
    if (
      e.response?.data?.error === 'CONFIGURATION_BLOCKED' ||
      e.response?.data?.error === 'configuration_blocked'
    ) {
      isBlocked.value = true;
      const details = e.response.data.details;
      blockDetails.value = typeof details === 'string' ? { reason: details } : details || {};
      return;
    }
    pushToast({ type: 'error', message: t('goalFollowersSaveFailed') });
  } finally {
    saving.value = false;
  }
}

async function handleAudioSaved() {
  await loadAudioState();
  resolveStorageSelection();
}

async function handleAudioDeleted() {
  audio.audioSource = 'remote';
  await loadAudioState();
  resolveStorageSelection();
}

function handleAudioToast(payload) {
  if (!payload || !payload.messageKey) return;
  const message = t(payload.messageKey);
  if (!message) return;
  pushToast({ type: payload.type || 'info', message });
}

function handleAudioStorageProviderChange(val) {
  audioState.storageProvider = typeof val === 'string' ? val : '';
  if (audioState.storageProvider && audioState.storageProvider !== WUZZY_PROVIDER_ID) {
    storage.setSelectedProvider(audioState.storageProvider);
  }
}

useDirty(
  () => !isBlocked.value && originalSnapshot.value !== serializeSnapshot(),
  t('goalFollowersTitle')
);

watch(storageOptions, () => resolveStorageSelection());

onMounted(async () => {
  try {
    await refresh();
  } catch {}
  await storage.fetchProviders();
  await loadAll();
  await refreshCurrentFollowers();
  setInterval(refreshCurrentFollowers, 60000);
});
</script>

<style scoped src="./GoalFollowersPanel/GoalFollowersPanel.css"></style>
