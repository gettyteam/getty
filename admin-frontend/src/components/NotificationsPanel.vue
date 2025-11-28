<template>
  <section class="admin-tab active relative notif-root" role="form">
    <div
      v-if="masked"
      class="absolute inset-0 z-10 flex items-center justify-center backdrop-blur bg-black/35">
      <div
        class="p-5 rounded-os bg-[var(--bg-card)] border border-[var(--card-border)] shadow-lg max-w-md text-center">
        <div class="mb-2 text-lg font-semibold">{{ t('externalSessionRequiredTitle') }}</div>
        <p class="mb-4 text-sm">{{ t('externalSessionRequiredBody') }}</p>
        <a href="/" class="btn" aria-label="wallet-login-redirect">{{ t('createSession') }}</a>
      </div>
    </div>
    <div class="notif-groups-grid">
      <div class="notif-group-box" aria-labelledby="notif-gif-title">
        <div class="notif-group-head">
          <HeaderIcon>
            <svg
              class="os-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </HeaderIcon>
          <h3 id="notif-gif-title" class="notif-group-title">{{ t('notificationGifTitle') }}</h3>
        </div>
        <div class="notif-setting-item">
          <div class="notif-setting-text">
            <div class="notif-setting-title">{{ t('notificationGifPositionLabel') }}</div>
            <div class="notif-setting-desc">{{ t('notificationGifHint') }}</div>
          </div>
          <div class="notif-setting-control">
            <select class="input select" v-model="gif.position" aria-label="GIF position">
              <option value="right">{{ t('positionRight') }}</option>
              <option value="left">{{ t('positionLeft') }}</option>
              <option value="top">{{ t('positionTop') }}</option>
              <option value="bottom">{{ t('positionBottom') }}</option>
            </select>
          </div>
        </div>
        <div class="notif-setting-item">
          <div class="notif-setting-text">
            <div class="notif-setting-title flex items-center gap-2">
              <span>{{ t('storageProviderLabel') }}</span>
              <i
                v-if="hasTurboOption"
                class="pi pi-info-circle text-[13px] text-emerald-400 cursor-help"
                :title="t('storageProviderArweaveTooltip')"
                :aria-label="t('storageProviderArweaveTooltip')"
                role="note"
                tabindex="0"></i>
            </div>
            <div class="notif-setting-desc">{{ t('storageProviderDesc') }}</div>
          </div>
          <div class="notif-setting-control flex flex-col gap-1">
            <QuickSelect
              v-model="gifStorageSelection"
              :options="
                storageOptions.map((opt) => ({
                  label:
                    opt.label + (opt.searchOnly ? ' · ' + t('wuzzyProviderSearchOnlyLabel') : ''),
                  value: opt.id,
                  disabled: !opt.available && opt.id !== gifStorageSelection,
                }))
              "
              :aria-label="t('storageProviderLabel')" />
            <div v-if="providerStatus && !providerStatus.available" class="small text-amber-500">
              {{ t('storageProviderUnavailable') }}
            </div>
          </div>
        </div>
        <div class="notif-setting-item is-vertical" aria-label="GIF file controls">
          <input
            ref="gifInput"
            type="file"
            accept="image/gif"
            class="hidden"
            @change="onGifChange"
            aria-hidden="true" />
          <div
            class="gif-preview-box"
            :class="[`pos-${gif.position}`, { 'is-empty': !gif.gifPath, 'pos-pulse': posPulse }]"
            aria-live="off">
            <span class="gif-pos-label" aria-hidden="true">{{ t(posKeyMap[gif.position]) }}</span>
            <div class="gif-media" v-if="gif.gifPath">
              <img :src="gif.gifPath" :alt="gif.fileName" />
            </div>
            <div class="gif-media placeholder" v-else>
              <span class="placeholder-text">{{ t('notificationGifUnifiedHint') }}</span>
            </div>

            <div class="notif-demo" aria-hidden="true">
              <div class="nd-left" v-if="gif.position === 'left' || gif.position === 'top'"></div>
              <div class="nd-body">
                <div class="nd-line nd-amount">+ 0.25 AR</div>
                <div
                  class="nd-line nd-user"
                  :class="{ inline: gif.position === 'top' || gif.position === 'bottom' }">
                  Spaceman
                </div>
                <div
                  class="nd-line nd-msg"
                  :class="{ centered: gif.position === 'top' || gif.position === 'bottom' }">
                  Thanks for the stream!
                </div>
              </div>
            </div>
          </div>
          <div class="notif-actions-row">
            <button
              class="btn-secondary btn-compact-secondary"
              type="button"
              @click="handleChooseGifClick"
              :disabled="!sessionActive && hostedSupported"
              :aria-busy="savingGif ? 'true' : 'false'">
              <i v-if="isWuzzyMode" class="pi pi-search-plus mr-2" aria-hidden="true"></i>
              {{ isWuzzyMode ? t('wuzzyOpenDrawerBtn') : t('notificationGifChooseBtn') }}
            </button>
            <button
              v-if="!isWuzzyMode"
              class="btn-secondary btn-compact-secondary"
              type="button"
              @click="openGifLibrary"
              :disabled="gifLibrary.loading || (!sessionActive && hostedSupported)"
              :aria-busy="gifLibrary.loading ? 'true' : 'false'">
              {{ t('notificationGifLibraryBtn') }}
            </button>
            <button
              v-if="gif.gifPath"
              class="btn-danger btn-icon"
              type="button"
              @click="removeGif"
              :disabled="!sessionActive && hostedSupported"
              :title="t('notificationGifRemoveBtn')"
              :aria-label="t('notificationGifRemoveBtn')">
              <i class="pi pi-trash" aria-hidden="true"></i>
            </button>
            <button
              class="btn-save"
              type="button"
              :disabled="savingGif || (!sessionActive && hostedSupported)"
              @click="saveGif"
              :aria-busy="savingGif ? 'true' : 'false'">
              {{ savingGif ? t('commonSaving') : t('saveSettings') }}
            </button>
          </div>
          <div
            v-if="isWuzzyMode && hasWuzzySelection"
            class="border border-[var(--card-border)] rounded-os p-3 bg-[var(--bg-card)] flex flex-col gap-2 mt-3">
            <div class="flex flex-col gap-1">
              <div class="font-semibold text-sm flex items-center gap-1">
                <i class="pi pi-user" aria-hidden="true"></i>
                <span class="break-all">{{ wuzzySelection.originalName }}</span>
              </div>
              <div class="text-xs opacity-80 flex items-center gap-1" v-if="wuzzySelectionMeta">
                <i class="pi pi-image" aria-hidden="true"></i>
                <span>{{ wuzzySelectionMeta }}</span>
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                class="btn-secondary btn-compact-secondary"
                type="button"
                @click="openWuzzySelectionUrl">
                {{ t('wuzzySelectionOpen') }}
              </button>
              <button
                class="btn-secondary btn-compact-secondary"
                type="button"
                @click="copyWuzzySelectionUrl">
                {{ t('wuzzySelectionCopy') }}
              </button>
              <button
                class="btn-danger btn-compact-secondary"
                type="button"
                @click="clearWuzzySelection">
                {{ t('wuzzySelectionClear') }}
              </button>
            </div>
          </div>
          <div
            v-if="gif.fileName && !gif.gifPath"
            class="small mt-2 text-green-700 flex items-center gap-2">
            <svg width="16" height="16" fill="none" class="shrink-0">
              <circle cx="8" cy="8" r="8" fill="#22c55e" />
              <path
                d="M6.5 8.5l1.5 1.5L10.5 7"
                stroke="#ffffff"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round" />
            </svg>
            {{ t('fileSelectedForUpload', { fileName: gif.fileName }) }}
          </div>
          <div v-if="errors.gif" class="small mt-2 text-red-700 flex items-center gap-2">
            <svg width="16" height="16" fill="none" class="shrink-0">
              <circle cx="8" cy="8" r="8" fill="#ef4444" />
              <path d="M8 4v4m0 4h.01" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" />
            </svg>
            {{ errors.gif }}
          </div>
        </div>
      </div>

      <div class="notif-group-box" aria-labelledby="notif-tts-title">
        <div class="notif-group-head">
          <HeaderIcon>
            <svg
              class="os-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round">
              <path
                d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8.5 8.5Z" />
            </svg>
          </HeaderIcon>
          <h3 id="notif-tts-title" class="notif-group-title">{{ t('ttsSectionTitle') }}</h3>
        </div>
        <div class="notif-setting-item">
          <div class="notif-setting-text">
            <div class="notif-setting-title">{{ t('enableTextToSpeech') }}</div>
            <div class="notif-setting-desc">
              {{ tts.ttsAllChat ? t('ttsDisabledDueToGlobal') : t('ttsHint') }}
            </div>
          </div>
          <div class="notif-setting-control">
            <button
              type="button"
              class="switch"
              :aria-pressed="String(tts.enabled)"
              :disabled="tts.ttsAllChat"
              @click="tts.enabled = !tts.enabled">
              <span class="knob"></span>
            </button>
          </div>
        </div>
        <div class="notif-setting-item">
          <div class="notif-setting-text">
            <div class="notif-setting-title">{{ t('ttsLanguage') }}</div>
            <div class="notif-setting-desc">{{ t('ttsLanguage') }}</div>
          </div>
          <div class="notif-setting-control">
            <select class="input select" v-model="tts.language">
              <option value="en">{{ t('english') }}</option>
              <option value="es">{{ t('spanish') }}</option>
            </select>
            <button
              class="btn-save"
              type="button"
              :disabled="savingTts || (!sessionActive && hostedSupported)"
              @click="saveTts"
              :aria-busy="savingTts ? 'true' : 'false'">
              {{ savingTts ? t('commonSaving') : t('saveAudioButton') }}
            </button>
          </div>
        </div>
        <div class="notif-setting-item is-vertical">
          <div class="notif-setting-text">
            <div class="notif-setting-title">{{ t('notificationWidgetUrl') }}</div>
            <div class="notif-setting-desc">{{ t('tipWidgetObsHint') }}</div>
          </div>
          <div class="copy-field-row">
            <CopyField :value="widgetUrl" :aria-label="t('notificationWidgetUrl')" secret />
          </div>
        </div>
      </div>

      <div class="notif-group-box" aria-labelledby="notif-audio-title">
        <div class="notif-group-head">
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
          <h3 id="notif-audio-title" class="notif-group-title">{{ t('customAudioTitle') }}</h3>
        </div>
        <div class="notif-setting-item is-vertical">
          <LegacyAudioControls
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
            force-stack
            compact
            @update:enabled="(v) => (audioCfg.enabled = v)"
            @update:volume="(v) => (audioCfg.volume = v)"
            @update:audio-source="(v) => (audio.audioSource = v)"
            @audio-saved="onAudioSaved"
            @audio-deleted="onAudioDeleted"
            @update:storage-provider="handleAudioStorageProviderChange"
            @toast="handleAudioToast" />
          <div class="notif-actions-row mt-3">
            <button
              class="btn-save"
              type="button"
              :disabled="savingAudio || (!sessionActive && hostedSupported)"
              @click="persistAudioCfg">
              {{ savingAudio ? t('commonSaving') : t('saveSettings') }}
            </button>
            <button
              class="btn-secondary btn-compact-secondary"
              type="button"
              @click="testRandomNotification"
              :disabled="!sessionActive && hostedSupported">
              {{ t('achievementsTestNotificationBtn') }}
            </button>
          </div>
        </div>
      </div>

      <div class="notif-group-box" aria-labelledby="notif-colors-title">
        <div class="notif-group-head">
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
          <h3 id="notif-colors-title" class="notif-group-title">
            {{ t('colorCustomizationTitle') }}
          </h3>
        </div>
        <div class="notif-setting-item is-vertical">
          <div class="flex flex-wrap gap-2 colors-section">
            <ColorInput v-model="colors.bg" :label="t('colorBg')" />
            <ColorInput v-model="colors.font" :label="t('colorFont')" />
            <ColorInput v-model="colors.border" :label="t('colorBorder')" />
            <ColorInput v-model="colors.amount" :label="t('colorAmount')" />
            <ColorInput v-model="colors.from" :label="t('colorFrom')" />
          </div>
          <div class="notif-actions-row mt-3">
            <button
              class="btn"
              type="button"
              :disabled="savingColors || (!sessionActive && hostedSupported)"
              @click="saveColors">
              {{ savingColors ? t('commonSaving') : t('saveSettings') }}
            </button>
            <button
              class="btn-secondary btn-compact-secondary ml-2"
              type="button"
              @click="resetColors">
              {{ t('resetColors') }}
            </button>
          </div>
        </div>
      </div>

      <div class="notif-group-box notif-full" aria-labelledby="notif-theme-title">
        <div class="notif-group-head">
          <HeaderIcon>
            <svg
              class="os-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
          </HeaderIcon>
          <h3 id="notif-theme-title" class="notif-group-title">
            {{ t('tipWidgetThemeTitle') }}
          </h3>
        </div>
        <div class="notif-setting-item is-vertical">
          <div class="notif-theme-config">
            <label class="notif-theme-label" for="tip-widget-theme-select">
              <span class="notif-setting-title">{{ t('tipWidgetThemeLabel') }}</span>
              <span class="notif-setting-desc">{{ t('tipWidgetThemeDesc') }}</span>
            </label>
            <select
              id="tip-widget-theme-select"
              class="input select"
              v-model="widgetTheme"
              aria-label="widget-theme-select">
              <option v-for="opt in widgetThemeOptions" :key="opt.value" :value="opt.value">
                {{ t(opt.labelKey) }}
              </option>
            </select>
          </div>
          <TipWidgetThemePreview
            :theme="widgetTheme"
            :colors="previewColors"
            :gif-position="gif.position"
            :gif-url="gif.gifPath" />
          <div class="notif-actions-row">
            <button
              class="btn"
              type="button"
              :disabled="savingColors || (!sessionActive && hostedSupported)"
              @click="saveColors">
              {{ savingColors ? t('commonSaving') : t('saveSettings') }}
            </button>
            <button
              class="btn-secondary btn-compact-secondary theme-refresh-btn"
              type="button"
              @click="refreshPreview">
              {{ t('refresh') }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <TipGifLibraryDrawer
      :open="gifLibrary.open"
      :items="gifLibrary.items"
      :loading="gifLibrary.loading"
      :error="gifLibrary.error"
      :deleting-id="gifLibrary.deletingId"
      @close="gifLibrary.open = false"
      @refresh="fetchGifLibrary(true)"
      @select="onLibrarySelect"
      @delete="onLibraryDelete" />
    <WuzzyGifDrawer
      :open="wuzzyDrawerOpen"
      @close="closeWuzzyDrawer()"
      @select="handleWuzzySelect" />
    <AlertDialog v-model:open="uploadErrorDialog.open">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ uploadErrorDialog.title }}</AlertDialogTitle>
          <AlertDialogDescription>{{ uploadErrorDialog.message }}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="uploadErrorDialog.open = false"> OK </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <AlertDialog v-model:open="gifProviderWarning.open">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ gifProviderWarning.title }}</AlertDialogTitle>
          <AlertDialogDescription>{{ gifProviderWarning.message }}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="gifProviderWarning.open = false">
            {{ t('commonClose') }}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>
