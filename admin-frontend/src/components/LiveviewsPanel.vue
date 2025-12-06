<template>
  <section class="admin-tab active" role="form">
    <BlockedState v-if="isBlocked" :module-name="t('liveviewsModule')" :details="blockDetails" />

    <OsCard v-else>
      <div class="grid [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))] gap-3">
        <div class="form-group [grid-column:1/-1]">
          <label class="label">{{ t('liveviewsClaimId') }}</label>
          <input
            class="input"
            :class="{ 'input-error': errors.claimid }"
            v-model="form.claimid"
            @input="validate" />
          <small v-if="errors.claimid" class="small text-red-700">{{ errors.claimid }}</small>
        </div>
        <div class="form-group">
          <label class="label">{{ t('liveviewsViewersLabel') }}</label>
          <input class="input" v-model="form.viewersLabel" />
        </div>
        <div class="form-group">
          <label class="label">{{ t('liveviewsFont') }}</label>
          <select class="input" v-model="form.font">
            <option value="Inter">Inter</option>
            <option value="Arial">Arial</option>
            <option value="Roboto">Roboto</option>
            <option value="'Open Sans'">Open Sans</option>
            <option value="'Source Sans Pro'">Source Sans Pro</option>
            <option value="'Fira Sans'">Fira Sans</option>
            <option value="'Nunito'">Nunito</option>
            <option value="'Poppins'">Poppins</option>
            <option value="'Montserrat'">Montserrat</option>
            <option value="'JetBrains Mono'">JetBrains Mono</option>
            <option value="system-ui">System UI</option>
            <option value="custom">Custom…</option>
          </select>
        </div>
        <div class="form-group" v-if="form.font === 'custom'">
          <label class="label">Custom Font Family</label>
          <input
            class="input"
            v-model="customFont"
            @input="applyCustomFont"
            placeholder="e.g. 'My Font', sans-serif" />
        </div>
        <div class="form-group">
          <label class="label">{{ t('liveviewsSize') }}</label>
          <input class="input" v-model="form.size" />
        </div>
        <div class="form-group">
          <div class="color-pair">
            <div class="color-item">
              <label class="label" for="liveviews-bg">{{ t('liveviewsBg') }}</label>
              <input
                id="liveviews-bg"
                class="color-swatch"
                type="color"
                v-model="form.bg"
                :aria-label="t('liveviewsBg')"
                :title="t('liveviewsBg')" />
            </div>
            <div class="color-item">
              <label class="label" for="liveviews-color">{{ t('liveviewsColor') }}</label>
              <input
                id="liveviews-color"
                class="color-swatch"
                type="color"
                v-model="form.color"
                :aria-label="t('liveviewsColor')"
                :title="t('liveviewsColor')" />
            </div>
          </div>
        </div>
      </div>
      <div class="form-group mt-3">
        <label class="label">{{ t('liveviewsIcon') }}</label>
        <div class="flex gap-2 items-center">
          <input
            ref="iconInput"
            type="file"
            accept="image/png,image/jpeg,image/gif"
            class="sr-only"
            @change="onIconFileChange" />
          <button type="button" class="upload-btn" @click="openIconDialog">
            <i class="pi pi-upload mr-2" aria-hidden="true"></i>
            {{ t('liveviewsUploadIcon') || t('imageChoose') }}
          </button>
          <span v-if="selectedIconFilename" class="file-name-label" :title="selectedIconFilename">{{
            selectedIconFilename
          }}</span>
          <button
            v-if="displayIcon"
            type="button"
            class="icon-btn"
            :aria-label="t('liveviewsRemoveIcon')"
            :title="t('liveviewsRemoveIcon')"
            @click="removeIcon">
            <i class="pi pi-trash"></i>
          </button>
          <div v-if="displayIcon" class="ml-3">
            <img :src="displayIcon" class="h-10 object-contain" />
          </div>
        </div>
      </div>
      <div class="mt-4 flex gap-2" role="group" aria-label="Liveviews actions">
        <button
          class="btn"
          :disabled="!dirty || saving"
          @click="save"
          :aria-busy="saving ? 'true' : 'false'">
          {{ saving ? t('commonSaving') : t('liveviewsSave') }}
        </button>
      </div>
      <div class="mt-4">
        <label class="label flex items-center gap-2">
          <span class="icon-badge" aria-hidden="true">
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
          </span>
          {{ t('liveviewsWidgetUrl') }}
        </label>
        <CopyField :value="widgetUrl" secret />
      </div>
    </OsCard>
  </section>
</template>
<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../services/api';
import { pushToast } from '../services/toast';
import { useDirty } from '../composables/useDirtyRegistry';
import CopyField from './shared/CopyField.vue';
import OsCard from './os/OsCard.vue';
import BlockedState from './shared/BlockedState.vue';
import { useWalletSession } from '../composables/useWalletSession';
import { usePublicToken } from '../composables/usePublicToken';

const { t, locale } = useI18n();
const isBlocked = ref(false);
const blockDetails = ref({});

