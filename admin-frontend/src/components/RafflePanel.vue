<template>
  <section class="admin-tab active relative text-[var(--text-primary)] raffle-root" role="form">
    <BlockedState v-if="isBlocked" :module-name="t('raffleModule')" :details="blockDetails" />

    <div v-else>
      <div
        v-if="masked"
        class="absolute inset-0 z-10 flex items-center justify-center backdrop-blur bg-black/35">
        <div
          class="p-5 rounded-md bg-[var(--bg-card)] border border-[var(--border-color)] shadow-lg max-w-md text-center">
          <div class="mb-2 text-lg font-semibold">{{ t('raffleSessionRequiredTitle') }}</div>
          <p class="mb-4 text-sm">{{ t('raffleSessionRequiredBody') }}</p>
          <a href="/" class="btn" aria-label="wallet-login-redirect">{{ t('createSession') }}</a>
        </div>
      </div>

      <div
        v-if="warning"
        class="bg-[var(--bg-card)] border-l-4 border-amber-500 p-4 mb-6 rounded-md flex items-center gap-3">
        <i class="pi pi-exclamation-triangle text-xl"></i>
        <div class="flex items-center gap-3">
          <strong class="font-semibold whitespace-nowrap">{{ t('raffleWarningTitle') }}</strong>
          <div class="text-sm">{{ t('raffleWarningChat') }}</div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="raffle-group-box">
          <div class="raffle-group-head">
            <HeaderIcon>
              <i class="pi pi-gift"></i>
            </HeaderIcon>
            <h3 class="raffle-group-title">{{ t('raffleSettings') }}</h3>
          </div>

          <div class="raffle-setting-item">
            <div class="raffle-setting-text">
              <div class="raffle-setting-title">{{ t('raffleCommandLabel') }}</div>
              <div class="raffle-setting-desc">{{ t('raffleCommandHint') }}</div>
            </div>
            <div class="raffle-setting-control">
              <input
                v-model="form.command"
                type="text"
                class="form-input"
                :placeholder="t('raffleCommandPlaceholder')" />
            </div>
          </div>

          <div class="raffle-setting-item">
            <div class="raffle-setting-text">
              <div class="raffle-setting-title">{{ t('rafflePrizeLabel') }}</div>
              <div class="raffle-setting-desc flex items-center gap-2">
                <span>{{ t('rafflePrizeDesc') }}</span>
                <span
                  class="text-xs"
                  :class="form.prize.length >= 15 ? 'text-red-500' : 'text-[var(--text-muted)]'">
                  {{ form.prize.length }}/15
                </span>
              </div>
            </div>
            <div class="raffle-setting-control">
              <input
                v-model="form.prize"
                type="text"
                maxlength="15"
                class="form-input"
                :placeholder="t('rafflePrizePlaceholder')" />
            </div>
          </div>

          <div class="raffle-setting-item">
            <div class="raffle-setting-text">
              <div class="raffle-setting-title flex items-center gap-2">
                <span>{{ t('storageProviderLabel') }}</span>
                <button
                  type="button"
                  class="custom-tooltip-btn inline-flex items-center justify-center w-5 h-5 rounded cursor-help text-emerald-400"
                  :data-tooltip="t('storageProviderArweaveTooltip')"
                  :aria-label="t('storageProviderArweaveTooltip')"
                  tabindex="0">
                  <i class="pi pi-info-circle os-help-icon" aria-hidden="true"></i>
                </button>
              </div>
              <div class="raffle-setting-desc">{{ t('storageProviderDesc') }}</div>
              <p
                v-if="providerStatus && !providerStatus.available"
                class="text-xs text-amber-500 mt-1">
                {{ providerStatus.label }} {{ t('storageProviderUnavailable') }}
              </p>
            </div>
            <div class="raffle-setting-control">
              <QuickSelect
                v-model="selectedStorageProvider"
                :options="quickSelectStorageOptions"
                :placeholder="t('storageProviderSelect')"
                :aria-label="t('storageProviderSelect')"
                class="min-w-[160px]" />
            </div>
          </div>

          <div class="raffle-setting-item is-vertical">
            <div class="raffle-setting-text mb-2">
              <div class="raffle-setting-title">{{ t('rafflePrizeImageLabel') }}</div>
              <div class="raffle-setting-desc">
                {{ t('rafflePrizeImageHint') }}
              </div>
            </div>

            <input
              ref="imageInput"
              type="file"
              accept="image/png,image/jpeg,image/gif"
              class="hidden"
              @change="onImageFileChange" />

            <div class="img-preview-box" :class="{ 'is-empty': !displayImageUrl }">
              <div class="img-media" v-if="displayImageUrl">
                <img :src="displayImageUrl" :alt="form.imageOriginalName" />
              </div>
              <div class="img-media placeholder" v-else>
                <span class="placeholder-text">{{ t('imageNoSelected') }}</span>
              </div>

              <div v-if="displayImageUrl" class="px-4 text-sm font-medium truncate flex-1">
                {{ selectedPrizeFilename || form.imageOriginalName }}
              </div>
            </div>

            <div class="raffle-actions-row mt-3">
              <button
                v-if="selectedStorageProvider && selectedStorageProvider !== 'wuzzy'"
                class="btn-secondary btn-compact-secondary"
                type="button"
                @click="openImageDialog">
                <i class="pi pi-image"></i>
                {{ t('imageChoose') }}
              </button>
              <button
                v-if="selectedStorageProvider === 'wuzzy'"
                class="btn-secondary btn-compact-secondary"
                type="button"
                @click="openWuzzyDrawer">
                <i class="pi pi-search"></i>
                {{ t('imageSearchWuzzy') }}
              </button>
              <button
                class="btn-secondary btn-compact-secondary"
                type="button"
                @click="openImageLibraryDrawer"
                :disabled="imageLibrary.loading">
                <i class="pi pi-images"></i>
                {{ t('imageLibraryOpenBtn') }}
              </button>
              <button
                v-if="displayImageUrl"
                class="btn-danger btn-icon"
                type="button"
                :title="t('commonRemoveImage')"
                @click="clearPrizeImage">
                <i class="pi pi-trash"></i>
              </button>

              <button
                class="btn-secondary btn-compact-secondary btn-save-style ml-auto"
                type="button"
                :disabled="savingSettings || masked"
                @click="saveSettings">
                {{ savingSettings ? t('commonSaving') : t('saveSettings') }}
              </button>
            </div>

            <div v-if="imageLibrary.error" class="text-xs mt-1 text-red-500">
              {{ imageLibrary.error }}
            </div>
          </div>

          <div class="raffle-setting-item is-vertical">
            <div class="flex items-center justify-between mb-2 w-full">
              <div class="raffle-setting-title">{{ t('raffleControlsTitle') }}</div>
              <div
                class="status-badge px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5"
                :class="
                  state.active && !state.paused
                    ? 'bg-green-600 text-[var(--text-primary)]'
                    : state.paused
                      ? 'bg-amber-500 text-[var(--text-primary)]'
                      : 'bg-[var(--bg-chat)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                ">
                <i
                  class="pi pi-circle-fill text-[8px]"
                  :class="{
                    'text-[var(--text-primary)]': state.active || state.paused,
                    'text-gray-400': !state.active && !state.paused,
                  }"></i>
                {{
                  state.active && !state.paused
                    ? t('raffleStatusActive')
                    : state.paused
                      ? t('raffleStatusPaused')
                      : t('raffleInactive')
                }}
                <span v-if="state.active">({{ participants.length }})</span>
              </div>
            </div>

            <div class="flex flex-wrap gap-2 w-full">
              <button
                @click="start"
                :disabled="(state.active && !state.paused) || savingAction"
                class="btn-custom btn-success flex-1 justify-center">
                <i class="pi pi-play text-xs"></i> {{ t('raffleStart') }}
              </button>
              <button
                @click="pause"
                :disabled="!state.active || state.paused || savingAction"
                class="btn-custom btn-warning flex-1 justify-center">
                <i class="pi pi-pause text-xs"></i> {{ t('rafflePause') }}
              </button>
              <button
                @click="resume"
                :disabled="!state.active || !state.paused || savingAction"
                class="btn-custom btn-secondary flex-1 justify-center">
                <i class="pi pi-replay text-xs"></i> {{ t('raffleResume') }}
              </button>
              <button
                @click="stop"
                :disabled="!state.active || savingAction"
                class="btn-custom btn-danger flex-1 justify-center">
                <i class="pi pi-stop text-xs"></i> {{ t('raffleStop') }}
              </button>
              <button
                @click="draw"
                :disabled="!participants.length || savingAction"
                class="btn-custom btn-primary flex-1 justify-center min-w-[120px]">
                <i class="pi pi-crown text-xs"></i> {{ t('raffleBtnWinner') }}
              </button>
            </div>
          </div>

          <div class="raffle-setting-item">
            <div class="raffle-setting-text">
              <div class="raffle-setting-title">{{ t('raffleCleanTitle') }}</div>
              <div class="raffle-setting-desc">{{ t('raffleCleanDesc') }}</div>
            </div>
            <div class="raffle-setting-control">
              <button
                @click="cleanEverything"
                :disabled="savingAction"
                class="btn-custom btn-danger text-xs px-3 py-1">
                <i class="pi pi-trash text-sm mr-1"></i> {{ t('raffleCleanBtn') }}
              </button>
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-4">
          <div class="raffle-group-box">
            <div class="raffle-group-head">
              <HeaderIcon>
                <i class="pi pi-sliders-h"></i>
              </HeaderIcon>
              <h3 class="raffle-group-title">{{ t('advancedSettings') }}</h3>
            </div>

            <div class="raffle-setting-item">
              <div class="raffle-setting-text">
                <div class="raffle-setting-title">{{ t('raffleMaxWinnersLabel') }}</div>
                <div class="raffle-setting-desc">{{ t('raffleMaxWinnersDesc') }}</div>
              </div>
              <div class="raffle-setting-control">
                <div
                  class="counter flex items-center border border-[var(--border-color)] rounded-lg overflow-hidden h-[36px]">
                  <button
                    @click="handleDecrement"
                    class="w-8 h-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors">
                    -
                  </button>
                  <input
                    type="number"
                    v-model.number="form.maxWinners"
                    readonly
                    class="w-10 h-full text-center bg-transparent border-x border-[var(--border-color)] focus:outline-none appearance-none m-0 text-sm" />
                  <button
                    @click="handleIncrement"
                    class="w-8 h-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors">
                    +
                  </button>
                </div>
              </div>
            </div>

            <div class="raffle-setting-item">
              <div class="raffle-setting-text">
                <div class="raffle-setting-title">{{ t('raffleEnabled') }}</div>
                <div class="raffle-setting-desc">{{ t('raffleEnabledDesc') }}</div>
              </div>
              <div class="raffle-setting-control">
                <label class="toggle-switch relative inline-block w-[44px] h-[24px]">
                  <input
                    type="checkbox"
                    v-model="form.enabled"
                    @change="saveSettings"
                    class="sr-only peer" />
                  <span
                    class="absolute cursor-pointer top-0 left-0 right-0 bottom-0 bg-[var(--border-color)] transition-all duration-300 rounded-full peer-checked:bg-indigo-500 before:absolute before:content-[''] before:h-[18px] before:w-[18px] before:left-[3px] before:bottom-[3px] before:bg-white before:transition-all before:duration-300 before:rounded-full peer-checked:before:translate-x-[20px]"></span>
                </label>
              </div>
            </div>
          </div>

          <div class="raffle-group-box">
            <div class="raffle-group-head">
              <HeaderIcon>
                <i class="pi pi-desktop"></i>
              </HeaderIcon>
              <h3 class="raffle-group-title">{{ t('obsIntegration') }}</h3>
            </div>

            <p class="mb-4 text-sm text-[var(--text-secondary)] opacity-80">
              {{ t('raffleWidgetHelp') }}
            </p>

            <CopyField :value="widgetUrl" :aria-label="t('raffleWidgetUrl')" secret />
          </div>
        </div>
      </div>

      <ImageLibraryDrawer
        :open="imageLibrary.open"
        :items="imageLibrary.items"
        :loading="imageLibrary.loading"
        :error="imageLibrary.error"
        :allow-delete="true"
        :deleting-id="imageLibraryDeletingId"
        @close="closeImageLibraryDrawer"
        @refresh="fetchImageLibrary(true)"
        @select="onLibraryImageSelect"
        @delete="onLibraryImageDelete" />
      <WuzzyImageDrawer
        :open="wuzzyDrawerOpen"
        @close="closeWuzzyDrawer"
        @select="handleWuzzySelect" />
      <AlertDialog v-model:open="uploadErrorDialog.open">
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{{ uploadErrorDialog.title }}</AlertDialogTitle>
            <AlertDialogDescription>{{ uploadErrorDialog.message }}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel @click="uploadErrorDialog.open = false">OK</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  </section>