</template>
<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../services/api';
import { pushToast } from '../services/toast';
import { confirmDialog } from '../services/confirm';
import { registerDirty } from '../composables/useDirtyRegistry';
import { MAX_GIF_SIZE } from '../utils/validation';
import CopyField from './shared/CopyField.vue';
import QuickSelect from './shared/QuickSelect.vue';
import { useWalletSession } from '../composables/useWalletSession';
import { usePublicToken } from '../composables/usePublicToken';
import LegacyAudioControls from './shared/LegacyAudioControls.vue';
import HeaderIcon from './shared/HeaderIcon.vue';
import ColorInput from './shared/ColorInput.vue';
import TipWidgetThemePreview from './NotificationsPanel/TipWidgetThemePreview.vue';
import TipGifLibraryDrawer from './NotificationsPanel/TipGifLibraryDrawer.vue';
import WuzzyGifDrawer from './NotificationsPanel/WuzzyGifDrawer.vue';
import { useStorageProviders } from '../composables/useStorageProviders';
import { formatBytes as formatWuzzyBytes } from '../services/wuzzySearch';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

const { t } = useI18n();

const gifInput = ref(null);

const gif = reactive({
  position: 'right',
  gifPath: '',
  file: null,
  fileName: '',
  selectedId: '',
  storageProvider: '',
  original: '',
});

