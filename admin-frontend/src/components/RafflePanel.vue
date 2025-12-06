<template>
  <section class="admin-tab active relative" role="form">
    <BlockedState v-if="isBlocked" :module-name="t('raffleModule')" :details="blockDetails" />

    <div v-else>
      <div
        v-if="masked"
        class="absolute inset-0 z-10 flex items-center justify-center backdrop-blur bg-black/35">
        <div
          class="p-5 rounded-os bg-[var(--bg-card)] border border-[var(--card-border)] shadow-lg max-w-md text-center">
          <div class="mb-2 text-lg font-semibold">{{ t('raffleSessionRequiredTitle') }}</div>
          <p class="mb-4 text-sm">{{ t('raffleSessionRequiredBody') }}</p>
          <a href="/" class="btn" aria-label="wallet-login-redirect">{{ t('createSession') }}</a>
        </div>
      </div>
      <div v-if="warning" class="os-subtle mt-3 p-4 rounded-os" role="status" aria-live="polite">
        <div class="flex items-center gap-2">
          <svg width="24" height="24" fill="none" class="shrink-0">
            <circle cx="12" cy="12" r="12" fill="#ffe066" />
            <path d="M12 8v4m0 4h.01" stroke="#b58900" stroke-width="2" stroke-linecap="round" />
          </svg>
          <div>
            <strong class="mr-1">{{ t('raffleWarningTitle') }}</strong>
            <span>{{ t('raffleWarningChat') }}</span>
          </div>
        </div>
      </div>
      <OsCard
        class="mt-3"
        aria-describedby="raffle-settings-desc"
        :title="t('raffleSettings') || 'Raffle settings'">
        <p id="raffle-settings-desc" class="sr-only">
          Configure raffle command, prize, image, max winners and actions.
        </p>
        <div class="form-group">
          <label class="label" for="raffle-command">{{ t('raffleCommandLabel') }}</label>
          <input
            class="input"
            id="raffle-command"
            v-model="form.command"
            type="text"
            :placeholder="t('raffleCommandPlaceholder')"
            aria-describedby="raffle-command-hint" />
          <small id="raffle-command-hint" class="small">{{ t('raffleCommandHint') }}</small>
        </div>
        <div class="form-group">
          <label class="label" for="raffle-prize">{{ t('rafflePrizeLabel') }}</label>
          <input
            class="input"
            id="raffle-prize"
            v-model="form.prize"
            type="text"
            maxlength="15"
            :placeholder="t('rafflePrizePlaceholder')" />
          <div class="flex gap-2 small mt-1 justify-between">
            <small :class="{ 'text-red-500': form.prize.length >= 15 }">
              {{ form.prize.length >= 15 ? t('valMaxChars') : '\u00A0' }}
            </small>
            <small aria-live="polite" aria-atomic="true">{{
              t('charsUsed', { used: form.prize.length, max: 15 })
            }}</small>
          </div>
        </div>
        <div class="form-group">
          <label class="label" for="raffle-image">{{ t('rafflePrizeImageLabel') }}</label>
          <p
            v-if="providerStatus && !providerStatus.available"
            class="small text-amber-500 mb-2"
            role="status">
            {{ providerStatus.label }} {{ t('storageProviderUnavailable') }}
          </p>
          <div class="flex items-center gap-2 flex-wrap">
            <input
              ref="imageInput"
              id="raffle-image"
              type="file"
              accept="image/png,image/jpeg,image/gif"
              class="sr-only"
              @change="onImageFileChange" />
            <button
              v-if="selectedStorageProvider !== 'wuzzy'"
              type="button"
              class="upload-btn"
              @click="openImageDialog">
              <i class="pi pi-upload mr-2" aria-hidden="true"></i>
              {{ t('imageChoose') || t('rafflePrizeImageLabel') }}
            </button>
            <button
              v-if="selectedStorageProvider !== 'wuzzy'"
              type="button"
              class="btn-secondary btn-compact-secondary"
              @click="openImageLibraryDrawer"
              :aria-label="t('imageLibraryOpenBtn')">
              <i class="pi pi-images" aria-hidden="true"></i>
              {{ t('imageLibraryOpenBtn') }}
            </button>
            <button
              v-if="selectedStorageProvider === 'wuzzy'"
              type="button"
              class="btn-secondary btn-compact-secondary"
              @click="openWuzzyDrawer"
              :aria-label="t('wuzzyOpenDrawerBtn')">
              <i class="pi pi-search-plus" aria-hidden="true"></i>
              {{ t('wuzzyOpenDrawerBtn') }}
            </button>
            <div
              v-if="storageOptions.length"
              class="flex items-center gap-2"
              role="group"
              aria-label="Storage provider selection">
              <label class="label mb-0" for="raffle-storage-provider">
                {{ t('storageProviderLabel') }}
              </label>
              <QuickSelect
                v-model="selectedStorageProvider"
                :disabled="storageLoading || !storageOptions.length"
                :options="
                  storageOptions.map((opt) => ({
                    label: opt.label,
                    value: opt.id,
                    disabled: !opt.available && opt.id !== selectedStorageProvider,
                  }))
                "
                :aria-label="t('storageProviderLabel')" />
            </div>
          </div>
          <div v-if="imageLibrary.error" class="small mt-1 text-red-500">
            {{ imageLibrary.error }}
          </div>
          <div v-if="displayImageUrl" class="mt-2">
            <img
              :src="displayImageUrl"
              alt="raffle"
              class="object-contain rounded"
              style="max-height: 9rem" />
            <div class="flex items-center gap-2 mt-1">
              <span
                v-if="selectedPrizeFilename"
                class="file-name-label"
                :title="selectedPrizeFilename">
                <i class="pi pi-image mr-1"></i>
                {{
                  selectedPrizeFilename.length > 18
                    ? selectedPrizeFilename.substring(0, 18) + '...'
                    : selectedPrizeFilename
                }}
              </span>
              <span
                v-else-if="form.imageOriginalName"
                class="file-name-label"
                :title="form.imageOriginalName">
                <i class="pi pi-image mr-1"></i>
                {{
                  form.imageOriginalName.length > 18
                    ? form.imageOriginalName.substring(0, 18) + '...'
                    : form.imageOriginalName
                }}
              </span>
              <button
                type="button"
                class="icon-btn"
                :aria-label="t('remove')"
                :title="t('remove')"
                @click="clearPrizeImage">
                <i class="pi pi-trash"></i>
              </button>
            </div>
          </div>
        </div>
        <div class="flex flex-wrap gap-2 form-group mt-4" role="group" aria-label="Raffle actions">
          <button
            class="btn"
            @click="start"
            :disabled="(state.active && !state.paused) || savingAction"
            :aria-busy="savingAction && action === 'start' ? 'true' : 'false'">
            {{ savingAction && action === 'start' ? t('commonSaving') : t('raffleStart') }}
          </button>
          <button
            class="btn"
            @click="pause"
            :disabled="!state.active || state.paused || savingAction"
            :aria-busy="savingAction && action === 'pause' ? 'true' : 'false'">
            {{ savingAction && action === 'pause' ? t('commonSaving') : t('rafflePause') }}
          </button>
          <button
            class="btn"
            @click="resume"
            :disabled="!state.active || !state.paused || savingAction"
            :aria-busy="savingAction && action === 'resume' ? 'true' : 'false'">
            {{ savingAction && action === 'resume' ? t('commonSaving') : t('raffleResume') }}
          </button>
          <button
            class="btn"
            @click="stop"
            :disabled="!state.active || savingAction"
            :aria-busy="savingAction && action === 'stop' ? 'true' : 'false'">
            {{ savingAction && action === 'stop' ? t('commonSaving') : t('raffleStop') }}
          </button>
          <button
            class="btn"
            @click="draw"
            :disabled="!participants.length || savingAction"
            :aria-busy="savingAction && action === 'draw' ? 'true' : 'false'">
            {{ savingAction && action === 'draw' ? t('commonSaving') : t('raffleDrawWinner') }}
          </button>
          <button
            class="btn danger"
            @click="reset"
            :disabled="savingAction"
            :aria-busy="savingAction && action === 'reset' ? 'true' : 'false'">
            {{ savingAction && action === 'reset' ? t('commonSaving') : t('raffleResetWinners') }}
          </button>
        </div>
        <div class="form-group">
          <label class="label" for="raffle-max-winners">{{ t('raffleMaxWinnersLabel') }}</label>
          <input
            class="input"
            id="raffle-max-winners"
            v-model.number="form.maxWinners"
            type="number"
            min="1" />
          <div class="flex items-center gap-2 mt-2">
            <button
              type="button"
              class="switch"
              :aria-pressed="String(form.enabled)"
              :aria-label="t('raffleEnabled')"
              @click="form.enabled = !form.enabled">
              <span class="knob"></span>
            </button>
            <span class="text-sm font-medium">{{ t('raffleEnabled') }}</span>
          </div>
          <button class="btn mt-3" @click="saveSettings" :disabled="savingSettings">
            {{ savingSettings ? t('commonSaving') : t('saveSettings') }}
          </button>
        </div>
      </OsCard>
      <OsCard class="mt-3">
        <template #header>
          <div class="flex items-center gap-2">
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
            <h3 class="font-semibold text-[15px]">{{ t('obsIntegration') }}</h3>
          </div>
        </template>
        <div class="form-group">
          <div class="flex flex-wrap items-center gap-3">
            <span class="label mb-0">{{ t('raffleAdminSectionWidgetLink') }}</span>
            <CopyField :value="widgetUrl" :aria-label="t('raffleAdminSectionWidgetLink')" secret />
          </div>
        </div>
      </OsCard>
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
import CopyField from './shared/CopyField.vue';
import QuickSelect from './shared/QuickSelect.vue';
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
import OsCard from './os/OsCard.vue';
import { useWalletSession } from '../composables/useWalletSession';
import { usePublicToken } from '../composables/usePublicToken';
import { useStorageProviders } from '../composables/useStorageProviders';
import HeaderIcon from './shared/HeaderIcon.vue';
import BlockedState from './shared/BlockedState.vue';

