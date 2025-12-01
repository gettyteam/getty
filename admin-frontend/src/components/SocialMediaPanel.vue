<template>
  <section class="admin-tab active" role="form">
    <OsCard :title="t('socialMediaTitle')">
      <template #actions>
        <div class="flex gap-2" role="group" :aria-label="t('socialMediaTitle') + ' actions'">
          <button class="btn" @click="addItem" :aria-label="t('socialMediaAddItem')">
            {{ t('socialMediaAddItem') }}
          </button>
          <button
            class="btn"
            :disabled="!dirty || saving"
            @click="save"
            :aria-busy="saving ? 'true' : 'false'">
            {{ saving ? t('commonSaving') : t('socialMediaSave') }}
          </button>
        </div>
      </template>

      <div class="os-table social-media" :aria-label="t('socialMediaTitle') + ' table'">
        <div class="os-tr py-2">
          <div class="os-th num">#</div>
          <div class="os-th text-left">{{ t('socialMediaName') }}</div>
          <div class="os-th text-left">{{ t('socialMediaLink') }}</div>
          <div class="os-th text-left">{{ t('socialMediaPlatform') }}</div>
          <div class="os-th text-left">{{ t('socialMediaCustomIcon') }}</div>
          <div class="os-th"></div>
        </div>

        <div v-for="(item, idx) in items" :key="idx" class="os-tr py-2">
          <div class="os-td num">{{ idx + 1 }}</div>
          <div class="os-td">
            <input
              class="input w-full"
              :aria-label="t('socialMediaName') + ' ' + (idx + 1)"
              :class="{ 'input-error': fieldError(idx, 'name') }"
              v-model="item.name"
              @input="validateRow(idx)"
              :aria-invalid="!!fieldError(idx, 'name')" />
            <div v-if="fieldError(idx, 'name')" class="small text-red-700">
              {{ fieldError(idx, 'name') }}
            </div>
          </div>
          <div class="os-td">
            <input
              class="input w-full"
              :aria-label="t('socialMediaLink') + ' ' + (idx + 1)"
              :class="{ 'input-error': fieldError(idx, 'link') }"
              v-model="item.link"
              @input="validateRow(idx)"
              :aria-invalid="!!fieldError(idx, 'link')" />
            <div v-if="fieldError(idx, 'link')" class="small text-red-700">
              {{ fieldError(idx, 'link') }}
            </div>
          </div>
          <div class="os-td">
            <select
              class="input w-full"
              v-model="item.icon"
              @change="onIconChange(item, idx)"
              :aria-label="t('socialMediaIcon') + ' ' + (idx + 1)">
              <option value="x">{{ t('socialMediaIconX') }}</option>
              <option value="instagram">{{ t('socialMediaIconInstagram') }}</option>
              <option value="youtube">{{ t('socialMediaIconYoutube') }}</option>
              <option value="telegram">{{ t('socialMediaIconTelegram') }}</option>
              <option value="discord">{{ t('socialMediaIconDiscord') }}</option>
              <option value="odysee">{{ t('socialMediaIconOdysee') }}</option>
              <option value="rumble">{{ t('socialMediaIconRumble') }}</option>
              <option value="custom">{{ t('socialMediaIconCustom') }}</option>
            </select>
          </div>
          <div class="os-td">
            <div v-if="item.icon === 'custom'">
              <input
                type="file"
                accept="image/*"
                class="sr-only"
                :id="'custom-icon-' + idx"
                @change="(e) => selectCustomIcon(e, item)"
                :aria-label="t('socialMediaCustomIcon')" />
              <label
                :for="'custom-icon-' + idx"
                class="btn-secondary cursor-pointer inline-flex items-center gap-2">
                <i class="pi pi-images" aria-hidden="true"></i>
                Upload icon
              </label>
              <div v-if="item.customIcon" class="mt-1">
                <img :src="item.customIcon" alt="custom" class="max-h-10 object-contain" />
              </div>
            </div>
          </div>
          <div class="os-td actions flex gap-2 justify-end items-center">
            <button
              class="btn-secondary flex items-center gap-2"
              @click="openStyleEditor(idx)"
              :title="t('socialMediaStyleTitle')">
              <i class="pi pi-palette"></i>
              <span>Color</span>
            </button>
            <button
              class="btn danger"
              @click="remove(idx)"
              :aria-label="t('socialMediaDelete') + ' ' + (idx + 1)">
              {{ t('socialMediaDelete') }}
            </button>
          </div>
        </div>
      </div>
    </OsCard>
    <OsCard class="mt-3" :title="t('obsIntegration')">
      <div class="form-group">
        <div class="flex flex-wrap items-center gap-3">
          <span class="label mb-0">{{ t('socialMediaWidgetUrlLabel') }}</span>
          <CopyField :value="widgetUrl" :aria-label="t('socialMediaWidgetUrlLabel')" secret />
        </div>
      </div>
    </OsCard>

    <div v-if="editingStyleIndex !== null" class="sm-modal-overlay" role="dialog" aria-modal="true">
      <div class="sm-modal">
        <h3 class="sm-modal-title">{{ t('socialMediaStyleTitle') }}</h3>
        <div class="sm-grid">
          <div class="grid grid-cols-2 gap-4">
            <div class="sm-form-group">
              <label class="sm-label">{{ t('socialMediaBgColor') }}</label>
              <div class="flex gap-2">
                <input class="input h-10 w-12 p-1" type="color" v-model="styleForm.bgColor" />
                <input
                  class="input h-10 flex-1 min-w-0"
                  type="text"
                  v-model="styleForm.bgColor"
                  maxlength="7" />
              </div>
            </div>
            <div class="sm-form-group">
              <label class="sm-label">{{ t('socialMediaTextColor') }}</label>
              <div class="flex gap-2">
                <input class="input h-10 w-12 p-1" type="color" v-model="styleForm.textColor" />
                <input
                  class="input h-10 flex-1 min-w-0"
                  type="text"
                  v-model="styleForm.textColor"
                  maxlength="7" />
              </div>
            </div>
            <div class="sm-form-group">
              <label class="sm-label">{{ t('socialMediaLinkColor') }}</label>
              <div class="flex gap-2">
                <input class="input h-10 w-12 p-1" type="color" v-model="styleForm.linkColor" />
                <input
                  class="input h-10 flex-1 min-w-0"
                  type="text"
                  v-model="styleForm.linkColor"
                  maxlength="7" />
              </div>
            </div>
            <div class="sm-form-group">
              <label class="sm-label">{{ t('socialMediaBorderColor') }}</label>
              <div class="flex gap-2">
                <input class="input h-10 w-12 p-1" type="color" v-model="styleForm.borderColor" />
                <input
                  class="input h-10 flex-1 min-w-0"
                  type="text"
                  v-model="styleForm.borderColor"
                  maxlength="7" />
              </div>
            </div>
          </div>

          <div class="flex flex-row items-center gap-2 justify-start mt-2 mb-2">
            <input
              type="checkbox"
              id="sm-gradient"
              v-model="styleForm.useGradient"
              class="switch" />
            <label for="sm-gradient" class="sm-label mb-0 cursor-pointer select-none">{{
              t('socialMediaGradient')
            }}</label>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="sm-form-group" v-if="styleForm.useGradient">
              <label class="sm-label">{{ t('socialMediaGradientTo') }}</label>
              <div class="flex gap-2">
                <input class="input h-10 w-12 p-1" type="color" v-model="styleForm.gradientTo" />
                <input
                  class="input h-10 flex-1 min-w-0"
                  type="text"
                  v-model="styleForm.gradientTo"
                  maxlength="7" />
              </div>
            </div>
          </div>
        </div>
        <div class="flex gap-2 mt-4 justify-end">
          <button class="btn-secondary" @click="resetStyle">
            {{ t('socialMediaReset') }}
          </button>
          <div class="flex-1"></div>
          <button class="btn-secondary" @click="editingStyleIndex = null">
            {{ t('commonCancel') || 'Cancel' }}
          </button>
          <button class="btn" @click="saveStyle">
            {{ t('commonSave') || 'Save' }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
<script setup>
import { ref, onMounted, computed, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../services/api';
import { pushToast } from '../services/toast';
import { useDirty } from '../composables/useDirtyRegistry';
import CopyField from './shared/CopyField.vue';
import OsCard from './os/OsCard.vue';
import { isHttpUrl, MAX_CUSTOM_ICON_SIZE } from '../utils/validation';
import { useWalletSession } from '../composables/useWalletSession';
import { usePublicToken } from '../composables/usePublicToken';

const { t } = useI18n();

const items = ref([]);
const rowErrors = ref({});
const dirty = ref(false);
const saving = ref(false);

const editingStyleIndex = ref(null);
const styleForm = reactive({
  bgColor: '#ffffff',
  textColor: '#000000',
  linkColor: '#00ff7f',
  borderColor: '#000000',
  useGradient: false,
  gradientTo: '#ffffff',
});

const wallet = useWalletSession();
const { withToken, refresh } = usePublicToken();
const widgetUrl = computed(() => withToken(`${location.origin}/widgets/socialmedia`));

function markDirty() {
  dirty.value = true;
}
useDirty(() => dirty.value, t('socialMediaModule') || 'Social Media');

async function load() {
  try {
    const r = await api.get('/api/socialmedia-config');
    if (r.data.success) {
      items.value = r.data.config.map((c) => ({ ...c }));
      dirty.value = false;
    } else {
      pushToast({ type: 'error', message: t('socialMediaLoadFailed') });
    }
  } catch {
    pushToast({ type: 'error', message: t('socialMediaLoadFailed') });
  }
}

function addItem() {
  items.value.push({
    name: '',
    icon: 'x',
    link: '',
    customIcon: undefined,
    bgColor: '',
    textColor: '',
    linkColor: '',
    borderColor: '',
    useGradient: false,
    gradientTo: '',
  });
  validateRow(items.value.length - 1);
  markDirty();
}
function remove(i) {
  items.value.splice(i, 1);
  rowErrors.value = {};
  items.value.forEach((_, idx) => validateRow(idx));
  markDirty();
}
function onIconChange(item) {
  if (item.icon !== 'custom') {
    delete item.customIcon;
  }
  markDirty();
}
function selectCustomIcon(e, item) {
  const file = e.target.files?.[0];
  if (!file) return;
  if (file.size > MAX_CUSTOM_ICON_SIZE) {
    return pushToast({ type: 'error', message: t('socialMediaCustomIconTooLarge') });
  }
  const reader = new FileReader();
  reader.onload = (ev) => {
    item.customIcon = ev.target.result;
    markDirty();
  };
  reader.readAsDataURL(file);
}

function openStyleEditor(idx) {
  const item = items.value[idx];
  if (!item) return;
  editingStyleIndex.value = idx;
  styleForm.bgColor = item.bgColor || '#ffffff';
  styleForm.textColor = item.textColor || '#000000';
  styleForm.linkColor = item.linkColor || '#00ff7f';
  styleForm.borderColor = item.borderColor || '#000000';
  styleForm.useGradient = !!item.useGradient;
  styleForm.gradientTo = item.gradientTo || '#ffffff';
}

function saveStyle() {
  if (editingStyleIndex.value === null) return;
  const item = items.value[editingStyleIndex.value];
  if (item) {
    item.bgColor = styleForm.bgColor;
    item.textColor = styleForm.textColor;
    item.linkColor = styleForm.linkColor;
    item.borderColor = styleForm.borderColor;
    item.useGradient = styleForm.useGradient;
    item.gradientTo = styleForm.gradientTo;
    markDirty();
  }
  editingStyleIndex.value = null;
}

function resetStyle() {
  styleForm.bgColor = '#ffffff';
  styleForm.textColor = '#000000';
  styleForm.linkColor = '#00ff7f';
  styleForm.borderColor = '#000000';
  styleForm.useGradient = false;
  styleForm.gradientTo = '#ffffff';
}

function validateRow(i) {
  const it = items.value[i];
  if (!it) return;
  if (!rowErrors.value[i]) rowErrors.value[i] = {};
  rowErrors.value[i].name = it.name.trim() ? '' : t('socialMediaNameRequired');
  rowErrors.value[i].link = it.link.trim() ? '' : t('socialMediaLinkRequired');
  if (it.link && !isHttpUrl(it.link)) rowErrors.value[i].link = t('socialMediaInvalidUrl');
  markDirty();
}
function fieldError(i, field) {
  return rowErrors.value[i]?.[field] || '';
}

function mapBackendError(msg) {
  if (!msg) return t('socialMediaValidationError');
  if (/Too many items/i.test(msg)) return t('socialMediaTooMany');
  if (/name is required/i.test(msg)) return t('socialMediaNameRequired');
  if (/name is too long/i.test(msg)) return t('socialMediaNameTooLong');
  if (/link is required/i.test(msg)) return t('socialMediaLinkRequired');
  if (/link is too long/i.test(msg)) return t('socialMediaLinkTooLong');
  if (/valid HTTPS/i.test(msg)) return t('socialMediaInvalidHttps');
  if (/valid URL/i.test(msg)) return t('socialMediaInvalidUrl');
  if (/customIcon must be a data:image/i.test(msg)) return t('socialMediaCustomIconInvalid');
  if (/customIcon is too large/i.test(msg)) return t('socialMediaCustomIconTooLarge');
  return t('socialMediaValidationError');
}

async function save() {
  rowErrors.value = {};
  items.value.forEach((_, i) => validateRow(i));
  const hasErr = Object.values(rowErrors.value).some((r) => r.name || r.link);
  if (hasErr) {
    pushToast({ type: 'error', message: t('socialMediaValidationError') });
    return;
  }
  try {
    saving.value = true;
    const payload = {
      config: items.value.map((i) => ({
        name: i.name,
        icon: i.icon,
        link: i.link,
        bgColor: i.bgColor,
        textColor: i.textColor,
        linkColor: i.linkColor,
        borderColor: i.borderColor,
        useGradient: i.useGradient,
        gradientTo: i.gradientTo,
        ...(i.icon === 'custom' && i.customIcon ? { customIcon: i.customIcon } : {}),
      })),
    };
    const r = await api.post('/api/socialmedia-config', payload);
    if (r.data.success) {
      pushToast({ type: 'success', message: t('socialMediaSaved') });
      dirty.value = false;
      await load();
    } else {
      pushToast({ type: 'error', message: mapBackendError(r.data.error) });
    }
  } catch (e) {
    const msg = e.response?.data?.error;
    pushToast({ type: 'error', message: mapBackendError(msg) });
  } finally {
    saving.value = false;
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
.sm-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(2px);
}
.sm-modal {
  background: var(--card-bg, #fff);
  border: 1px solid var(--card-border, #e4e4e7);
  border-radius: 12px;
  padding: 24px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
}
.sm-modal-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--text-primary, #111);
}
.sm-grid {
  display: grid;
  gap: 1rem;
}
.sm-form-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.sm-label {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.025em;
  color: var(--text-secondary, #71717a);
}
</style>