const WUZZY_PROVIDER_ID = 'wuzzy';

const gifLibrary = reactive({
  open: false,
  loading: false,
  error: '',
  deletingId: '',
  /** @type {Array<{id: string, url: string, width?: number, height?: number, size?: number, originalName?: string, uploadedAt?: string, provider?: string, path?: string, sha256?: string, fingerprint?: string}>} */
  items: [],
});

const wuzzySelection = reactive({
  id: '',
  url: '',
  width: 0,
  height: 0,
  size: 0,
  originalName: '',
  owner: '',
  sha256: '',
  fingerprint: '',
});
const wuzzySelectionLoading = ref(false);
const gifStorageSelection = ref('');
const lastRealStorageProvider = ref('');
const wuzzyDrawerOpen = ref(false);
const wuzzyDrawerDismissed = ref(false);
const skipNextWuzzyAutoOpen = ref(false);
const wuzzyAutoOpenReady = ref(false);
const gifProviderWarning = reactive({ open: false, title: '', message: '' });

const widgetThemeOptions = [
  { value: 'classic', labelKey: 'tipWidgetThemeClassic' },
  { value: 'deterministic', labelKey: 'tipWidgetThemeDeterministic' },
];

const widgetTheme = ref('classic');
let originalTheme = 'classic';

const posKeyMap = {
  left: 'positionLeft',
  right: 'positionRight',
  top: 'positionTop',
  bottom: 'positionBottom',
};

const tts = reactive({
  enabled: true,
  language: 'en',
  ttsAllChat: false,
  original: '',
});

const audio = reactive({
  audioSource: 'remote',
  file: null,
  fileName: '',
  original: '',
});

const audioCfg = reactive({ enabled: true, volume: 0.5 });

let lastSavedAudio = { enabled: true, volume: 0.5, audioSource: 'remote' };

const errors = reactive({
  gif: '',
  audio: '',
});

const savingGif = ref(false);
const savingTts = ref(false);
const savingAudio = ref(false);
const savingColors = ref(false);
const wallet = useWalletSession();
const { withToken, refresh } = usePublicToken();
const widgetUrl = computed(() => withToken(`${location.origin}/widgets/tip-notification`));
const hostedSupported = ref(false);
const sessionActive = ref(false);
const masked = computed(() => hostedSupported.value && !sessionActive.value);

const audioState = reactive({
  hasCustomAudio: false,
  audioFileName: '',
  audioFileSize: 0,
  audioLibraryId: '',
  storageProvider: '',
});