const form = ref({
  bg: '#222222',
  color: '#ffffff',
  font: 'Inter',
  size: '32',
  icon: '',
  claimid: '',
  viewersLabel: 'viewers',
});

const customFont = ref('');
const errors = ref({ claimid: '' });
const wallet = useWalletSession();
const { withToken, refresh } = usePublicToken();

function appendLangParam(url) {
  const lang = locale?.value || '';
  if (!lang) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}lang=${encodeURIComponent(lang)}`;
}

const widgetUrl = computed(() =>
  withToken(appendLangParam(`${location.origin}/widgets/liveviews`))
);
const initial = ref('');
const dirty = ref(false);
const saving = ref(false);
const removingIcon = ref(false);
const fileUploadKey = ref(0);
const selectedIconFilename = ref('');
const iconInput = ref(null);
const displayIcon = ref('');
const locallyClearedIcon = ref(false);

useDirty(() => dirty.value, t('liveviewsModule') || 'Live Views');
watch(
  form,
  () => {
    dirty.value = JSON.stringify(form.value) !== initial.value;
  },
  { deep: true }
);

function applyCustomFont() {
  if (form.value.font === 'custom') {
    form.value.font = customFont.value || 'custom';
  }
}
async function load() {
  isBlocked.value = false;
  try {
    const r = await api.get('/config/liveviews-config.json');
    Object.assign(form.value, r.data);
    initial.value = JSON.stringify(form.value);
    dirty.value = false;
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
      return;
    }
    pushToast({ type: 'error', message: t('liveviewsSaveFailed') });
  }
}

function validate() {
  errors.value.claimid = form.value.claimid ? '' : t('required');
}

async function save() {
  validate();
  if (errors.value.claimid) return;
  try {
    saving.value = true;
    const fd = new FormData();
    Object.entries(form.value).forEach(([k, v]) => fd.append(k, v || ''));
    if (removingIcon.value) fd.append('removeIcon', '1');
    const r = await fetch('/config/liveviews-config.json', { method: 'POST', body: fd });
    const data = await r.json();
    if (data.success) {
      Object.assign(form.value, data.config);
      initial.value = JSON.stringify(form.value);
      dirty.value = false;
      pushToast({ type: 'success', message: t('liveviewsSaved') });
      removingIcon.value = false;
    } else {
      pushToast({ type: 'error', message: t('liveviewsSaveFailed') });
    }
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
      return;
    }
    pushToast({ type: 'error', message: t('liveviewsSaveFailed') });
  } finally {
    saving.value = false;
  }
}

function onIconFileChange(e) {
  const file = e?.target?.files?.[0];
  if (!file) return;
  selectedIconFilename.value = file.name || '';
  const fd = new FormData();
  fd.append('icon', file);
  Object.entries(form.value).forEach(([k, v]) => fd.append(k, v || ''));
  fetch('/config/liveviews-config.json', { method: 'POST', body: fd })
    .then((r) => r.json())
    .then((data) => {
      if (data.error === 'CONFIGURATION_BLOCKED' || data.error === 'configuration_blocked') {
        isBlocked.value = true;
        const details = data.details;
        blockDetails.value = typeof details === 'string' ? { reason: details } : details || {};
        return;
      }
      if (data.success) {
        Object.assign(form.value, data.config);
        displayIcon.value = form.value.icon || '';
        locallyClearedIcon.value = false;
        initial.value = JSON.stringify(form.value);
        dirty.value = false;
        pushToast({ type: 'success', message: t('liveviewsSaved') });
        fileUploadKey.value++;
        if (iconInput.value) iconInput.value.value = '';
      } else {
        pushToast({ type: 'error', message: t('liveviewsSaveFailed') });
      }
    });
}

function removeIcon() {
  removingIcon.value = true;
  selectedIconFilename.value = '';
  displayIcon.value = '';
  locallyClearedIcon.value = true;
  if (iconInput.value) iconInput.value.value = '';
  save();
}

function openIconDialog() {
  if (iconInput.value) {
    iconInput.value.value = '';
    iconInput.value.click();
  }
}

onMounted(async () => {
  try {
    await wallet.refresh();
    await refresh();
  } catch {}
  await load();
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

.file-name-label {
  font-size: 0.85rem;
  color: #64748b;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.color-pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  align-items: start;
}
.color-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.color-item .label {
  margin-bottom: 0;
  line-height: 1.62;
}
.color-swatch {
  width: 100%;
  height: var(--control-height, 36px);
  margin: 0;
  padding: 0;
  border: 1px solid var(--card-border);
  border-radius: 6px;
  background: var(--card-bg);
  box-sizing: border-box;
  display: block;
}
.color-swatch::-webkit-color-swatch-wrapper {
  padding: 0;
}
.color-swatch::-webkit-color-swatch {
  border: none;
  border-radius: 6px;
}
.color-swatch::-moz-color-swatch {
  border: none;
  border-radius: 6px;
}
</style>
