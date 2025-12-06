<template>
  <section class="admin-tab active" role="form">
    <BlockedState v-if="isBlocked" :module-name="t('lastTipModule')" :details="blockDetails" />

    <div v-else>
      <OsCard class="mb-4">
        <div class="form-group">
          <label class="label" for="last-tip-title">{{ t('lastTipCustomTitleLabel') }}</label>
          <input
            class="input"
            :class="{ 'input-error': errors.title }"
            id="last-tip-title"
            v-model="form.title"
            type="text"
            maxlength="120"
            :placeholder="t('lastTipCustomTitlePlaceholder')" />
          <div class="flex gap-2 small justify-between">
            <small>{{ errors.title || t('lastTipCustomTitleHint') }}</small>
            <small aria-live="polite" aria-atomic="true">{{
              t('charsUsed', { used: form.title.length, max: 120 })
            }}</small>
          </div>
        </div>
        <div class="form-group mt-2">
          <label class="label" for="wallet-address">{{ t('arWalletAddress') }}</label>
          <input
            class="input"
            :class="{ 'input-error': errors.walletAddress }"
            id="wallet-address"
            v-model="form.walletAddress"
            :disabled="!walletEditable"
            type="text" />
          <small v-if="errors.walletAddress" class="small text-red-700">{{
            errors.walletAddress
          }}</small>
          <small v-else class="small opacity-70">{{ t(walletHintKey) }}</small>
          <small v-if="walletHiddenMsg" class="small opacity-70">{{ walletHiddenMsg }}</small>
        </div>
        <div class="mt-3">
          <div class="flex justify-between items-center mb-2">
            <h3 class="os-card-title mb-0">{{ t('colorCustomizationTitle') }}</h3>
          </div>
          <div class="flex flex-wrap gap-2">
            <ColorInput
              v-for="c in colorFields"
              :key="c.key"
              v-model="form.colors[c.key]"
              :label="t(c.label)" />
          </div>
        </div>
        <div class="mt-3">
          <button
            class="btn"
            :disabled="saving"
            @click="save"
            :aria-busy="saving ? 'true' : 'false'">
            {{ saving ? t('commonSaving') : t('saveSettings') }}
          </button>
          <button
            type="button"
            class="btn btn-secondary btn-compact-secondary ml-2"
            @click="resetColors"
            :aria-label="t('resetColors')">
            {{ t('resetColors') }}
          </button>
        </div>
      </OsCard>
      <OsCard class="mt-4">
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
            <span class="label mb-0">{{ t('lastTipWidgetUrl') }}</span>
            <CopyField :value="widgetUrl" :aria-label="t('lastTipWidgetUrl')" secret />
          </div>
        </div>
      </OsCard>
    </div>
  </section>
</template>
<script setup>
import { reactive, computed, onMounted, watch, ref } from 'vue';
import { useDirty } from '../composables/useDirtyRegistry';
import { useI18n } from 'vue-i18n';
import api from '../services/api';
import ColorInput from './shared/ColorInput.vue';
import CopyField from './shared/CopyField.vue';
import BlockedState from './shared/BlockedState.vue';
import { pushToast } from '../services/toast';
import { MAX_TITLE_LEN, isArweaveAddress } from '../utils/validation';
import { useWalletSession } from '../composables/useWalletSession';
import { usePublicToken } from '../composables/usePublicToken';
import OsCard from './os/OsCard.vue';
import HeaderIcon from './shared/HeaderIcon.vue';

const original = reactive({ snapshot: null });
const isBlocked = ref(false);
const blockDetails = ref({});

const { t } = useI18n();
const form = reactive({
  title: '',
  walletAddress: '',
  colors: {
    bg: '#080c10',
    font: '#ffffff',
    border: '#00ff7f',
    amount: '#00ff7f',
    iconBg: '#4f36ff',
    from: '#817ec8',
  },
});
const errors = reactive({ title: '', walletAddress: '' });
const saving = ref(false);
const hostedSupported = ref(false);
const sessionActive = ref(false);
const walletHiddenMsg = ref('');
const walletEditable = ref(true);
const colorFields = [
  { key: 'bg', label: 'colorBg' },
  { key: 'font', label: 'colorFont' },
  { key: 'border', label: 'colorBorder' },
  { key: 'amount', label: 'colorAmount' },
  { key: 'iconBg', label: 'colorIconBg' },
  { key: 'from', label: 'colorFrom' },
];
const wallet = useWalletSession();
const sessionWalletAddress = computed(() => (wallet.address.value || '').trim());
const { withToken, refresh } = usePublicToken();
const widgetUrl = computed(() => withToken(`${location.origin}/widgets/last-tip`));
const autoInjected = ref(false);
const walletHintKey = computed(() =>
  autoInjected.value ? 'walletSessionPrefillCombinedHint' : 'walletClearHint'
);