const posPulse = ref(false);

const colors = reactive({
  bg: '#080c10',
  font: '#ffffff',
  border: '#00ff7f',
  amount: '#00ff7f',
  from: '#ffffff',
});
let originalColors = '';

const previewColors = reactive({
  bg: '#080c10',
  font: '#ffffff',
  border: '#00ff7f',
  amount: '#00ff7f',
  from: '#ffffff',
});

const storage = useStorageProviders();
const storageOptions = computed(() => storage.providerOptions.value);
const realStorageOptions = computed(() => storage.realProviderOptions.value || []);
const storageLoading = computed(() => storage.loading.value);
const selectedStorageProvider = computed({
  get: () => storage.selectedProvider.value,
  set: (val) => storage.setSelectedProvider(val),
});
const audioStorageProvider = computed(
  () => audioState.storageProvider || selectedStorageProvider.value || ''
);
watch(
  () => storage.selectedProvider.value,
  (val) => {
    if (!val) return;
    if (val !== WUZZY_PROVIDER_ID) {
      lastRealStorageProvider.value = val;
      if (gifStorageSelection.value !== WUZZY_PROVIDER_ID) {
        gifStorageSelection.value = val;
      }
    }
  },
  { immediate: true }
);

watch(selectedStorageProvider, (next) => {
  if (audioState.storageProvider === WUZZY_PROVIDER_ID) return;
  const normalized = typeof next === 'string' ? next : '';
  audioState.storageProvider = normalized;
});

function suppressNextWuzzyAutoOpen() {
  skipNextWuzzyAutoOpen.value = true;
  setTimeout(() => {
    skipNextWuzzyAutoOpen.value = false;
  }, 0);
}

watch(gifStorageSelection, (val, prev) => {
  const guardActive = skipNextWuzzyAutoOpen.value;
  const allowAutoOpen = wuzzyAutoOpenReady.value && !guardActive && !wuzzyDrawerDismissed.value;
  if (val === WUZZY_PROVIDER_ID) {
    if (prev !== WUZZY_PROVIDER_ID && allowAutoOpen) {
      wuzzyDrawerOpen.value = true;
    }
    if (guardActive) {
      skipNextWuzzyAutoOpen.value = false;
    }
    return;
  }
  if (guardActive) {
    skipNextWuzzyAutoOpen.value = false;
  }
  if (prev === WUZZY_PROVIDER_ID) {
    wuzzyDrawerOpen.value = false;
    wuzzyDrawerDismissed.value = false;
    resetWuzzySelection();
    if (gif.storageProvider === WUZZY_PROVIDER_ID) {
      gif.storageProvider = val || '';
    }
    gif.selectedId = '';
    if (!gif.file) {
      gif.gifPath = '';
    }
    gif.fileName = '';
  }
  if (!val) {
    const fallback =
      storage.selectedProvider.value ||
      lastRealStorageProvider.value ||
      realStorageOptions.value.find((opt) => opt.available)?.id ||
      realStorageOptions.value[0]?.id ||
      '';
    if (fallback && gifStorageSelection.value !== fallback) {
      gifStorageSelection.value = fallback;
    }
    return;
  }
  if (storage.selectedProvider.value !== val) {
    storage.setSelectedProvider(val);
  }
});
const providerStatus = computed(() => {
  const selected = gifStorageSelection.value || storage.selectedProvider.value;
  return storageOptions.value.find((opt) => opt.id === selected) || null;
});
const hasTurboOption = computed(() => realStorageOptions.value.some((opt) => opt.id === 'turbo'));
const isWuzzyMode = computed(() => gifStorageSelection.value === WUZZY_PROVIDER_ID);
const hasWuzzySelection = computed(() => !!(wuzzySelection.id && wuzzySelection.url));
const wuzzySelectionMeta = computed(() => {
  if (!hasWuzzySelection.value) return '';
  const parts = [];
  if (wuzzySelection.width && wuzzySelection.height) {
    parts.push(`${wuzzySelection.width}×${wuzzySelection.height}`);
  }
  if (wuzzySelection.size) {
    parts.push(formatWuzzyBytes(wuzzySelection.size));
  }
  return parts.join(' · ');
});

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

function showGifProviderWarning(providerLabel = '') {
  gifProviderWarning.title = t('gifUploadMissingTitle');
  gifProviderWarning.message = t('gifUploadMissingBody', {
    provider: providerLabel || t('storageProviderLabel'),
  });
  gifProviderWarning.open = true;
}

function resolveStorageSelection(preferred = '') {
  const candidates = [];
  if (preferred) candidates.push(preferred);
  if (gif.storageProvider) candidates.push(gif.storageProvider);
  if (audioState.storageProvider) candidates.push(audioState.storageProvider);
  storage.ensureSelection(candidates);
}

function isDirty() {
  const gifState = JSON.stringify({ p: gif.position, path: gif.gifPath, sid: gif.selectedId });
  return (
    gifState !== gif.original ||
    !!gif.file ||
    JSON.stringify({ e: tts.enabled, l: tts.language }) !== tts.original ||
    JSON.stringify({ s: audio.audioSource, f: !!audio.fileName }) !== audio.original ||
    (originalColors && originalColors !== JSON.stringify(colors)) ||
    widgetTheme.value !== originalTheme
  );
}
registerDirty(isDirty);

function triggerGif() {
  gifInput.value.click();
}

function handleChooseGifClick() {
  if (isWuzzyMode.value) {
    openWuzzyDrawer(true);
    return;
  }
  triggerGif();
}

function openGifLibrary() {
  gifLibrary.open = true;
  if (!gifLibrary.items.length) {
    fetchGifLibrary();
  }
}

function resetWuzzySelection() {
  wuzzySelection.id = '';
  wuzzySelection.url = '';
  wuzzySelection.width = 0;
  wuzzySelection.height = 0;
  wuzzySelection.size = 0;
  wuzzySelection.originalName = '';
  wuzzySelection.owner = '';
  wuzzySelection.sha256 = '';
  wuzzySelection.fingerprint = '';
}

function toPositiveInt(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.round(num);
}