</template>
<script setup>
import { computed, ref, reactive, onMounted, watch } from 'vue';
import api from '../services/api';
import { useI18n } from 'vue-i18n';
import { pushToast } from '../services/toast';
import { confirmDialog } from '../services/confirm';
import ImageLibraryDrawer from './shared/ImageLibraryDrawer.vue';
import WuzzyImageDrawer from './Wuzzy/WuzzyImageDrawer.vue';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from './ui/alert-dialog';
import { MAX_RAFFLE_IMAGE } from '../utils/validation';
import { useWalletSession } from '../composables/useWalletSession';
import { usePublicToken } from '../composables/usePublicToken';
import { useStorageProviders } from '../composables/useStorageProviders';
import HeaderIcon from './shared/HeaderIcon.vue';
import BlockedState from './shared/BlockedState.vue';
import CopyField from './shared/CopyField.vue';
import QuickSelect from './shared/QuickSelect.vue';

const { t, locale } = useI18n();
const masked = ref(false);
const isBlocked = ref(false);
const blockDetails = ref({});

const form = reactive({
  command: '!giveaway',
  prize: '',
  imageUrl: '',
  imageLibraryId: '',
  imageStorageProvider: '',
  imageStoragePath: '',
  imageSha256: '',
  imageFingerprint: '',
  imageOriginalName: '',
  maxWinners: 1,
  enabled: true,
});

