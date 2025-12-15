<template>
  <div class="p-4 border border-[var(--card-border)] rounded-md bg-[var(--bg-card)] mt-6">
    <h3 class="text-lg font-semibold mb-4">{{ t('twoFactor.title') }}</h3>

    <div v-if="loading">{{ t('loading') || 'Loading...' }}</div>

    <div v-else-if="enabled">
      <div class="flex items-center gap-2 text-green-500 mb-4">
        <i class="pi pi-check-circle"></i>
        <span>{{ t('twoFactor.enabled') }}</span>
      </div>

      <button @click="startDisable" class="btn btn-danger" v-if="!showDisableForm">
        {{ t('twoFactor.disableBtn') }}
      </button>

      <div v-if="showDisableForm" class="mt-4">
        <p class="mb-2">{{ t('twoFactor.disablePrompt') }}</p>
        <input
          v-model="code"
          type="text"
          placeholder="000000"
          class="input input-bordered mb-2"
          maxlength="6" />
        <div class="flex gap-2">
          <button @click="confirmDisable" class="btn btn-danger" :disabled="!code">
            {{ t('twoFactor.confirmDisableBtn') }}
          </button>
          <button @click="showDisableForm = false" class="btn btn-secondary">
            {{ t('twoFactor.cancelBtn') }}
          </button>
        </div>
        <p v-if="error" class="text-red-500 mt-2">{{ error }}</p>
      </div>
    </div>

    <div v-else>
      <p class="mb-4">{{ t('twoFactor.description') }}</p>

      <div v-if="!setupData">
        <button @click="startSetup" class="btn btn-primary">{{ t('twoFactor.enableBtn') }}</button>
      </div>

      <div v-else class="mt-4">
        <div class="mb-4">
          <p class="font-semibold mb-2">
            {{ t('twoFactor.scanQr') }}
          </p>
          <img :src="setupData.qrCodeUrl" alt="QR Code" class="border p-2 bg-white rounded" />
          <p class="text-sm mt-2 text-gray-500">
            {{ t('twoFactor.manualSecret') }}
            <code class="bg-gray-100 px-1 rounded text-black">{{ setupData.secret }}</code>
          </p>
        </div>

        <div class="mb-4">
          <p class="font-semibold mb-2">{{ t('twoFactor.enterCode') }}</p>
          <input
            v-model="code"
            type="text"
            placeholder="000000"
            class="input input-bordered"
            maxlength="6" />
        </div>

        <div class="flex gap-2">
          <button @click="confirmEnable" class="btn btn-primary" :disabled="!code">
            {{ t('twoFactor.verifyEnableBtn') }}
          </button>
          <button @click="setupData = null" class="btn btn-secondary">
            {{ t('twoFactor.cancelBtn') }}
          </button>
        </div>
        <p v-if="error" class="text-red-500 mt-2">{{ error }}</p>
      </div>
    </div>

    <div
      v-if="backupCodes.length > 0"
      class="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700/50">
      <div class="flex items-start gap-3 mb-4">
        <i
          class="pi pi-exclamation-triangle text-yellow-600 dark:text-yellow-500 text-xl mt-0.5"></i>
        <div>
          <h4 class="font-bold text-yellow-800 dark:text-yellow-400 mb-1">
            {{ t('twoFactor.backupCodesTitle') }}
          </h4>
          <p class="text-sm text-yellow-700 dark:text-yellow-300/90 leading-relaxed">
            {{ t('twoFactor.backupCodesDesc') }}
          </p>
        </div>
      </div>

      <div
        class="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 font-mono text-sm mb-6">
        <div
          v-for="bc in backupCodes"
          :key="bc"
          class="bg-white dark:bg-black/40 border border-yellow-200 dark:border-yellow-800/50 p-2 text-center rounded text-yellow-900 dark:text-yellow-200 select-all hover:bg-yellow-50 dark:hover:bg-yellow-900/30 transition-colors text-xs sm:text-sm">
          {{ bc }}
        </div>
      </div>

      <div class="flex justify-end w-full">
        <button
          @click="backupCodes = []"
          class="w-full sm:w-auto justify-center px-4 py-2 bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900/40 dark:hover:bg-yellow-900/60 text-yellow-800 dark:text-yellow-200 rounded-md text-sm font-medium transition-colors flex items-center gap-2">
          <i class="pi pi-check"></i>
          {{ t('twoFactor.savedBackupCodesBtn') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const enabled = ref(false);
const loading = ref(true);
const showDisableForm = ref(false);
const setupData = ref(null);
const code = ref('');
const error = ref('');
const backupCodes = ref([]);

const fetchStatus = async () => {
  try {
    const res = await fetch('/api/auth/2fa/status');
    const data = await res.json();
    enabled.value = data.enabled;
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
};

const startSetup = async () => {
  error.value = '';
  try {
    const res = await fetch('/api/auth/2fa/setup', { method: 'POST' });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    setupData.value = data;
  } catch (e) {
    error.value = e.message;
  }
};

const confirmEnable = async () => {
  error.value = '';
  try {
    const res = await fetch('/api/auth/2fa/enable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setupToken: setupData.value.setupToken, code: code.value }),
    });
    const data = await res.json();
    if (data.success) {
      enabled.value = true;
      setupData.value = null;
      code.value = '';
      backupCodes.value = data.backupCodes;
    } else {
      error.value = data.error || 'Verification failed';
    }
  } catch (e) {
    error.value = e.message;
  }
};

const startDisable = () => {
  showDisableForm.value = true;
  code.value = '';
  error.value = '';
};

const confirmDisable = async () => {
  error.value = '';
  try {
    const res = await fetch('/api/auth/2fa/disable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.value }),
    });
    const data = await res.json();
    if (data.success) {
      enabled.value = false;
      showDisableForm.value = false;
      code.value = '';
    } else {
      error.value = data.error || 'Verification failed';
    }
  } catch (e) {
    error.value = e.message;
  }
};

onMounted(fetchStatus);
</script>