function applyWuzzyEntry(entry = {}, overrides = {}) {
  const merged = { ...entry, ...overrides };
  const nextId =
    (typeof merged.id === 'string' && merged.id) ||
    (typeof merged.txId === 'string' && merged.txId) ||
    '';
  const nextUrl =
    (typeof merged.url === 'string' && merged.url) ||
    (typeof overrides.url === 'string' && overrides.url) ||
    '';
  if (!nextId || !nextUrl) return false;
  wuzzySelection.id = nextId;
  wuzzySelection.url = nextUrl;
  wuzzySelection.width = toPositiveInt(merged.width);
  wuzzySelection.height = toPositiveInt(merged.height);
  wuzzySelection.size = Math.max(0, Number(merged.size) || 0);
  wuzzySelection.originalName =
    typeof merged.originalName === 'string' && merged.originalName
      ? merged.originalName
      : `${nextId}.gif`;
  wuzzySelection.owner = typeof merged.owner === 'string' ? merged.owner : '';
  wuzzySelection.sha256 = typeof merged.sha256 === 'string' ? merged.sha256 : '';
  wuzzySelection.fingerprint =
    typeof merged.fingerprint === 'string' && merged.fingerprint ? merged.fingerprint : nextId;
  gif.gifPath = nextUrl;
  gif.file = null;
  gif.fileName = '';
  gif.selectedId = nextId;
  gif.storageProvider = WUZZY_PROVIDER_ID;
  suppressNextWuzzyAutoOpen();
  gifStorageSelection.value = WUZZY_PROVIDER_ID;
  errors.gif = '';
  return true;
}

function clearWuzzySelection() {
  resetWuzzySelection();
  gif.selectedId = '';
  if (gif.storageProvider === WUZZY_PROVIDER_ID) {
    gif.storageProvider = '';
  }
  gif.gifPath = '';
  gif.file = null;
  gif.fileName = '';
  ensureRealStorageSelection();
}

function openWuzzyDrawer(force = false) {
  if (!isWuzzyMode.value && !force) return;
  wuzzyDrawerDismissed.value = false;
  wuzzyDrawerOpen.value = true;
}

function closeWuzzyDrawer(persistDismiss = true) {
  wuzzyDrawerOpen.value = false;
  if (persistDismiss) {
    wuzzyDrawerDismissed.value = true;
  }
}

function ensureRealStorageSelection() {
  if (gifStorageSelection.value !== WUZZY_PROVIDER_ID) return;
  const fallback =
    lastRealStorageProvider.value ||
    storage.selectedProvider.value ||
    realStorageOptions.value.find((opt) => opt.available)?.id ||
    realStorageOptions.value[0]?.id ||
    '';
  if (fallback) {
    gifStorageSelection.value = fallback;
  }
}

function readImageDimensions(url) {
  return new Promise((resolve) => {
    if (!url) {
      resolve({ width: 0, height: 0 });
      return;
    }
    if (typeof Image === 'undefined') {
      resolve({ width: 0, height: 0 });
      return;
    }
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || 0, height: img.naturalHeight || 0 });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = url;
  });
}

async function handleWuzzySelect(entry) {
  if (!entry || !entry.id || !entry.url) return;
  wuzzySelectionLoading.value = true;
  try {
    const dims = await readImageDimensions(entry.url);
    const applied = applyWuzzyEntry(entry, {
      width: entry.width || dims.width || 0,
      height: entry.height || dims.height || 0,
      size: entry.size || 0,
      originalName: entry.displayName || entry.originalName || `${entry.id}.gif`,
      owner: entry.owner || '',
    });
    if (!applied) {
      errors.gif = t('wuzzySelectionError');
    } else {
      closeWuzzyDrawer();
    }
  } catch (err) {
    console.warn('[notif] failed to hydrate wuzzy selection', err);
    errors.gif = t('wuzzySelectionError');
  } finally {
    wuzzySelectionLoading.value = false;
  }
}

function openWuzzySelectionUrl() {
  if (!wuzzySelection.url) return;
  try {
    if (typeof window !== 'undefined') {
      window.open(wuzzySelection.url, '_blank', 'noopener,noreferrer');
    }
  } catch (err) {
    console.warn('[notif] failed to open wuzzy url', err);
  }
}

async function copyWuzzySelectionUrl() {
  if (
    !wuzzySelection.url ||
    typeof navigator === 'undefined' ||
    !navigator.clipboard ||
    typeof navigator.clipboard.writeText !== 'function'
  ) {
    pushToast({ type: 'error', message: t('wuzzySelectionCopyError') });
    return;
  }
  try {
    await navigator.clipboard.writeText(wuzzySelection.url);
    pushToast({ type: 'success', message: t('wuzzySelectionCopySuccess') });
  } catch (err) {
    console.warn('[notif] failed to copy wuzzy url', err);
    pushToast({ type: 'error', message: t('wuzzySelectionCopyError') });
  }
}

function formatGifLibraryName(item) {
  if (!item) return t('gifLibraryUnknown');
  return item.originalName || item.id || t('gifLibraryUnknown');
}

async function fetchGifLibrary(force = false) {
  if (gifLibrary.loading) return;
  try {
    gifLibrary.loading = true;
    gifLibrary.error = '';
    const config = force ? { params: { ts: Date.now() } } : undefined;
    const { data } = await api.get('/api/tip-notification-gif/library', config);
    gifLibrary.items = Array.isArray(data?.items) ? data.items : [];
    if (isWuzzyMode.value && wuzzySelection.id) {
      const match = gifLibrary.items.find((entry) => entry && entry.id === wuzzySelection.id);
      if (match) {
        applyWuzzyEntry({ ...match, url: match.url || wuzzySelection.url || gif.gifPath });
      }
    }
  } catch (error) {
    gifLibrary.error = t('gifLibraryLoadFailed');
    console.error('[notif] gif library load failed', error);
  } finally {
    gifLibrary.loading = false;
  }
}

async function ensureGifLibraryLoadedIfNeeded() {
  if (gifLibrary.items.length) return;
  await fetchGifLibrary(true);
}

function buildGifFingerprint(file) {
  const name = (file?.name || '').toLowerCase();
  const size = Number(file?.size) || 0;
  return `${name}::${size}`;
}

async function computeGifHash(file) {
  try {
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const buffer = await file.arrayBuffer();
      const digest = await window.crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(digest));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (hashError) {
    console.warn('[notif] failed to hash gif file', hashError);
  }
  return '';
}