const state = reactive({
  active: false,
  paused: false,
});

const participants = ref([]);
const winner = ref(null);

const warning = computed(() => ({
  title: t('commonReminder'),
  body: t('raffleWarningCommandMatch'),
}));

let ws;

const savingSettings = ref(false);
const savingAction = ref(false);
const action = ref('');
const fileUploadKey = ref(0);
const selectedPrizeFilename = ref('');
const imageInput = ref(null);
const displayImageUrl = ref('');
const locallyClearedImage = ref(false);

const wallet = useWalletSession();
const { withToken, refresh } = usePublicToken();
const widgetUrl = computed(() => {
  const base = `${location.origin}/widgets/giveaway`;
  const l = locale.value;
  const urlWithLang = l && l !== 'en' ? `${base}?lang=${l}` : base;
  return withToken(urlWithLang);
});

const storage = useStorageProviders();
const providerStatus = computed(() => {
  const selected = storage.selectedProvider.value;
  return storage.providerOptions.value.find((opt) => opt.id === selected) || null;
});
const storageOptions = computed(() => storage.providerOptions.value);
const quickSelectStorageOptions = computed(() => {
  return storageOptions.value.map((provider) => ({
    label: `${provider.label}${!provider.available ? ` (${t('storageProviderUnavailable')})` : ''}`,
    value: provider.id,
    disabled: !provider.available,
  }));
});
const selectedStorageProvider = computed({
  get: () => storage.selectedProvider.value,
  set: (val) => storage.setSelectedProvider(val),
});

function resolveStorageSelection(preferred = '') {
  const candidates = [];
  if (preferred) candidates.push(preferred);
  if (form.imageStorageProvider) candidates.push(form.imageStorageProvider);
  storage.ensureSelection(candidates);
}

resolveStorageSelection();

watch(storageOptions, () => {
  resolveStorageSelection(form.imageStorageProvider);
});

const imageLibrary = reactive({ items: [], loading: false, error: '', loaded: false, open: false });
const imageLibraryDeletingId = ref('');
const wuzzyDrawerOpen = ref(false);

const uploadErrorDialog = reactive({
  open: false,
  title: '',
  message: '',
});

async function cleanEverything() {
  await reset();
  await clearPrizeImage();
  form.prize = '';

  await saveSettings();
  pushToast({ type: 'success', message: t('raffleCleanSuccess') });
}

function handleIncrement() {
  if (form.maxWinners < 100) form.maxWinners++;
}

function handleDecrement() {
  if (form.maxWinners > 1) form.maxWinners--;
}