const { t } = useI18n();
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

const warning = ref({
  title: 'Reminder',
  body: 'The chat command must match the configured command.',
});

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
const widgetUrl = computed(() => withToken(`${location.origin}/widgets/giveaway`));

const storage = useStorageProviders();
const providerStatus = computed(() => {
  const selected = storage.selectedProvider.value;
  return storage.providerOptions.value.find((opt) => opt.id === selected) || null;
});
const storageOptions = computed(() => storage.providerOptions.value);
const storageLoading = computed(() => storage.loading.value);
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

function openWuzzyDrawer() {
  wuzzyDrawerOpen.value = true;
}

function closeWuzzyDrawer() {
  wuzzyDrawerOpen.value = false;
}

async function handleWuzzySelect(item) {
  if (!item) return;
  const entry = {
    id: item.id,
    url: item.url,
    provider: 'wuzzy',
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
  if (typeof cfg.enabled === 'boolean') form.enabled = cfg.enabled;
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

async function onLibraryImageSelect(entry) {
  try {
    const applied = await applyLibraryImage(entry, { notifyError: true });
    if (applied) {
      imageLibrary.open = false;
    }
  } catch (error) {
    const errorMsg = error?.response?.data?.error || error.message;
    if (errorMsg?.includes('File too large') || errorMsg?.includes('Insufficient balance')) {
      showUploadErrorDialog(t('uploadErrorTitle'), errorMsg);
    } else {
      pushToast({ type: 'error', message: t('raffleImageUploadFailed') });
    }
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

async function onImageFileChange(e) {
  const file = e?.target?.files?.[0];
  if (!file) return;
  if (file.size && file.size > MAX_RAFFLE_IMAGE) {
    pushToast({ type: 'error', message: t('raffleImageTooLarge') || 'Image too large' });
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
.upload-btn {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 0.6rem;
  border: 1px solid var(--card-border);
  background: transparent;
  border-radius: 0.5rem;
  line-height: 1;
  box-shadow: none;
  cursor: pointer;
}
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  color: #ff0149;
  background: transparent;
  border-radius: 2px;
}
.icon-btn:hover {
  background: rgba(100, 116, 139, 0.08);
}
.icon-btn .pi {
  font-size: 0.9rem;
}

.switch {
  width: 38px;
  height: 22px;
  background: var(--bg-chat, #f3f3f3);
  border: 1px solid var(--border, var(--border-color, #d0d0d0));
  border-radius: 9999px;
  position: relative;
  transition:
    background 0.2s ease,
    border-color 0.2s ease;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}
.switch .knob {
  position: absolute;
  left: 2px;
  top: 1px;
  width: 18px;
  height: 18px;
  background: #fff;
  border-radius: 9999px;
  transition: transform 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}
.switch[aria-pressed='true'] {
  background: var(--switch-color, #553fee);
  border-color: var(--switch-color, #553fee);
}
.switch[aria-pressed='true'] .knob {
  transform: translateX(16px);
}
.switch:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--switch-color, #553fee) 35%, transparent);
}

.file-name-label {
  font-size: 0.85rem;
  color: #64748b;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