function matchesGifDuplicateCandidate(item, file, hash, fallbackKey) {
  if (!item) return false;
  if (hash && typeof item.sha256 === 'string' && item.sha256 && item.sha256 === hash) {
    return true;
  }
  if (
    fallbackKey &&
    typeof item.fingerprint === 'string' &&
    item.fingerprint &&
    item.fingerprint === fallbackKey
  ) {
    return true;
  }
  const itemSize = Number(item.size) || 0;
  if (itemSize && file.size && itemSize !== file.size) return false;
  const itemName = (item.originalName || item.id || '').trim().toLowerCase();
  const fileName = (file.name || '').trim().toLowerCase();
  if (itemName && fileName && itemName === fileName) {
    if (!itemSize || !file.size || itemSize === file.size) {
      return true;
    }
  }
  return false;
}

async function maybeHandleGifDuplicate(file) {
  try {
    await ensureGifLibraryLoadedIfNeeded();
    if (!gifLibrary.items.length) return false;
    const fallbackKey = buildGifFingerprint(file);
    const hash = await computeGifHash(file);
    const duplicate = gifLibrary.items.find((item) =>
      matchesGifDuplicateCandidate(item, file, hash, fallbackKey)
    );
    if (!duplicate) return false;

    const displayName =
      duplicate.originalName || duplicate.id || file.name || t('duplicateUploadFallbackName');
    const replace = await confirmDialog({
      title: t('duplicateUploadTitle'),
      description: t('duplicateUploadBody', { fileName: displayName }),
      confirmText: t('duplicateUploadReplace'),
      cancelText: t('duplicateUploadUseExisting'),
      danger: true,
    });

    if (!replace) {
      gif.file = null;
      gif.fileName = duplicate.originalName || t('gifLibraryUnknown');
      gif.selectedId = duplicate.id;
      gif.gifPath = duplicate.url || gif.gifPath;
      if (typeof duplicate.provider === 'string' && duplicate.provider) {
        const providerId = duplicate.provider.toLowerCase();
        gif.storageProvider = providerId;
        storage.registerProvider(providerId);
        resolveStorageSelection(providerId);
        if (providerId === WUZZY_PROVIDER_ID) {
          applyWuzzyEntry(duplicate);
        } else {
          gifStorageSelection.value = providerId;
        }
      }
      if (gifInput.value) {
        gifInput.value.value = '';
      }
      pushToast({ type: 'info', message: t('toastDuplicateUploadUsingExisting') });
      return true;
    }
  } catch (error) {
    console.warn('[notif] duplicate detection failed', error);
  }
  return false;
}

/**
 * @param {{ id: string, url: string, originalName?: string }} item
 */
function onLibrarySelect(item) {
  if (!item || !item.url) return;
  const providerId = typeof item.provider === 'string' ? item.provider.toLowerCase() : '';
  if (providerId === WUZZY_PROVIDER_ID) {
    applyWuzzyEntry(item);
    gifLibrary.open = false;
    return;
  }
  resetWuzzySelection();
  gif.gifPath = item.url;
  gif.file = null;
  gif.fileName = item.originalName || t('gifLibraryUnknown');
  gif.selectedId = item.id || '';
  if (providerId) {
    gif.storageProvider = providerId;
    storage.registerProvider(providerId);
    resolveStorageSelection(providerId);
    gifStorageSelection.value = providerId;
  }
  gifLibrary.open = false;
}

async function onLibraryDelete(item) {
  if (!item?.id || gifLibrary.deletingId) return;
  const confirmed = await confirmDialog({
    title: t('gifLibraryDeleteConfirmTitle'),
    description: t('gifLibraryDeleteConfirmBody', { fileName: formatGifLibraryName(item) }),
    confirmText: t('commonDelete'),
    cancelText: t('commonCancel'),
    danger: true,
  });
  if (!confirmed) return;

  gifLibrary.deletingId = item.id;
  try {
    const { data } = await api.delete(
      `/api/tip-notification-gif/library/${encodeURIComponent(item.id)}`
    );
    gifLibrary.items = gifLibrary.items.filter((entry) => entry && entry.id !== item.id);
    const clearedActive = gif.selectedId === item.id || !!data?.cleared;
    if (clearedActive) {
      gif.gifPath = '';
      gif.file = null;
      gif.fileName = '';
      gif.selectedId = '';
      gif.storageProvider = '';
      resetWuzzySelection();
      ensureRealStorageSelection();
      if (gifInput.value) {
        gifInput.value.value = '';
      }
    }
    pushToast({
      type: 'success',
      message: clearedActive
        ? t('gifLibraryDeleteToastSuccessCleared')
        : t('gifLibraryDeleteToastSuccess'),
    });
  } catch (error) {
    console.error('[notif] gif library delete failed', error);
    const code = error?.response?.data?.error;
    if (code === 'gif_library_delete_unsupported') {
      pushToast({ type: 'info', message: t('gifLibraryDeleteToastUnsupported') });
    } else {
      pushToast({ type: 'error', message: t('gifLibraryDeleteToastError') });
    }
  } finally {
    gifLibrary.deletingId = '';
  }
}

async function onGifChange(e) {
  const f = e.target.files[0];
  if (!f) return;
  if (f.size > MAX_GIF_SIZE) {
    errors.gif = t('valMax1MB');
    if (gifInput.value) {
      gifInput.value.value = '';
    }
    return;
  }
  errors.gif = '';
  gif.file = null;
  gif.fileName = '';
  gif.selectedId = '';
  if (gifStorageSelection.value === WUZZY_PROVIDER_ID) {
    ensureRealStorageSelection();
  }
  resetWuzzySelection();
  const usedExisting = await maybeHandleGifDuplicate(f);
  if (usedExisting) {
    return;
  }
  gif.file = f;
  gif.fileName = f.name;
  gif.selectedId = '';
  gif.storageProvider = gifStorageSelection.value || storage.selectedProvider.value || '';
}

async function loadGif() {
  try {
    const { data } = await api.get('/api/tip-notification-gif');
    gif.position = data.position || 'right';
    gif.gifPath = data.gifPath || '';
    gif.selectedId = data.libraryId || '';
    gif.storageProvider = typeof data.storageProvider === 'string' ? data.storageProvider : '';
    gif.original = JSON.stringify({ p: gif.position, path: gif.gifPath, sid: gif.selectedId });
    if (gif.selectedId && !gifLibrary.items.length) {
      fetchGifLibrary();
    }
    if (gif.storageProvider) {
      storage.registerProvider(gif.storageProvider);
    }
    if (gif.storageProvider === WUZZY_PROVIDER_ID && gif.gifPath) {
      applyWuzzyEntry(
        {
          id: gif.selectedId || data.libraryId || '',
          url: gif.gifPath,
          width: data.width,
          height: data.height,
          size: data.size || 0,
          originalName: data.originalName || '',
        },
        { width: data.width, height: data.height }
      );
    }
    resolveStorageSelection();
  } catch {}
}