function showUploadErrorDialog(title, message) {
  uploadErrorDialog.title = title;
  uploadErrorDialog.message = message;
  uploadErrorDialog.open = true;
}

function upsertLibraryItem(entry) {
  if (!entry || !entry.id) return;
  const normalized = {
    id: entry.id,
    url: entry.url || '',
    provider: entry.provider || '',
    path: entry.path || '',
    size: Number(entry.size) || 0,
    originalName: entry.originalName || '',
    uploadedAt: entry.uploadedAt || new Date().toISOString(),
    sha256: entry.sha256 || '',
    fingerprint: entry.fingerprint || '',
  };
  const existingIndex = imageLibrary.items.findIndex((item) => item && item.id === normalized.id);
  if (existingIndex !== -1) {
    imageLibrary.items.splice(existingIndex, 1);
  }
  imageLibrary.items.unshift(normalized);
  if (imageLibrary.items.length > 50) {
    imageLibrary.items.splice(50);
  }
  imageLibrary.loaded = true;
}

async function fetchImageLibrary(force = false) {
  if (imageLibrary.loading) return;
  if (!force && imageLibrary.loaded) return;
  try {
    imageLibrary.loading = true;
    imageLibrary.error = '';
    const { data } = await api.get(
      '/api/raffle/image-library',
      force ? { params: { ts: Date.now() } } : undefined
    );
    const items = Array.isArray(data?.items) ? data.items : [];
    imageLibrary.items = items
      .map((item) => ({
        id: item?.id || '',
        url: item?.url || '',
        provider: item?.provider || '',
        path: item?.path || '',
        size: Number(item?.size) || 0,
        originalName: item?.originalName || '',
        uploadedAt: item?.uploadedAt || new Date(0).toISOString(),
        sha256: item?.sha256 || '',
        fingerprint: item?.fingerprint || '',
      }))
      .filter((entry) => entry.id);
    imageLibrary.loaded = true;
  } catch (error) {
    imageLibrary.error = t('imageLibraryLoadFailed');
    console.error('[raffle] image library load failed', error);
  } finally {
    imageLibrary.loading = false;
  }
}

async function ensureImageLibraryLoaded(force = false) {
  if (force) {
    await fetchImageLibrary(true);
    return;
  }
  if (!imageLibrary.loaded) {
    await fetchImageLibrary(false);
  }
}

async function openImageLibraryDrawer() {
  await ensureImageLibraryLoaded(false);
  imageLibrary.open = true;
}

function closeImageLibraryDrawer() {
  imageLibrary.open = false;
}

async function onLibraryImageSelect(item) {
  if (!item) return;
  const applied = await applyLibraryImage(item, { notifyError: true });
  if (applied) {
    closeImageLibraryDrawer();
  }
}

function closeWuzzyDrawer() {
  wuzzyDrawerOpen.value = false;
}

function openWuzzyDrawer() {
  wuzzyDrawerOpen.value = true;
}

async function handleWuzzySelect(item) {
  if (!item) return;
  const entry = {
    id: item.id,
    url: item.url,
    provider: 'wuzzy',
    path: item.path || '',
    size: item.size,
    originalName: item.displayName || item.originalName || item.id,
    sha256: '',
    fingerprint: item.id,
  };
  try {
    const applied = await applyLibraryImage(entry, { notifyError: true });
    if (applied) {
      closeWuzzyDrawer();
    }
  } catch (error) {
    console.error('[raffle] wuzzy select failed', error);
  }
}

function formatLibraryName(entry) {
  if (!entry) return '';
  return entry.originalName || entry.id || '';
}

async function onLibraryImageDelete(entry) {
  if (!entry || !entry.id || imageLibraryDeletingId.value) return;
  const provider = (entry.provider || '').toString().trim().toLowerCase();
  if (provider && provider !== 'supabase') {
    pushToast({ type: 'info', message: t('imageLibraryDeleteToastUnsupported') });
    return;
  }
  const confirmed = await confirmDialog({
    title: t('imageLibraryDeleteConfirmTitle'),
    description: t('imageLibraryDeleteConfirmBody', {
      fileName: formatLibraryName(entry) || t('imageLibraryUnknown'),
    }),
    confirmText: t('commonDelete'),
    cancelText: t('commonCancel') || 'Cancel',
    danger: true,
  });
  if (!confirmed) return;
  try {
    imageLibraryDeletingId.value = entry.id;
    const { data } = await api.delete(`/api/raffle/image-library/${encodeURIComponent(entry.id)}`);
    if (!data?.success) throw new Error('image_library_delete_failed');
    imageLibrary.items = imageLibrary.items.filter((item) => item.id !== entry.id);
    pushToast({ type: 'success', message: t('imageLibraryDeleteToastSuccess') });
    if (data?.activeImageCleared) {
      form.imageUrl = '';
      form.imageLibraryId = '';
      form.imageStorageProvider = '';
      form.imageStoragePath = '';
      form.imageSha256 = '';
      form.imageFingerprint = '';
      form.imageOriginalName = '';
      displayImageUrl.value = '';
      selectedPrizeFilename.value = '';
      if (imageInput.value) imageInput.value.value = '';
      resolveStorageSelection();
    }
  } catch (error) {
    const code = error?.response?.data?.error;
    if (code === 'image_library_delete_unsupported') {
      pushToast({ type: 'info', message: t('imageLibraryDeleteToastUnsupported') });
    } else {
      pushToast({ type: 'error', message: t('imageLibraryDeleteToastError') });
    }
  } finally {
    imageLibraryDeletingId.value = '';
  }
}

