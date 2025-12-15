<template>
  <div class="p-4 border border-[var(--card-border)] rounded-md bg-[var(--bg-card)] h-fit">
    <h3 class="text-lg font-semibold mb-4">{{ t('twoFactor.tutorial.title') }}</h3>

    <div class="space-y-4 text-sm">
      <div>
        <h4 class="font-semibold mb-1">{{ t('twoFactor.tutorial.howToTitle') }}</h4>
        <ol class="list-decimal list-inside space-y-1">
          <li>{{ t('twoFactor.tutorial.step1') }}</li>
          <li>{{ t('twoFactor.tutorial.step2') }}</li>
          <li>{{ t('twoFactor.tutorial.step3') }}</li>
          <li>{{ t('twoFactor.tutorial.step4') }}</li>
        </ol>
      </div>

      <div>
        <h4 class="font-semibold mb-1">{{ t('twoFactor.tutorial.appsTitle') }}</h4>
        <p class="mb-2">
          {{ t('twoFactor.tutorial.appsDesc') }}
        </p>
        <ul class="list-disc list-inside space-y-1">
          <li>
            <a
              href="https://authy.com/"
              target="_blank"
              style="color: #f44336; font-weight: 600"
              class="hover:underline"
              >Authy</a
            >
            - {{ t('twoFactor.tutorial.appAuthyDesc') }}
          </li>
          <li>
            <a
              href="https://bitwarden.com/products/authenticator/"
              target="_blank"
              style="color: #f44336; font-weight: 600"
              class="hover:underline"
              >Bitwarden</a
            >
            - {{ t('twoFactor.tutorial.appBitwardenDesc') }}
          </li>
          <li>
            <a
              href="https://ente.io/auth/"
              target="_blank"
              style="color: #f44336; font-weight: 600"
              class="hover:underline"
              >Ente Auth</a
            >
            - {{ t('twoFactor.tutorial.appEnteDesc') }}
          </li>
        </ul>
      </div>

      <div class="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded">
        <h4 class="font-semibold text-yellow-600 dark:text-yellow-500 mb-1">
          <i class="pi pi-exclamation-triangle mr-1"></i>
          {{ t('twoFactor.tutorial.backupTitle') }}
        </h4>
        <i18n-t keypath="twoFactor.tutorial.backupDesc" tag="p">
          <template #important>
            <strong>{{ t('twoFactor.tutorial.backupDescImportant') }}</strong>
          </template>
        </i18n-t>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
</script>