async function loadColors() {
  try {
    const { data } = await api.get('/api/tip-notification');
    if (data && data.success) {
      colors.bg = data.bgColor || colors.bg;
      colors.font = data.fontColor || colors.font;
      colors.border = data.borderColor || colors.border;
      colors.amount = data.amountColor || colors.amount;
      colors.from = data.fromColor || colors.from;
      originalColors = JSON.stringify(colors);
      previewColors.bg = colors.bg;
      previewColors.font = colors.font;
      previewColors.border = colors.border;
      previewColors.amount = colors.amount;
      previewColors.from = colors.from;
      const nextTheme = data.theme === 'deterministic' ? 'deterministic' : 'classic';
      widgetTheme.value = nextTheme;
      originalTheme = nextTheme;
    }
  } catch {}
}

function resetColors() {
  colors.bg = '#080c10';
  colors.font = '#ffffff';
  colors.border = '#00ff7f';
  colors.amount = '#00ff7f';
  colors.from = '#ffffff';
}

async function saveColors() {
  try {
    savingColors.value = true;
    if (hostedSupported.value && !sessionActive.value) {
      pushToast({ type: 'info', message: t('sessionRequiredToast') });
      return;
    }
    const payload = {
      bgColor: colors.bg,
      fontColor: colors.font,
      borderColor: colors.border,
      amountColor: colors.amount,
      fromColor: colors.from,
      theme: widgetTheme.value,
    };
    await api.post('/api/tip-notification', payload);
    originalColors = JSON.stringify(colors);
    originalTheme = widgetTheme.value;
    previewColors.bg = colors.bg;
    previewColors.font = colors.font;
    previewColors.border = colors.border;
    previewColors.amount = colors.amount;
    previewColors.from = colors.from;
    pushToast({ type: 'success', message: t('savedNotifications') });
  } catch {
    pushToast({ type: 'error', message: t('saveFailedNotifications') });
  } finally {
    savingColors.value = false;
  }
}

async function refreshPreview() {
  try {
    const { data } = await api.get('/api/tip-notification');
    if (data && data.success) {
      previewColors.bg = data.bgColor || previewColors.bg;
      previewColors.font = data.fontColor || previewColors.font;
      previewColors.border = data.borderColor || previewColors.border;
      previewColors.amount = data.amountColor || previewColors.amount;
      previewColors.from = data.fromColor || previewColors.from;
      if (data.theme) {
        widgetTheme.value = data.theme === 'deterministic' ? 'deterministic' : 'classic';
      }
    }
  } catch {}
}