function connectWs() {
  const url = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host;
  ws = new WebSocket(url);
  ws.addEventListener('message', (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      if (msg.type === 'raffle_state') {
        applyState(msg);
      } else if (msg.type === 'raffle_winner') {
        winner.value = msg;
      }
    } catch {}
  });
}

function applySettings(cfg = {}) {
  if (!cfg || typeof cfg !== 'object') return;
  if (typeof cfg.command === 'string') form.command = cfg.command;
  if (typeof cfg.prize === 'string') form.prize = cfg.prize;
  if (cfg.imageUrl !== undefined) form.imageUrl = cfg.imageUrl || '';
  form.imageLibraryId =
    typeof cfg.imageLibraryId === 'string' ? cfg.imageLibraryId : form.imageLibraryId || '';
  form.imageStorageProvider =
    typeof cfg.imageStorageProvider === 'string'
      ? cfg.imageStorageProvider
      : form.imageStorageProvider || '';
  form.imageStoragePath =
    typeof cfg.imageStoragePath === 'string' ? cfg.imageStoragePath : form.imageStoragePath || '';
  form.imageSha256 = typeof cfg.imageSha256 === 'string' ? cfg.imageSha256 : form.imageSha256 || '';
  form.imageFingerprint =
    typeof cfg.imageFingerprint === 'string' ? cfg.imageFingerprint : form.imageFingerprint || '';
  form.imageOriginalName =
    typeof cfg.imageOriginalName === 'string'
      ? cfg.imageOriginalName
      : form.imageOriginalName || '';
  if (Number.isFinite(cfg.maxWinners)) form.maxWinners = cfg.maxWinners;
  if (cfg.enabled !== undefined) {
    form.enabled = String(cfg.enabled) !== 'false' && !!cfg.enabled;
  }
  if (cfg.mode !== undefined) form.mode = cfg.mode;
  if (cfg.duration !== undefined) form.duration = cfg.duration;
  if (cfg.interval !== undefined) form.interval = cfg.interval;

  if (!locallyClearedImage.value) {
    displayImageUrl.value = form.imageUrl || '';
    if (form.imageOriginalName) {
      selectedPrizeFilename.value = form.imageOriginalName;
    } else if (!form.imageUrl) {
      selectedPrizeFilename.value = '';
    }
  }

  if (form.imageStorageProvider) {
    storage.registerProvider(form.imageStorageProvider);
  }
  resolveStorageSelection(form.imageStorageProvider);
}

function applyState(s) {
  state.active = !!s.active;
  state.paused = !!s.paused;
  applySettings(s);
  participants.value = Array.isArray(s.participants) ? s.participants : [];

  if (s.reset) {
    winner.value = null;
  }
}

function buildImageFingerprint(file) {
  const name = (file?.name || '').toLowerCase();
  const size = Number(file?.size) || 0;
  return `${name}::${size}`;
}

