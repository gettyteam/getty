<template>
  <section class="admin-tab active relative">
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

    <div class="grid gap-4 lg:grid-cols-2">
      <OsCard>
        <form @submit.prevent="save" action="#">
          <input
            type="text"
            name="username"
            autocomplete="username"
            style="position: absolute; opacity: 0; pointer-events: none; width: 0; height: 0" />
          <div class="flex items-center gap-2 mb-4">
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
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
            </span>
            <h3 class="font-semibold text-[15px]">{{ t('tipNotificationsTitle') }}</h3>
          </div>

          <div
            class="flex items-start gap-3 p-3 mb-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 text-blue-700 dark:text-blue-300">
            <svg
              class="w-5 h-5 shrink-0 mt-0.5 opacity-80"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            <div class="text-sm font-medium leading-relaxed">
              {{ t('externalSecretLegend', { mask: MASK }) }}
            </div>
          </div>

          <div class="form-group discord-override">
            <label class="label">{{ t('externalDiscordWebhook') }}</label>
            <div class="input-group">
              <input
                class="input"
                id="discordWebhook"
                name="discordWebhook"
                :class="{ 'input-error': errors.discordWebhook }"
                :type="reveal.discord ? 'text' : 'password'"
                v-model="form.discordWebhook"
                placeholder="https://discord.com/api/webhooks/..."
                @input="validate"
                autocomplete="new-password" />
              <EyeToggle
                :shown="reveal.discord"
                :hide-label="t('secretHide')"
                :show-label="t('secretShow')"
                @toggle="
                  async (next) => {
                    if (next && form.discordWebhook === MASK) {
                      await revealSecret('discordWebhook');
                    }
                    reveal.discord = next;
                  }
                " />
            </div>
            <small v-if="errors.discordWebhook" class="small text-red-700">{{
              errors.discordWebhook
            }}</small>
          </div>
          <div class="form-group grid mt-4 grid-cols-2 gap-3">
            <div>
              <label class="label">{{ t('externalTelegramBotToken') }}</label>
              <div class="input-group">
                <input
                  class="input"
                  id="telegramBotToken"
                  name="telegramBotToken"
                  :class="{ 'input-error': errors.telegramBotToken }"
                  :type="reveal.telegram ? 'text' : 'password'"
                  v-model="form.telegramBotToken"
                  placeholder="123456:ABCDEF"
                  @input="validate"
                  autocomplete="new-password" />
                <EyeToggle
                  :shown="reveal.telegram"
                  :hide-label="t('secretHideGeneric') || t('secretHide')"
                  :show-label="t('secretShowGeneric') || t('secretShow')"
                  @toggle="
                    async (next) => {
                      if (next && form.telegramBotToken === MASK) {
                        await revealSecret('telegramBotToken');
                      }
                      reveal.telegram = next;
                    }
                  " />
              </div>
              <small v-if="errors.telegramBotToken" class="small text-red-700">{{
                errors.telegramBotToken
              }}</small>
            </div>
            <div>
              <label class="label">{{ t('externalTelegramChatId') }}</label>
              <div class="input-group">
                <input
                  class="input"
                  id="telegramChatId"
                  name="telegramChatId"
                  :class="{ 'input-error': errors.telegramChatId }"
                  :type="reveal.telegramChatId ? 'text' : 'password'"
                  v-model="form.telegramChatId"
                  placeholder="-1001234567890"
                  @input="validate"
                  autocomplete="new-password" />
                <EyeToggle
                  :shown="reveal.telegramChatId"
                  :hide-label="t('secretHideGeneric') || t('secretHide')"
                  :show-label="t('secretShowGeneric') || t('secretShow')"
                  @toggle="
                    async (next) => {
                      if (next && form.telegramChatId === MASK) {
                        await revealSecret('telegramChatId');
                      }
                      reveal.telegramChatId = next;
                    }
                  " />
              </div>
              <small v-if="errors.telegramChatId" class="small text-red-700">{{
                errors.telegramChatId
              }}</small>
            </div>
          </div>
          <div class="form-group mt-4">
            <label class="label">{{ t('externalTemplate') }}</label>
            <textarea
              class="input"
              rows="3"
              maxlength="120"
              style="height: 80px; resize: none"
              v-model="form.template"></textarea>
            <small class="small">{{ templateHint }}</small>
          </div>
          <div
            class="flex gap-2 items-center"
            role="group"
            aria-label="External notifications actions">
            <button
              type="submit"
              class="btn"
              :disabled="!dirty || hasErrors || saving || masked"
              :aria-busy="saving ? 'true' : 'false'">
              {{ saving ? t('commonSaving') : t('externalSave') }}
            </button>
            <span
              class="small"
              :class="statusActive ? 'text-green-600' : 'text-gray-500'"
              :aria-live="dirty ? 'polite' : 'off'"
              >{{ statusActive ? t('externalStatusActive') : t('externalStatusInactive') }}</span
            >
          </div>
        </form>
      </OsCard>

      <OsCard>
        <form @submit.prevent="saveObs" action="#">
          <input
            type="text"
            name="username"
            autocomplete="username"
            style="position: absolute; opacity: 0; pointer-events: none; width: 0; height: 0" />
          <div class="flex items-center gap-2 mb-4">
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
            <h3 class="font-semibold text-[15px]">{{ t('obsWsIpLabel') }}</h3>
          </div>
          <div class="form-group">
            <label class="label" for="obs-ws-ip">{{ t('obsWsIpLabel') }}</label>
            <div class="input-group">
              <input
                class="input"
                id="obs-ws-ip"
                name="obsIp"
                :type="reveal.obsIp ? 'text' : 'password'"
                v-model="obsForm.ip"
                :placeholder="t('obsWsIpPlaceholder')"
                @input="validateObs"
                autocomplete="new-password" />
              <button
                type="button"
                @click="reveal.obsIp = !reveal.obsIp"
                :aria-pressed="reveal.obsIp ? 'true' : 'false'"
                :aria-label="reveal.obsIp ? 'Hide' : 'Show'">
                <svg
                  v-if="!reveal.obsIp"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="#fff"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round">
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <svg
                  v-else
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="#fff"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round">
                  <path
                    d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.77 21.77 0 0 1 5.06-6.94" />
                  <path d="M1 1l22 22" />
                  <path d="M9.88 9.88A3 3 0 0 0 12 15a3 3 0 0 0 3-3 3 3 0 0 0-.24-1.17" />
                </svg>
              </button>
            </div>
            <label class="label mt-2" for="obs-ws-port">{{ t('obsWsPortLabel') }}</label>
            <input
              class="input"
              id="obs-ws-port"
              type="number"
              v-model="obsForm.port"
              :placeholder="t('obsWsPortPlaceholder')"
              @input="validateObs" />
            <label class="label mt-2" for="obs-ws-password">{{ t('obsWsPasswordLabel') }}</label>
            <div class="input-group">
              <input
                class="input"
                id="obs-ws-password"
                name="obsPassword"
                :type="reveal.obsPwd ? 'text' : 'password'"
                v-model="obsForm.password"
                :placeholder="t('obsWsPasswordPlaceholder')"
                @input="validateObs"
                autocomplete="new-password" />
              <button
                type="button"
                @click="reveal.obsPwd = !reveal.obsPwd"
                :aria-pressed="reveal.obsPwd ? 'true' : 'false'"
                :aria-label="reveal.obsPwd ? 'Hide' : 'Show'">
                <svg
                  v-if="!reveal.obsPwd"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="#fff"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round">
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <svg
                  v-else
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="#fff"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round">
                  <path
                    d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.77 21.77 0 0 1 5.06-6.94" />
                  <path d="M1 1l22 22" />
                  <path d="M9.88 9.88A3 3 0 0 0 12 15a3 3 0 0 0 3-3 3 3 0 0 0-.24-1.17" />
                </svg>
              </button>
            </div>
            <small v-if="obsErrors.ip || obsErrors.port" class="small text-red-700">
              {{ obsErrors.ip || obsErrors.port }}
            </small>
            <button
              type="submit"
              class="btn mt-2"
              :disabled="!obsDirty || hasObsErrors || obsSaving || masked"
              :aria-busy="obsSaving ? 'true' : 'false'">
              <span v-if="obsSaving">{{ t('commonSaving') }}</span>
              <span v-else>{{ t('saveObsWsSettings') }}</span>
            </button>
          </div>
        </form>
      </OsCard>
    </div>

    <div class="grid gap-4 lg:grid-cols-2 mt-4">
      <OsCard>
        <form @submit.prevent="saveChannelUpload" action="#">
          <input
            type="text"
            name="username"
            autocomplete="username"
            style="position: absolute; opacity: 0; pointer-events: none; width: 0; height: 0" />
          <div class="flex items-center gap-2 mb-4">
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
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </span>
            <h3 class="font-semibold text-[15px]">{{ t('channelUploadTitle') }}</h3>
          </div>
          <p class="small opacity-80 mb-4">{{ t('channelUploadDescription') }}</p>

          <div class="form-group">
            <label class="label">{{ t('channelUploadDiscordLabel') }}</label>
            <div class="input-group">
              <input
                class="input"
                id="channelDiscordWebhook"
                name="channelDiscordWebhook"
                :class="{ 'input-error': channelErrors.discordWebhook }"
                :type="reveal.channelUpload ? 'text' : 'password'"
                v-model="channelForm.discordWebhook"
                placeholder="https://discord.com/api/webhooks/..."
                autocomplete="new-password"
                @input="validateChannelUpload" />
              <EyeToggle
                :shown="reveal.channelUpload"
                :hide-label="t('secretHideGeneric') || t('secretHide')"
                :show-label="t('secretShowGeneric') || t('secretShow')"
                @toggle="
                  async (next) => {
                    if (next && channelForm.discordWebhook === MASK) {
                      await revealSecret('channelUploadDiscordWebhook');
                    }
                    reveal.channelUpload = next;
                  }
                " />
            </div>
            <small v-if="channelErrors.discordWebhook" class="small text-red-700">
              {{ channelErrors.discordWebhook }}
            </small>
          </div>

          <div class="form-group mt-4">
            <label class="label">{{ t('channelUploadClaimLabel') }}</label>
            <input
              class="input"
              :class="{ 'input-error': channelErrors.channelClaimId }"
              v-model="channelForm.channelClaimId"
              placeholder="b6f0a7..."
              @input="validateChannelUpload" />
            <small class="small opacity-80">{{ t('channelUploadClaimHint') }}</small>
            <small v-if="channelErrors.channelClaimId" class="small text-red-700">
              {{ channelErrors.channelClaimId }}
            </small>
          </div>

          <div class="mt-3 flex items-center gap-3 flex-wrap">
            <button
              type="submit"
              class="btn"
              :disabled="!channelDirty || channelSaving || channelHasErrors || masked">
              {{ channelSaving ? t('commonSaving') : t('externalSave') }}
            </button>
            <span class="small" :class="channelStatus.active ? 'text-green-600' : 'opacity-70'">
              {{
                channelStatus.active
                  ? t('channelUploadStatusActive')
                  : t('channelUploadStatusInactive')
              }}
            </span>
          </div>
          <div
            class="mt-3 rounded-lg border border-dashed border-gray-200 dark:border-white/10 p-3 bg-white/40 dark:bg-white/5"
            v-if="
              channelStatus.lastTitle ||
              channelStatus.lastPublishedAt ||
              channelStatus.lastUrl ||
              channelStatus.sentCount
            ">
            <div class="text-sm font-medium truncate">
              {{
                channelStatus.lastTitle
                  ? t('channelUploadLastSent', { title: channelStatus.lastTitle })
                  : t('channelUploadNoHistory')
              }}
            </div>
            <div class="channel-upload-meta opacity-70 mt-1" v-if="channelStatus.lastPublishedAt">
              {{
                t('channelUploadLastPublished', {
                  date: formatChannelUploadDate(channelStatus.lastPublishedAt),
                })
              }}
            </div>
            <div class="channel-upload-meta opacity-70 mt-1" v-if="channelStatus.sentCount">
              {{ t('channelUploadSentCount', { count: channelStatus.sentCount }) }}
            </div>
            <a
              v-if="channelStatus.lastUrl"
              :href="channelStatus.lastUrl"
              target="_blank"
              rel="noreferrer"
              class="channel-upload-meta mt-2 inline-flex items-center gap-1 text-blue-600 hover:underline">
              {{ t('channelUploadViewLink') }}
              <svg
                class="w-3 h-3"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round">
                <path d="M4 12L12 4" />
                <path d="M5 4h7v7" />
              </svg>
            </a>
          </div>
          <div class="mt-3 text-xs opacity-60" v-else>
            {{ t('channelUploadNoHistory') }}
          </div>
        </form>
      </OsCard>

      <OsCard>
        <form @submit.prevent="save" action="#">
          <input type="text" name="username" autocomplete="username" class="hidden" />
          <div class="flex items-center gap-2 mb-4">
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
                <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
                <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
                <circle cx="12" cy="12" r="2" />
                <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
                <path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1" />
              </svg>
            </span>
            <h3 class="font-semibold text-[15px]">{{ t('liveNotificationsTitle') }}</h3>
          </div>
          <div class="mt-1">
            <Alert>
              <Rocket class="h-5 w-5 alert-icon" />
              <div class="flex-1">
                <AlertTitle>{{ t('liveCredsWebhookHelpTitle') }}</AlertTitle>
                <AlertDescription>{{ t('liveCredsWebhookHelp') }}</AlertDescription>
              </div>
            </Alert>
          </div>
          <div class="form-group mt-4">
            <label class="label">Live Discord Webhook</label>
            <div class="input-group">
              <input
                class="input"
                id="liveDiscordWebhook"
                name="liveDiscordWebhook"
                :class="{ 'input-error': errors.liveDiscordWebhook }"
                :type="reveal.liveDiscord ? 'text' : 'password'"
                v-model="form.liveDiscordWebhook"
                placeholder="https://discord.com/api/webhooks/..."
                @input="validate"
                autocomplete="new-password" />
              <EyeToggle
                :shown="reveal.liveDiscord"
                :hide-label="t('secretHideLiveWebhook')"
                :show-label="t('secretShowLiveWebhook')"
                @toggle="
                  async (next) => {
                    if (next && form.liveDiscordWebhook === MASK) {
                      await revealSecret('liveDiscordWebhook');
                    }
                    reveal.liveDiscord = next;
                  }
                " />
            </div>
            <small v-if="errors.liveDiscordWebhook" class="small text-red-700">{{
              errors.liveDiscordWebhook
            }}</small>
          </div>

          <div class="form-group grid mt-4 grid-cols-2 gap-3">
            <div>
              <label class="label">Live Telegram Bot Token</label>
              <div class="input-group">
                <input
                  class="input"
                  id="liveTelegramBotToken"
                  name="liveTelegramBotToken"
                  :class="{ 'input-error': errors.liveTelegramBotToken }"
                  :type="reveal.liveTelegram ? 'text' : 'password'"
                  v-model="form.liveTelegramBotToken"
                  placeholder="123456:ABCDEF"
                  @input="validate"
                  autocomplete="new-password" />
                <EyeToggle
                  :shown="reveal.liveTelegram"
                  :hide-label="t('secretHideGeneric') || t('secretHide')"
                  :show-label="t('secretShowGeneric') || t('secretShow')"
                  @toggle="
                    async (next) => {
                      if (next && form.liveTelegramBotToken === MASK) {
                        await revealSecret('liveTelegramBotToken');
                      }
                      reveal.liveTelegram = next;
                    }
                  " />
              </div>
              <small v-if="errors.liveTelegramBotToken" class="small text-red-700">{{
                errors.liveTelegramBotToken
              }}</small>
            </div>
            <div>
              <label class="label">Live Telegram Chat ID</label>
              <div class="input-group">
                <input
                  class="input"
                  id="liveTelegramChatId"
                  name="liveTelegramChatId"
                  :class="{ 'input-error': errors.liveTelegramChatId }"
                  :type="reveal.liveTelegramChatId ? 'text' : 'password'"
                  v-model="form.liveTelegramChatId"
                  placeholder="-1001234567890"
                  @input="validate"
                  autocomplete="new-password" />
                <EyeToggle
                  :shown="reveal.liveTelegramChatId"
                  :hide-label="t('secretHideGeneric') || t('secretHide')"
                  :show-label="t('secretShowGeneric') || t('secretShow')"
                  @toggle="
                    async (next) => {
                      if (next && form.liveTelegramChatId === MASK) {
                        await revealSecret('liveTelegramChatId');
                      }
                      reveal.liveTelegramChatId = next;
                    }
                  " />
              </div>
              <small v-if="errors.liveTelegramChatId" class="small text-red-700">{{
                errors.liveTelegramChatId
              }}</small>
            </div>
          </div>
          <div class="mt-3">
            <button
              type="button"
              class="btn"
              :disabled="!dirty || hasErrors || saving || masked"
              @click="save">
              {{ saving ? t('commonSaving') : t('externalSave') }}
            </button>
            <div
              class="mt-2 small"
              :class="liveHas.discord || liveHas.telegram ? 'opacity-80' : 'text-red-700'">
              <template v-if="liveHas.discord || liveHas.telegram">
                {{ t('liveTargetsLabel') }}
                {{
                  [liveHas.discord ? t('discord') : null, liveHas.telegram ? t('telegram') : null]
                    .filter(Boolean)
                    .join(', ')
                }}
              </template>
              <template v-else>
                {{ t('liveTargetsNone') }}
              </template>
            </div>
          </div>
        </form>
      </OsCard>
    </div>
  </section>