async function saveGif() {
  if (errors.gif) return;
  try {
    savingGif.value = true;
    if (hostedSupported.value && !sessionActive.value) {
      pushToast({ type: 'info', message: t('sessionRequiredToast') });
      return;
    }
    const fd = new FormData();
    fd.append('position', gif.position);
    const providerSelection = gifStorageSelection.value || storage.selectedProvider.value || '';
    const isWuzzySelection = providerSelection === WUZZY_PROVIDER_ID;
    if (providerSelection) {
      fd.append('storageProvider', providerSelection);
    }
    if (isWuzzySelection) {
      if (!wuzzySelection.id || !wuzzySelection.url) {
        errors.gif = t('wuzzySelectionRequired');
        return;
      }
      fd.append('wuzzyId', wuzzySelection.id);
      fd.append('wuzzyUrl', wuzzySelection.url);
      fd.append('wuzzyWidth', String(wuzzySelection.width || 0));
      fd.append('wuzzyHeight', String(wuzzySelection.height || 0));
      fd.append('wuzzySize', String(wuzzySelection.size || 0));
      if (wuzzySelection.originalName) {
        fd.append('wuzzyOriginalName', wuzzySelection.originalName);
      }
      if (wuzzySelection.sha256) {
        fd.append('wuzzySha256', wuzzySelection.sha256);
      }
      if (wuzzySelection.fingerprint) {
        fd.append('wuzzyFingerprint', wuzzySelection.fingerprint);
      }
    } else {
      const hasUploadCandidate = !!gif.file || !!gif.selectedId;
      if (!hasUploadCandidate) {
        showGifProviderWarning(providerStatus.value?.label || '');
        return;
      }
      if (gif.file) fd.append('gifFile', gif.file);
      if (gif.selectedId && !gif.file) {
        fd.append('selectedGifId', gif.selectedId);
      }
    }
    const { data } = await api.post('/api/tip-notification-gif', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const libraryItem = data?.libraryItem || null;
    gif.gifPath = data.gifPath || '';
    gif.file = null;
    gif.selectedId = data.libraryId || '';
    gif.storageProvider =
      typeof data.storageProvider === 'string' ? data.storageProvider : gif.storageProvider;
    gif.fileName = libraryItem?.originalName || (gif.selectedId ? gif.fileName : '');
    if (!gif.selectedId) {
      gif.fileName = '';
    }
    if (libraryItem) {
      const existingIdx = gifLibrary.items.findIndex((item) => item.id === libraryItem.id);
      if (existingIdx >= 0) {
        gifLibrary.items.splice(existingIdx, 1);
      }
      gifLibrary.items.unshift(libraryItem);
    }
    gif.original = JSON.stringify({ p: gif.position, path: gif.gifPath, sid: gif.selectedId });
    if (gif.storageProvider) {
      storage.registerProvider(gif.storageProvider);
    }
    if (gif.storageProvider === WUZZY_PROVIDER_ID) {
      gifStorageSelection.value = WUZZY_PROVIDER_ID;
      if (libraryItem) {
        applyWuzzyEntry(libraryItem);
      }
    } else if (gifStorageSelection.value === WUZZY_PROVIDER_ID) {
      ensureRealStorageSelection();
    }
    pushToast({ type: 'success', message: t('savedNotifications') });
  } catch (error) {
    const errorMsg = error?.response?.data?.error;
    if (errorMsg?.includes('File too large') || errorMsg?.includes('Insufficient balance')) {
      showUploadErrorDialog(t('uploadErrorTitle'), errorMsg);
    } else {
      pushToast({ type: 'error', message: t('saveFailedNotifications') });
    }
  } finally {
    savingGif.value = false;
  }
}

async function removeGif() {
  try {
    if (hostedSupported.value && !sessionActive.value) {
      pushToast({ type: 'info', message: t('sessionRequiredToast') });
      return;
    }
    await api.delete('/api/tip-notification-gif');
    clearWuzzySelection();
    gif.original = JSON.stringify({ p: gif.position, path: '', sid: '' });

    await fetchGifLibrary(true);
    pushToast({ type: 'success', message: t('removedGif') });
  } catch {
    pushToast({ type: 'error', message: t('removeGifFailed') });
  }
}

async function loadTts() {
  try {
    const se = await api.get('/api/tts-setting');
    const la = await api.get('/api/tts-language');
    tts.enabled = !!se.data.ttsEnabled;
    tts.language = la.data.ttsLanguage || 'en';
    tts.ttsAllChat = !!se.data.ttsAllChat;
    tts.original = JSON.stringify({ e: tts.enabled, l: tts.language });
  } catch {}
}

async function saveTts() {
  try {
    savingTts.value = true;
    if (hostedSupported.value && !sessionActive.value) {
      pushToast({ type: 'info', message: t('sessionRequiredToast') });
      return;
    }
    await api.post('/api/tts-setting', { ttsEnabled: tts.enabled });
    await api.post('/api/tts-language', { ttsLanguage: tts.language });
    tts.original = JSON.stringify({ e: tts.enabled, l: tts.language });
    pushToast({ type: 'success', message: t('savedNotifications') });
  } catch {
    pushToast({ type: 'error', message: t('saveFailedNotifications') });
  } finally {
    savingTts.value = false;
  }
}

async function loadAudio() {
  try {
    const { data } = await api.get('/api/audio-settings');
    audio.audioSource = data.audioSource || 'remote';
    audio.fileName = data.audioFileName || '';
    audio.original = JSON.stringify({ s: audio.audioSource, f: !!audio.fileName });
    audioState.hasCustomAudio = !!data.hasCustomAudio;
    audioState.audioFileName = data.audioFileName || '';
    audioState.audioFileSize = data.audioFileSize || 0;
    audioState.audioLibraryId = data.audioLibraryId || '';
    audioState.storageProvider =
      typeof data.storageProvider === 'string' ? data.storageProvider : '';
    if (typeof data.enabled === 'boolean') audioCfg.enabled = data.enabled;
    if (typeof data.volume === 'number') audioCfg.volume = Math.max(0, Math.min(1, data.volume));
    lastSavedAudio = {
      enabled: audioCfg.enabled,
      volume: audioCfg.volume,
      audioSource: audio.audioSource,
    };
    if (audioState.storageProvider && audioState.storageProvider !== WUZZY_PROVIDER_ID) {
      storage.registerProvider(audioState.storageProvider);
    }
    resolveStorageSelection();
  } catch {}
}

function onAudioSaved() {
  loadAudio();
}
function onAudioDeleted(payload) {
  loadAudio();
  if (payload && payload.silent) {
    return;
  }
}

function handleAudioToast(payload) {
  if (!payload || !payload.messageKey) return;
  const message = t(payload.messageKey);
  if (!message) return;
  pushToast({ type: payload.type || 'info', message });
}

function handleAudioStorageProviderChange(providerId) {
  const normalized = typeof providerId === 'string' ? providerId : '';
  audioState.storageProvider = normalized;
  if (normalized && normalized !== WUZZY_PROVIDER_ID) {
    storage.setSelectedProvider(normalized);
  }
}

async function persistAudioCfg(silent = false) {
  try {
    savingAudio.value = true;
    if (hostedSupported.value && !sessionActive.value) {
      if (!silent) pushToast({ type: 'info', message: t('sessionRequiredToast') });
      return;
    }
    const fd = new FormData();
    fd.append('audioSource', audio.audioSource);
    fd.append('enabled', String(audioCfg.enabled));
    fd.append('volume', String(audioCfg.volume));
    if (storage.selectedProvider.value) {
      fd.append('storageProvider', storage.selectedProvider.value);
    }
    await api.post('/api/audio-settings', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    lastSavedAudio = {
      enabled: audioCfg.enabled,
      volume: audioCfg.volume,
      audioSource: audio.audioSource,
    };
    if (!silent) pushToast({ type: 'success', message: t('savedNotifications') });
  } catch (error) {
    if (!silent) {
      const errorMsg = error?.response?.data?.error;
      if (errorMsg?.includes('File too large') || errorMsg?.includes('Insufficient balance')) {
        showUploadErrorDialog(t('uploadErrorTitle'), errorMsg);
      } else {
        pushToast({ type: 'error', message: t('saveFailedNotifications') });
      }
    }
  } finally {
    savingAudio.value = false;
  }
}

async function testRandomNotification() {
  try {
    if (hostedSupported.value && !sessionActive.value) {
      pushToast({ type: 'info', message: t('sessionRequiredToast') });
      return;
    }
    const dirty =
      lastSavedAudio.enabled !== audioCfg.enabled ||
      Math.abs(lastSavedAudio.volume - audioCfg.volume) > 0.0001 ||
      lastSavedAudio.audioSource !== audio.audioSource;
    if (dirty) {
      await persistAudioCfg(true);
    }
    await api.post('/api/test-tip', { amount: (Math.random() * 2 + 0.1).toFixed(3) });
  } catch {}
}

onMounted(async () => {
  try {
    await wallet.refresh();
    await refresh();
  } catch {}

  await storage.fetchProviders();

  hostedSupported.value = true;
  sessionActive.value = true;
  loadGif();
  loadTts();
  loadAudio();
  loadColors();
  resolveStorageSelection();

  setTimeout(() => {
    wuzzyAutoOpenReady.value = true;
  }, 0);
});

watch(
  () => audioCfg.volume,
  (newVol, oldVol) => {
    if (Math.abs(newVol - oldVol) > 0.01 && sessionActive.value) {
      persistAudioCfg(true); // silent save
    }
  }
);

watch(
  () => [colors.bg, colors.font, colors.border, colors.amount, colors.from],
  () => {
    previewColors.bg = colors.bg;
    previewColors.font = colors.font;
    previewColors.border = colors.border;
    previewColors.amount = colors.amount;
    previewColors.from = colors.from;
  }
);

watch(storageOptions, () => {
  resolveStorageSelection();
});
</script>

<style scoped src="./NotificationsPanel/NotificationsPanel.css"></style>