async function computeImageHash(file) {
  try {
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const buffer = await file.arrayBuffer();
      const digest = await window.crypto.subtle.digest('SHA-256', buffer);
      const bytes = Array.from(new Uint8Array(digest));
      return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (hashError) {
    console.warn('[raffle] failed to hash image', hashError);
  }
  return '';
}

function matchesCurrentImageDuplicate(file, hash, fingerprint) {
  if (!form.imageUrl) return false;
  if (hash && form.imageSha256 && form.imageSha256 === hash) return true;
  if (fingerprint && form.imageFingerprint && form.imageFingerprint === fingerprint) return true;
  const storedName = (form.imageOriginalName || '').trim().toLowerCase();
  const fileName = (file?.name || '').trim().toLowerCase();
  if (storedName && fileName && storedName === fileName) {
    return true;
  }
  return false;
}

async function applyLibraryImage(entry, opts = {}) {
  if (!entry || !entry.id) return false;
  const options = typeof opts === 'object' && opts ? opts : {};
  try {
    const fd = new FormData();
    fd.append('libraryId', entry.id);
    if (entry.url) fd.append('url', entry.url);
    if (entry.provider) fd.append('provider', entry.provider);
    if (entry.originalName) fd.append('originalName', entry.originalName);
    if (entry.size) fd.append('size', entry.size);

    if (selectedStorageProvider.value) {
      fd.append('storageProvider', selectedStorageProvider.value);
    }
    const res = await api.post('/api/raffle/upload-image', fd);
    const data = res?.data || {};
    if (!data.success) {
      const errorMsg = data.error;
      if (errorMsg?.includes('File too large') || errorMsg?.includes('Insufficient balance')) {
        throw new Error(errorMsg);
      } else if (options.notifyError) {
        pushToast({ type: 'error', message: errorMsg || t('raffleImageUploadFailed') });
      }
      return false;
    }

    form.imageUrl = data.imageUrl || entry.url || '';
    form.imageLibraryId = data.imageLibraryId || entry.id;
    form.imageStorageProvider = data.imageStorageProvider || entry.provider || '';
    form.imageStoragePath = data.imageStoragePath || entry.path || '';
    form.imageSha256 = data.imageSha256 || entry.sha256 || '';
    form.imageFingerprint = data.imageFingerprint || entry.fingerprint || '';
    form.imageOriginalName = data.imageOriginalName || entry.originalName || '';
    displayImageUrl.value = form.imageUrl;
    locallyClearedImage.value = false;
    selectedPrizeFilename.value = form.imageOriginalName || '';
    resolveStorageSelection(form.imageStorageProvider || selectedStorageProvider.value);
    if (data.libraryItem) {
      upsertLibraryItem(data.libraryItem);
    } else {
      upsertLibraryItem(entry);
    }
    return true;
  } catch (error) {
    const errorMsg = error?.response?.data?.error;
    if (errorMsg?.includes('File too large') || errorMsg?.includes('Insufficient balance')) {
      throw error;
    } else {
      console.error('[raffle] apply library image failed', error);
      if (options.notifyError) {
        pushToast({ type: 'error', message: t('raffleImageUploadFailed') });
      }
      return false;
    }
  }
}

async function onImageFileChange(e) {
  const file = e?.target?.files?.[0];
  if (!file) return;
  if (file.size && file.size > MAX_RAFFLE_IMAGE) {
    pushToast({ type: 'error', message: t('raffleImageTooLarge') });
    if (imageInput.value) imageInput.value.value = '';
    return;
  }
  if (masked.value) {
    pushToast({ type: 'info', message: t('raffleSessionRequiredToast') });
    if (imageInput.value) imageInput.value.value = '';
    return;
  }
  try {
    const reused = await maybeHandleDuplicate(file);
    if (reused) {
      return;
    }

    const fd = new FormData();
    fd.append('image', file);
    if (selectedStorageProvider.value) {
      fd.append('storageProvider', selectedStorageProvider.value);
    }
    const res = await api.post('/api/raffle/upload-image', fd);
    const data = res?.data || {};
    if (!data.success || !data.imageUrl) {
      const errorMsg = data.error;
      if (errorMsg?.includes('File too large') || errorMsg?.includes('Insufficient balance')) {
        throw new Error(errorMsg);
      } else {
        pushToast({ type: 'error', message: t('raffleImageUploadFailed') });
        return;
      }
    }
    form.imageUrl = data.imageUrl;
    form.imageLibraryId = data.imageLibraryId || '';
    form.imageStorageProvider = data.imageStorageProvider || selectedStorageProvider.value || '';
    form.imageStoragePath = data.imageStoragePath || '';
    form.imageSha256 = data.imageSha256 || '';
    form.imageFingerprint = data.imageFingerprint || '';
    form.imageOriginalName = data.imageOriginalName || file.name || '';
    displayImageUrl.value = form.imageUrl;
    locallyClearedImage.value = false;
    selectedPrizeFilename.value = form.imageOriginalName;
    resolveStorageSelection(form.imageStorageProvider);
    if (data.libraryItem) {
      upsertLibraryItem(data.libraryItem);
    } else {
      upsertLibraryItem({
        id: form.imageLibraryId,
        url: form.imageUrl,
        provider: form.imageStorageProvider,
        path: form.imageStoragePath,
        size: file.size,
        originalName: form.imageOriginalName,
        sha256: form.imageSha256,
        fingerprint: form.imageFingerprint,
      });
    }
    if (form.prize && form.prize.trim().length > 0) {
      await saveSettings();
    }
    pushToast({ type: 'success', message: t('raffleImageUploaded') });
    fileUploadKey.value++;
    if (imageInput.value) imageInput.value.value = '';
  } catch (error) {
    const errorMsg = error?.response?.data?.error || error.message;
    if (errorMsg?.includes('File too large') || errorMsg?.includes('Insufficient balance')) {
      showUploadErrorDialog(t('uploadErrorTitle'), errorMsg);
    } else {
      pushToast({ type: 'error', message: t('raffleImageUploadFailed') });
    }
  }
}

function openImageDialog() {
  if (imageInput.value) {
    imageInput.value.value = '';
    imageInput.value.click();
  }
}

async function maybeHandleDuplicate(file) {
  try {
    await ensureImageLibraryLoaded();
    const fallbackKey = buildImageFingerprint(file);
    const hash = await computeImageHash(file);

    if (matchesCurrentImageDuplicate(file, hash, fallbackKey)) {
      const displayName = form.imageOriginalName || file.name || t('duplicateUploadFallbackName');
      const replaceCurrent = await confirmDialog({
        title: t('duplicateUploadTitle'),
        description: t('duplicateUploadBody', { fileName: displayName }),
        confirmText: t('duplicateUploadReplace'),
        cancelText: t('duplicateUploadUseExisting'),
        danger: true,
      });
      if (!replaceCurrent) {
        if (imageInput.value) {
          imageInput.value.value = '';
        }
        selectedPrizeFilename.value = form.imageOriginalName || '';
        pushToast({ type: 'info', message: t('toastDuplicateUploadUsingExisting') });
        return true;
      }
    }

    const libraryDuplicate = imageLibrary.items.find((item) => {
      if (!item) return false;
      if (hash && item.sha256 && item.sha256 === hash) return true;
      if (fallbackKey && item.fingerprint && item.fingerprint === fallbackKey) return true;
      const itemSize = Number(item.size) || 0;
      if (itemSize && file.size && itemSize !== file.size) return false;
      const itemName = (item.originalName || '').trim().toLowerCase();
      const fileName = (file.name || '').trim().toLowerCase();
      return itemName && fileName && itemName === fileName;
    });

    if (!libraryDuplicate) return false;

    const displayName =
      libraryDuplicate.originalName || file.name || t('duplicateUploadFallbackName');
    const replace = await confirmDialog({
      title: t('duplicateUploadTitle'),
      description: t('duplicateUploadBody', { fileName: displayName }),
      confirmText: t('duplicateUploadReplace'),
      cancelText: t('duplicateUploadUseExisting'),
      danger: true,
    });

    if (!replace) {
      const applied = await applyLibraryImage(libraryDuplicate, { notifyError: true });
      if (applied) {
        if (imageInput.value) imageInput.value.value = '';
        selectedPrizeFilename.value = libraryDuplicate.originalName || '';
        pushToast({ type: 'info', message: t('toastDuplicateUploadUsingExisting') });
        return true;
      }
    }
  } catch (error) {
    console.warn('[raffle] duplicate detection failed', error);
  }
  return false;
}

async function load(forceLibrary = false) {
  isBlocked.value = false;
  try {
    const [modulesRes, settingsRes, stateRes] = await Promise.all([
      api.get('/api/modules').catch(() => ({ data: {} })),
      api.get('/api/raffle/settings').catch((e) => {
        if (
          e?.response?.data?.error === 'configuration_blocked' ||
          e?.response?.data?.error === 'CONFIGURATION_BLOCKED'
        ) {
          throw e;
        }
        return { data: {} };
      }),
      api.get('/api/raffle/state').catch(() => ({ data: {} })),
    ]);
    masked.value = !!modulesRes?.data?.masked;
    const settingsData = settingsRes?.data?.data || {};
    applySettings(settingsData);
    applyState(stateRes?.data || {});
    await ensureImageLibraryLoaded(forceLibrary);
  } catch (e) {
    if (
      e.response &&
      e.response.data &&
      (e.response.data.error === 'CONFIGURATION_BLOCKED' ||
        e.response.data.error === 'configuration_blocked')
    ) {
      isBlocked.value = true;
      const details = e.response.data.details;
      blockDetails.value = typeof details === 'string' ? { reason: details } : details || {};
    }
  }
}

async function saveSettings() {
  if (masked.value) {
    pushToast({ type: 'info', message: t('raffleSessionRequiredToast') });
    return;
  }
  if (!form.command || !form.command.trim()) {
    pushToast({ type: 'error', message: t('raffleValidationCommand') });
    return;
  }
  if (!form.prize || !form.prize.trim()) {
    pushToast({ type: 'error', message: t('raffleValidationPrize') });
    return;
  }
  savingSettings.value = true;
  try {
    const payload = {
      command: form.command,
      prize: form.prize,
      imageUrl: form.imageUrl,
      maxWinners: form.maxWinners,
      enabled: form.enabled,
    };
    if (form.mode !== undefined) payload.mode = form.mode;
    if (form.duration !== undefined) payload.duration = form.duration;
    if (form.interval !== undefined) payload.interval = form.interval;
    const res = await api.post('/api/raffle/settings', payload);
    if (res?.data?.success) {
      pushToast({ type: 'success', message: t('savedRaffleSettings') });
      await load();
    } else {
      pushToast({ type: 'error', message: res?.data?.error || t('saveFailedRaffleSettings') });
    }
  } catch (error) {
    if (
      error.response &&
      error.response.data &&
      (error.response.data.error === 'CONFIGURATION_BLOCKED' ||
        error.response.data.error === 'configuration_blocked')
    ) {
      isBlocked.value = true;
      const details = error.response.data.details;
      blockDetails.value = typeof details === 'string' ? { reason: details } : details || {};
      return;
    }
    console.error('[raffle] save settings failed', error);
    pushToast({ type: 'error', message: t('saveFailedRaffleSettings') });
  } finally {
    savingSettings.value = false;
  }
}

async function clearPrizeImage() {
  if (masked.value) {
    pushToast({ type: 'info', message: t('raffleSessionRequiredToast') });
    return;
  }
  try {
    await api.post('/api/raffle/clear-image');
    form.imageUrl = '';
    form.imageLibraryId = '';
    form.imageStorageProvider = '';
    form.imageStoragePath = '';
    form.imageSha256 = '';
    form.imageFingerprint = '';
    form.imageOriginalName = '';
    displayImageUrl.value = '';
    locallyClearedImage.value = true;
    selectedPrizeFilename.value = '';
    if (imageInput.value) imageInput.value.value = '';
    fileUploadKey.value++;
    locallyClearedImage.value = false;
    resolveStorageSelection();
    pushToast({ type: 'success', message: t('raffleImageCleared') || t('raffleImageUploaded') });
  } catch {
    pushToast({ type: 'error', message: t('raffleImageUploadFailed') });
  }
}

async function start() {
  action.value = 'start';
  await doAction('/api/raffle/start', 'raffleStarted');
}
async function stop() {
  action.value = 'stop';
  await doAction('/api/raffle/stop', 'raffleStopped');
}
async function pause() {
  action.value = 'pause';
  await doAction('/api/raffle/pause', 'rafflePaused');
}
async function resume() {
  action.value = 'resume';
  await doAction('/api/raffle/resume', 'raffleResumed');
}
async function draw() {
  action.value = 'draw';
  if (masked.value) {
    pushToast({ type: 'info', message: t('raffleSessionRequiredToast') });
    return;
  }
  savingAction.value = true;
  try {
    const r = await api.post('/api/raffle/draw');
    const data = r?.data || {};
    winner.value = data.winner || data;
    pushToast({ type: 'success', message: t('raffleWinnerDrawn') });
    await load();
  } catch {
    pushToast({ type: 'error', message: t('raffleActionFailed') });
  } finally {
    savingAction.value = false;
  }
}
async function reset() {
  action.value = 'reset';
  await doAction('/api/raffle/reset', 'raffleReset', () => {
    winner.value = null;
  });
}

async function doAction(endpoint, successKey, after) {
  if (masked.value) {
    pushToast({ type: 'info', message: t('raffleSessionRequiredToast') });
    return;
  }
  savingAction.value = true;
  try {
    await api.post(endpoint);
    await load();
    if (after) after();
    pushToast({ type: 'success', message: t(successKey) });
  } catch {
    pushToast({ type: 'error', message: t('raffleActionFailed') });
  } finally {
    savingAction.value = false;
  }
}

onMounted(async () => {
  try {
    await wallet.refresh();
    await refresh();
  } catch {}
  storage.registerProvider('wuzzy');
  await storage.fetchProviders();
  resolveStorageSelection(form.imageStorageProvider);
  await load(true);
  connectWs();
});
</script>

<style scoped>
.raffle-root {
  --raffle-border-radius: 16px;
  --raffle-spacing: 20px;
}

.raffle-group-box {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--raffle-border-radius);
  padding: 20px 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.raffle-group-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 10px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.raffle-group-title {
  font-weight: 600;
  font-size: 16px;
  margin: 0;
}

.raffle-setting-item {
  display: flex;
  align-items: flex-start;
  gap: 18px;
  padding: 14px 0;
  border-bottom: 1px solid var(--border-color);
}

.raffle-setting-item:last-child {
  border-bottom: none;
}

.raffle-setting-item.is-vertical {
  flex-direction: column;
  align-items: stretch;
}

.raffle-setting-text {
  flex: 1 1 auto;
  min-width: 0;
}

.raffle-setting-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
}