</template>
<script setup>
import { ref, reactive, onMounted, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '../services/api';
import { pushToast } from '../services/toast';
import { useDirty } from '../composables/useDirtyRegistry';
import { isHttpUrl } from '../utils/validation';
import OsCard from './os/OsCard.vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Rocket } from 'lucide-vue-next';
import EyeToggle from './EyeToggle.vue';

const { t } = useI18n();

const TEMPLATE_VARS = Object.freeze({
  from: '{from}',
  amount: '{amount}',
  usd: '{usd}',
  message: '{message}',
});

const templateHint = computed(() => t('externalTemplateHint', TEMPLATE_VARS));

const masked = ref(false);

const MASK = '................';

const reveal = reactive({
  discord: false,
  obsIp: false,
  obsPwd: false,
  telegram: false,
  liveDiscord: false,
  liveTelegram: false,
  telegramChatId: false,
  liveTelegramChatId: false,
  channelUpload: false,
});

const form = ref({
  discordWebhook: '',
  telegramBotToken: '',
  telegramChatId: '',
  template: '',
  liveDiscordWebhook: '',
  liveTelegramBotToken: '',
  liveTelegramChatId: '',
});

const errors = ref({
  discordWebhook: '',
  telegramBotToken: '',
  telegramChatId: '',
  liveDiscordWebhook: '',
  liveTelegramBotToken: '',
  liveTelegramChatId: '',
});

const channelForm = ref({ discordWebhook: '', channelClaimId: '' });
const channelErrors = ref({ discordWebhook: '', channelClaimId: '' });
const channelInitial = ref('');
const channelDirty = ref(false);
const channelSaving = ref(false);
const channelStatus = ref({
  active: false,
  lastTitle: '',
  lastUrl: '',
  lastPublishedAt: null,
  sentCount: 0,
});

const initial = ref('');
const statusActive = ref(false);
const dirty = ref(false);
const saving = ref(false);
const liveHas = ref({ discord: false, telegram: false });

useDirty(() => dirty.value, t('externalNotificationsModule') || 'External Notifications');

const hasErrors = computed(() => Object.values(errors.value).some((e) => e));
const channelHasErrors = computed(() => Object.values(channelErrors.value).some((e) => e));
const channelClaimRegex = /^[a-f0-9]{6,40}$/i;

watch(
  form,
  () => {
    dirty.value = JSON.stringify(form.value) !== initial.value;
  },
  { deep: true }
);

watch(
  channelForm,
  () => {
    channelDirty.value = JSON.stringify(channelForm.value) !== channelInitial.value;
  },
  { deep: true }
);

useDirty(() => channelDirty.value, t('channelUploadModule') || 'Channel upload notifications');

async function load() {
  try {
    const [modulesRes, r] = await Promise.all([
      api.get('/api/modules').catch(() => ({ data: {} })),
      api.get('/api/external-notifications'),
    ]);
    masked.value = !!modulesRes?.data?.masked;
    const cfg = r.data?.config || {};
    form.value.template = cfg.template || '';
    form.value.discordWebhook = cfg.discordWebhook || (cfg.hasDiscordWebhook ? MASK : '');
    form.value.telegramBotToken = cfg.telegramBotToken || (cfg.hasTelegramBotToken ? MASK : '');
    form.value.telegramChatId = cfg.telegramChatId || (cfg.hasTelegramChatId ? MASK : '');
    form.value.liveDiscordWebhook =
      cfg.liveDiscordWebhook || (cfg.hasLiveDiscordWebhook ? MASK : '');
    form.value.liveTelegramBotToken =
      cfg.liveTelegramBotToken || (cfg.hasLiveTelegramBotToken ? MASK : '');
    form.value.liveTelegramChatId =
      cfg.liveTelegramChatId || (cfg.hasLiveTelegramChatId ? MASK : '');
    liveHas.value.discord = !!(cfg.hasLiveDiscord || cfg.hasLiveDiscordWebhook);
    liveHas.value.telegram = !!(
      cfg.hasLiveTelegram ||
      (cfg.hasLiveTelegramBotToken && cfg.hasLiveTelegramChatId)
    );
    statusActive.value = !!r.data?.active;
    initial.value = JSON.stringify(form.value);
    dirty.value = false;
  } catch {
    pushToast({ type: 'error', message: t('externalSaveFailed') });
  }
}

async function loadChannelUpload() {
  try {
    const r = await api.get('/api/external-notifications/channel-upload');
    const cfg = r.data?.config || {};
    channelForm.value.discordWebhook = cfg.hasDiscordWebhook ? MASK : '';
    channelForm.value.channelClaimId = cfg.channelClaimId || '';
    channelStatus.value.active = !!(cfg.hasDiscordWebhook && cfg.channelClaimId);
    channelStatus.value.lastTitle = cfg.lastTitle || '';
    channelStatus.value.lastUrl = cfg.lastUrl || '';
    channelStatus.value.lastPublishedAt = cfg.lastPublishedAt || null;
    channelStatus.value.sentCount = Number(cfg.sentCount) || 0;
    channelErrors.value = { discordWebhook: '', channelClaimId: '' };
    channelInitial.value = JSON.stringify(channelForm.value);
    channelDirty.value = false;
  } catch {
    pushToast({ type: 'error', message: t('externalSaveFailed') });
  }
}

function formatChannelUploadDate(value) {
  if (!value) return '';
  try {
    const date = typeof value === 'number' ? new Date(value) : new Date(String(value));
    if (!Number.isFinite(date.getTime())) return String(value);
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch {
    return String(value);
  }
}

function validateChannelUpload() {
  const next = { discordWebhook: '', channelClaimId: '' };
  const rawWebhook = (channelForm.value.discordWebhook || '').trim();
  const webhookMasked = channelForm.value.discordWebhook === MASK;
  const webhookProvided = !!rawWebhook && !webhookMasked;
  const webhookActive = webhookMasked || webhookProvided;

  if (!webhookMasked) {
    if (webhookProvided && !isHttpUrl(rawWebhook)) {
      next.discordWebhook = t('invalidUrl');
    } else if (!webhookProvided && (channelForm.value.channelClaimId || '').trim()) {
      next.discordWebhook = t('requiredField');
    }
  }

  const rawClaim = (channelForm.value.channelClaimId || '').trim();
  if (!rawClaim) {
    if (webhookActive) next.channelClaimId = t('requiredField');
  } else if (!channelClaimRegex.test(rawClaim)) {
    next.channelClaimId = t('channelUploadInvalidClaim');
  }
  channelErrors.value = next;
  return !Object.values(next).some(Boolean);
}

const obsForm = ref({ ip: '', port: '', password: '' });
const obsInitial = ref('');
const obsDirty = ref(false);
const obsSaving = ref(false);
const obsErrors = ref({ ip: '', port: '' });
const hasObsErrors = computed(() => Object.values(obsErrors.value).some((e) => e));

watch(
  obsForm,
  () => {
    obsDirty.value = JSON.stringify(obsForm.value) !== obsInitial.value;
  },
  { deep: true }
);

async function loadObs() {
  try {
    const r = await api.get('/api/obs-ws-config');
    obsForm.value.ip = r.data.ip || '';
    obsForm.value.port = r.data.port || '';
    obsForm.value.password = r.data.password || '';
    obsInitial.value = JSON.stringify(obsForm.value);
    obsDirty.value = false;
  } catch {
    pushToast({ type: 'error', message: t('externalSaveFailed') });
  }
}

function validateObs() {
  obsErrors.value.ip =
    obsForm.value.ip &&
    !/^([\d]{1,3}\.){3}[\d]{1,3}$/.test(obsForm.value.ip) &&
    obsForm.value.ip !== 'localhost'
      ? t('invalidUrl')
      : '';
  obsErrors.value.port =
    obsForm.value.port && (isNaN(Number(obsForm.value.port)) || Number(obsForm.value.port) < 1)
      ? t('requiredField')
      : '';
}

async function saveObs() {
  if (masked.value) {
    pushToast({ type: 'info', message: t('externalSessionRequiredToast') });
    return;
  }
  validateObs();
  if (hasObsErrors.value) return;
  try {
    obsSaving.value = true;
    const payload = { ...obsForm.value };
    const r = await api.post('/api/obs-ws-config', payload);
    if (r.data.success) {
      pushToast({ type: 'success', message: t('externalSaved') });
      obsInitial.value = JSON.stringify(obsForm.value);
      obsDirty.value = false;
    } else {
      pushToast({ type: 'error', message: t('externalSaveFailed') });
    }
  } catch {
    pushToast({ type: 'error', message: t('externalSaveFailed') });
  } finally {
    obsSaving.value = false;
  }
}

function mapError(msg) {
  switch (msg) {
    case 'invalid_webhook':
      return t('invalidUrl');
    case 'invalid_claim_id':
      return t('channelUploadInvalidClaim');
    default:
      return t('externalSaveFailed');
  }
}

async function revealSecret(field) {
  try {
    if (!field) return;
    const target = field === 'channelUploadDiscordWebhook' ? channelForm.value : form.value;
    const localKey = field === 'channelUploadDiscordWebhook' ? 'discordWebhook' : field;
    const current = target[localKey];
    if (current && current !== MASK) return;
    const r = await api.get('/api/external-notifications/reveal', { params: { field } });
    if (r.data.success) target[localKey] = r.data.value || '';
  } catch {}
}

async function saveChannelUpload() {
  if (masked.value) {
    pushToast({ type: 'info', message: t('externalSessionRequiredToast') });
    return;
  }
  if (!validateChannelUpload()) return;
  try {
    channelSaving.value = true;
    const payload = {
      channelClaimId: (channelForm.value.channelClaimId || '').trim(),
    };
    if (channelForm.value.discordWebhook !== MASK) {
      payload.discordWebhook = (channelForm.value.discordWebhook || '').trim();
    }
    const r = await api.post('/api/external-notifications/channel-upload', payload);
    if (r.data.success) {
      pushToast({ type: 'success', message: t('externalSaved') });
      channelStatus.value.active = !!r.data.active;
      await loadChannelUpload();
    } else {
      pushToast({ type: 'error', message: mapError(r.data.error) });
    }
  } catch (e) {
    const msg = e.response?.data?.error;
    pushToast({ type: 'error', message: mapError(msg) });
  } finally {
    channelSaving.value = false;
  }
}

function validate() {
  errors.value.discordWebhook =
    form.value.discordWebhook &&
    form.value.discordWebhook !== MASK &&
    !isHttpUrl(form.value.discordWebhook)
      ? t('invalidUrl')
      : '';

  if (
    (form.value.telegramBotToken && form.value.telegramBotToken !== MASK) ||
    (form.value.telegramChatId && form.value.telegramChatId !== MASK)
  ) {
    errors.value.telegramBotToken = form.value.telegramBotToken ? '' : t('requiredField');
    errors.value.telegramChatId = form.value.telegramChatId ? '' : t('requiredField');
  } else {
    errors.value.telegramBotToken = '';
    errors.value.telegramChatId = '';
  }

  errors.value.liveDiscordWebhook =
    form.value.liveDiscordWebhook &&
    form.value.liveDiscordWebhook !== MASK &&
    !isHttpUrl(form.value.liveDiscordWebhook)
      ? t('invalidUrl')
      : '';

  if (
    (form.value.liveTelegramBotToken && form.value.liveTelegramBotToken !== MASK) ||
    (form.value.liveTelegramChatId && form.value.liveTelegramChatId !== MASK)
  ) {
    errors.value.liveTelegramBotToken = form.value.liveTelegramBotToken ? '' : t('requiredField');
    errors.value.liveTelegramChatId = form.value.liveTelegramChatId ? '' : t('requiredField');
  } else {
    errors.value.liveTelegramBotToken = '';
    errors.value.liveTelegramChatId = '';
  }
}

async function save() {
  if (masked.value) {
    pushToast({ type: 'info', message: t('externalSessionRequiredToast') });
    return;
  }
  validate();
  if (hasErrors.value) return;
  try {
    saving.value = true;

    const secretOrEmpty = (val) => {
      if (val === MASK) return undefined;
      const trimmed = (val || '').trim();
      return trimmed === '' ? '' : trimmed;
    };
    const payload = {
      discordWebhook: secretOrEmpty(form.value.discordWebhook),
      telegramBotToken: secretOrEmpty(form.value.telegramBotToken),
      telegramChatId: secretOrEmpty(form.value.telegramChatId),
      template: (form.value.template || '').toString(),
      liveDiscordWebhook: secretOrEmpty(form.value.liveDiscordWebhook),
      liveTelegramBotToken: secretOrEmpty(form.value.liveTelegramBotToken),
      liveTelegramChatId: secretOrEmpty(form.value.liveTelegramChatId),
    };

    Object.keys(payload).forEach((k) => {
      if (payload[k] === MASK || payload[k] === undefined) delete payload[k];
    });
    const r = await api.post('/api/external-notifications', payload);
    if (r.data.success) {
      pushToast({ type: 'success', message: t('externalSaved') });
      statusActive.value = !!r.data.status?.active;
      initial.value = JSON.stringify(form.value);
      dirty.value = false;

      try {
        const rr = await api.get('/api/external-notifications');
        liveHas.value.discord = !!rr.data?.config?.hasLiveDiscord;
        liveHas.value.telegram = !!rr.data?.config?.hasLiveTelegram;
      } catch {}
    } else {
      pushToast({ type: 'error', message: mapError(r.data.error) });
    }
  } catch (e) {
    const msg = e.response?.data?.error;
    pushToast({ type: 'error', message: mapError(msg) });
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  load();
  loadObs();
  loadChannelUpload();
});
</script>

<style scoped>
.channel-upload-meta {
  font-size: 0.8rem;
}
:deep(.discord-override .input-group .input) {
  border-radius: 0;
  border-width: 0;
}
</style>