function resetColors() {
  form.colors = {
    bg: '#080c10',
    font: '#ffffff',
    border: '#00ff7f',
    amount: '#00ff7f',
    iconBg: '#4f36ff',
    from: '#817ec8',
  };
}
async function load() {
  try {
    hostedSupported.value = true;
    sessionActive.value = wallet.hasSession.value;

    const { data } = await api.get('/api/last-tip');
    if (data && data.success) {
      const hasWalletField = Object.prototype.hasOwnProperty.call(data, 'walletAddress');
      if (hasWalletField) {
        form.walletAddress = data.walletAddress || '';
        walletEditable.value = true;
        if (data.__sessionInjected && form.walletAddress) {
          walletHiddenMsg.value = t('walletSessionPrefillNotice');
          autoInjected.value = true;
        } else {
          walletHiddenMsg.value = '';
          autoInjected.value = false;
        }
      } else {
        if (hostedSupported.value && !sessionActive.value) {
          walletHiddenMsg.value = t('walletHiddenHostedNotice');
        } else if (!hostedSupported.value) {
          walletHiddenMsg.value = t('walletHiddenLocalNotice');
        } else {
          walletHiddenMsg.value = '';
        }
        form.walletAddress = '';
        walletEditable.value = false;
      }

      const incomingTitle = typeof data.title === 'string' ? data.title.trim() : undefined;
      if (typeof incomingTitle === 'string') {
        form.title = incomingTitle;
      }
      if (typeof data.bgColor === 'string') form.colors.bg = data.bgColor;
      if (typeof data.fontColor === 'string') form.colors.font = data.fontColor;
      if (typeof data.borderColor === 'string') form.colors.border = data.borderColor;
      if (typeof data.amountColor === 'string') form.colors.amount = data.amountColor;
      if (typeof data.iconBgColor === 'string') form.colors.iconBg = data.iconBgColor;
      if (typeof data.fromColor === 'string') form.colors.from = data.fromColor;
      original.snapshot = JSON.stringify(form);
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
    } else if (!(e.response && e.response.status === 404)) {
      pushToast({ type: 'error', message: t('loadFailedLastTip') });
    }
  }

  if (!form.walletAddress && sessionWalletAddress.value) {
    form.walletAddress = sessionWalletAddress.value;
    walletEditable.value = true;
    walletHiddenMsg.value = t('walletSessionPrefillNotice');
    autoInjected.value = true;
  }

  if (!original.snapshot) {
    original.snapshot = JSON.stringify(form);
  }
}
async function save() {
  if (hostedSupported.value && !sessionActive.value) {
    pushToast({ type: 'info', message: t('sessionRequiredToast') });
    return;
  }
  if (!validate()) return;
  try {
    saving.value = true;
    const payload = {
      title: form.title,
      walletAddress: form.walletAddress,
      bgColor: form.colors.bg,
      fontColor: form.colors.font,
      borderColor: form.colors.border,
      amountColor: form.colors.amount,
      iconBgColor: form.colors.iconBg,
      fromColor: form.colors.from,
    };
    await api.post('/api/last-tip', payload);
    original.snapshot = JSON.stringify(form);
    pushToast({ type: 'success', message: t('savedLastTip') });
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
    pushToast({ type: 'error', message: t('saveFailedLastTip') });
  } finally {
    saving.value = false;
  }
}

function validate() {
  errors.title = '';
  errors.walletAddress = '';
  if (form.title.length > MAX_TITLE_LEN) {
    errors.title = t('titleTooLong');
  }
  if (form.walletAddress && !isArweaveAddress(form.walletAddress)) {
    errors.walletAddress = t('invalidWalletAddress');
  }
  return !errors.title && !errors.walletAddress;
}

function isLastTipDirty() {
  return original.snapshot && original.snapshot !== JSON.stringify(form);
}
useDirty(isLastTipDirty, t('lastTipModule') || 'Last Tip');
watch(form, () => {}, { deep: true });

watch(
  () => form.walletAddress,
  (current, previous) => {
    if (!autoInjected.value) return;
    if (current && sessionWalletAddress.value && current.trim() === sessionWalletAddress.value) {
      return;
    }
    if (previous === undefined) return;
    autoInjected.value = false;
    if (walletHiddenMsg.value === t('walletSessionPrefillNotice')) {
      walletHiddenMsg.value = '';
    }
  }
);

watch(
  () => sessionWalletAddress.value,
  (addr) => {
    const next = (addr || '').trim();
    if (!next) return;
    if (autoInjected.value || !form.walletAddress) {
      form.walletAddress = next;
      walletEditable.value = true;
      walletHiddenMsg.value = t('walletSessionPrefillNotice');
      autoInjected.value = true;
      original.snapshot = JSON.stringify(form);
    }
  }
);

onMounted(async () => {
  try {
    await wallet.refresh();
    await refresh();
  } catch {}
  await load();
});
</script>