.raffle-setting-desc {
  font-size: 12px;
  opacity: 0.7;
  line-height: 1.4;
}

.raffle-setting-control {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 10px;
}

.raffle-actions-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
  align-items: center;
}

/* Form Elements */
.form-input {
  background: var(--bg-chat);
  border: 1px solid var(--border-color);
  color: inherit;
  font-size: 0.9rem;
  padding: 6px 10px;
  border-radius: 6px;
  width: 100%;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

.form-input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
}

.img-preview-box {
  width: 100%;
  height: 80px;
  border-radius: 8px;
  background: var(--bg-chat);
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  overflow: hidden;
  position: relative;
  margin-top: 8px;
}

.img-preview-box.is-empty {
  height: auto;
  padding: 10px;
  justify-content: center;
  border-style: dashed;
}

.img-media {
  width: 80px;
  height: 100%;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.img-media img {
  max-width: 100%;
  max-height: 100%;
  object-fit: cover;
}

.img-media.placeholder {
  width: 100%;
  height: auto;
  background: transparent;
}

.placeholder-text {
  font-size: 12px;
  opacity: 0.6;
}

.btn-compact-secondary {
  padding: 6px 10px;
  font-size: 0.8rem;
  height: 32px;
  display: flex;
  align-items: center;
  background-color: var(--bg-chat) !important;
  color: var(--text-primary) !important;
  border: 1px solid var(--border-color) !important;
  transition: background-color 0.15s ease;
  transform: none !important;
}

.btn-compact-secondary:hover {
  background-color: rgba(255, 255, 255, 0.05) !important;
  transform: none !important;
}

.btn-save-style {
  background-color: #553fee !important;
  color: #fff !important;
  border: none !important;
  font-weight: 600;
  box-shadow: none !important;
}

.btn-save-style:hover {
  background-color: #4834d4 !important;
  box-shadow: none !important;
  transform: none !important;
}

.btn-save-style:disabled {
  background-color: #553fee !important;
  opacity: 0.6;
  box-shadow: none;
}

.status-badge {
  display: inline-flex;
  align-items: center;
}

.toggle-switch input:checked ~ span {
  background-color: #553fee;
}

.btn-custom {
  padding: 0.5rem 0.75rem;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  white-space: nowrap;
}

.btn-primary {
  background-color: #6366f1;
  color: white;
}
.btn-primary:hover:not(:disabled) {
  background-color: #4f46e5;
  transform: translateY(-2px);
}

.btn-secondary {
  background-color: #64748b;
  color: white;
}
.btn-secondary:hover:not(:disabled) {
  background-color: #475569;
  transform: translateY(-2px);
}

.btn-danger {
  background-color: #ef4444;
  color: white;
}
.btn-danger:hover:not(:disabled) {
  background-color: #dc2626;
  transform: translateY(-2px);
}

.btn-success {
  background-color: #553fee;
  color: white !important;
}
.btn-success:hover:not(:disabled) {
  background-color: #6366f1;
  transform: translateY(-2px);
}

.btn-warning {
  background-color: #f59e0b;
  color: white;
}
.btn-warning:hover:not(:disabled) {
  background-color: #d97706;
  transform: translateY(-2px);
}

.btn-custom:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type='number'] {
  -moz-appearance: textfield;
  appearance: textfield;
}

:deep(.quick-select-trigger) {
  width: 100%;
}

.custom-tooltip-btn {
  position: relative;
}

.custom-tooltip-btn::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: 100%;
  left: 50%;
  translate: -50% 0;
  margin-bottom: 8px;
  padding: 8px 10px;
  background: var(--card-bg, #111827);
  color: var(--text-primary, #e5e7eb);
  border: 1px solid var(--border-color);
  font-size: 0.75rem;
  line-height: 1.25;
  border-radius: 0.5rem;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  z-index: 50;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.18);
  width: 200px;
  white-space: normal;
  text-align: center;
  font-weight: 500;
  transform: translateY(6px);
  transition:
    opacity 160ms ease-out,
    transform 180ms ease-out,
    visibility 0ms linear 180ms;
}

.custom-tooltip-btn::before {
  content: '';
  position: absolute;
  bottom: 100%;
  left: 50%;
  translate: -50% 0;
  margin-bottom: 3px;
  width: 9px;
  height: 9px;
  background: var(--card-bg, #111827);
  border-left: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
  transform: rotate(45deg) translateY(6px);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  z-index: 50;
  transition:
    opacity 160ms ease-out,
    transform 180ms ease-out,
    visibility 0ms linear 180ms;
}

.custom-tooltip-btn:hover::after,
.custom-tooltip-btn:hover::before,
.custom-tooltip-btn:focus::after,
.custom-tooltip-btn:focus::before {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
  transition:
    opacity 160ms ease-out,
    transform 180ms ease-out,
    visibility 0ms;
}
</style>
