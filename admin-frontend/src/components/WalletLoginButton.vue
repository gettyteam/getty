<template>
  <div class="relative" :class="{ 'opacity-70 pointer-events-none': busy }">
    <button
      v-if="!session.state.address"
      @click="toggleChooser"
      class="flex items-center gap-2 p-2 md:px-3 md:py-2 rounded-lg border border-border text-sm hover:bg-card transition-colors"
      :disabled="busy"
      :aria-busy="busy.toString()"
      :title="t('adminAuth.connectWalletTitle')">
      <WalletIcon class="w-4 h-4" />
      <span class="btn-label sr-only md:not-sr-only">{{ busy ? '...' : t('walletLogin') }}</span>
    </button>

    <div
      v-if="showChooser && !session.state.address"
      class="absolute z-50 mt-2 w-[320px] right-0 rounded-lg border border-border bg-[var(--bg-card)] p-3 shadow-lg">
      <div class="flex items-center justify-between mb-2">
        <p class="text-sm font-medium">{{ t('walletLogin') }}</p>
        <button type="button" class="text-xs opacity-70 hover:opacity-100" @click="closeChooser">
          {{ t('commonClose') }}
        </button>
      </div>

      <div v-if="!showOdyseeForm" class="flex flex-col gap-2">
        <button
          type="button"
          class="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border text-sm hover:bg-card transition-colors"
          @click="startWanderLogin"
          :disabled="busy">
          <span>{{ t('publicAuth.wander') }}</span>
          <span class="opacity-60">{{ t('publicAuth.wanderSubtitle') }}</span>
        </button>

        <button
          type="button"
          class="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border text-sm hover:bg-card transition-colors"
          @click="openOdyseeForm"
          :disabled="busy">
          <span>{{ t('publicAuth.odysee') }}</span>
          <span class="opacity-60">{{ t('publicAuth.odyseeSubtitle') }}</span>
        </button>
      </div>

      <div v-else class="flex flex-col gap-2">
        <p class="text-xs opacity-80">{{ t('publicAuth.odyseeHint') }}</p>

        <div class="flex gap-2">
          <button
            type="button"
            class="px-3 py-2 rounded-lg border border-border text-sm hover:bg-card transition-colors"
            @click="showOdyseeForm = false"
            :disabled="busy">
            {{ t('publicAuth.back') }}
          </button>
        </div>

        <label class="text-xs opacity-70">{{ t('publicAuth.emailLabel') }}</label>
        <input
          v-model.trim="odyseeEmail"
          class="w-full px-3 py-2 rounded-lg border border-border bg-transparent text-sm placeholder:text-[var(--text-secondary)] placeholder:opacity-90"
          type="email"
          autocomplete="username"
          :placeholder="t('publicAuth.emailPlaceholder')" />

        <label class="text-xs opacity-70">{{ t('publicAuth.passwordLabel') }}</label>
        <input
          v-model="odyseePassword"
          class="w-full px-3 py-2 rounded-lg border border-border bg-transparent text-sm placeholder:text-[var(--text-secondary)] placeholder:opacity-90"
          type="password"
          autocomplete="current-password"
          :placeholder="t('publicAuth.passwordPlaceholder')" />

        <div v-if="show2FAInput" class="mt-2">
          <label class="text-xs opacity-70 font-bold text-yellow-500">{{
            t('twoFactor.enterCode')
          }}</label>
          <input
            v-model="twoFactorCode"
            class="w-full px-3 py-2 rounded-lg border border-yellow-500 bg-transparent text-sm"
            type="text"
            autocomplete="one-time-code"
            placeholder="000000"
            maxlength="6"
            ref="twoFactorInput" />
        </div>

        <label class="text-xs opacity-70">{{ t('publicAuth.walletAddressOptionalLabel') }}</label>
        <input
          v-model.trim="odyseeWalletAddress"
          class="w-full px-3 py-2 rounded-lg border border-border bg-transparent text-sm placeholder:text-[var(--text-secondary)] placeholder:opacity-90"
          type="text"
          autocomplete="off"
          :placeholder="t('publicAuth.walletAddressOptionalPlaceholder')" />

        <button
          type="button"
          class="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border text-sm hover:bg-card transition-colors text-center"
          @click="submitOdyseeLogin"
          :disabled="busy || !odyseeEmail || !odyseePassword">
          <img :src="odyseeLogo" alt="" class="h-4 w-4" aria-hidden="true" />
          {{ busy ? '...' : t('publicAuth.connectOdysee') }}
        </button>

        <a
          class="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border text-sm hover:bg-card transition-colors text-center"
          href="https://odysee.com/$/signup"
          target="_blank"
          rel="noopener noreferrer">
          <i class="pi pi-user-plus opacity-80" aria-hidden="true"></i>
          {{ t('publicAuth.createAccount') }}
        </a>

        <p v-if="odyseeError" class="text-xs text-red-500">{{ odyseeError }}</p>
      </div>
    </div>

    <div v-if="session.state.address" class="flex items-center gap-2">
      <div
        ref="walletChipEl"
        class="relative group flex items-center gap-2 p-2 md:px-3 md:py-2 rounded-lg border border-border text-sm bg-[var(--bg-card)]/60 backdrop-blur-sm"
        :title="walletChipTitle"
        tabindex="0"
        @click="onWalletChipToggleTooltip"
        @keydown.enter.prevent="onWalletChipToggleTooltip"
        @keydown.space.prevent="onWalletChipToggleTooltip"
        @keydown.esc.stop.prevent="hideWalletChipTooltip">
        <span class="hidden md:inline-flex">
          <WsStatusDot :connected="walletConnected" size="sm" sr-label="Wallet session status" />
        </span>
        <i class="pi pi-wallet text-[14px] md:text-[16px] leading-none" aria-hidden="true"></i>
        <span
          class="font-mono truncate max-w-[110px] hidden md:inline"
          :aria-label="isOdyseePrincipal ? 'Odysee session' : 'Wallet address'">
          {{ shortAddr }}
        </span>
        <span v-if="balanceLabel" class="balance-label hidden md:inline text-xs font-mono">{{
          balanceLabel
        }}</span>

        <span
          v-if="needsWalletVerification"
          class="hidden md:flex absolute -top-1 -right-1 h-3 w-3"
          aria-hidden="true">
          <span
            class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
          <span class="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </span>

        <div
          v-if="needsWalletVerification"
          :class="[
            'pointer-events-none absolute top-full mt-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity',
            walletChipTooltipOpen ? 'opacity-100' : '',
          ]">
          <div
            class="px-2 py-1 rounded-md border border-border bg-[var(--bg-card)] text-[var(--text-primary)] text-xs shadow-lg max-w-[520px] text-center">
            {{ t('publicAuth.needsWalletVerification') }}
          </div>
        </div>
      </div>

      <button
        v-if="needsWalletVerification"
        type="button"
        class="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm hover:bg-card transition-colors"
        @click="startWanderLogin"
        :disabled="busy"
        :title="t('publicAuth.needsWalletVerification')">
        <i class="pi pi-check-circle" aria-hidden="true"></i>
        {{ t('publicAuth.verifyWithWander') }}
      </button>
    </div>

    <div v-if="error" class="absolute top-full mt-1 text-xs text-red-500 w-48">{{ error }}</div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import { useWanderSession } from '../wander/store/wanderSession';
import { getWalletProvider } from '../wander/provider/walletProvider';
import { fetchJson } from '../services/api';
import WalletIcon from './icons/WalletIcon.vue';
import WsStatusDot from './WsStatusDot.vue';
import odyseeLogo from '../assets/odysee.svg?url';

const { t } = useI18n();

const session = useWanderSession();
const busy = ref(false);
const error = ref('');
const showChooser = ref(false);
const showOdyseeForm = ref(false);
const odyseeEmail = ref('');
const odyseePassword = ref('');
const odyseeWalletAddress = ref('');
const odyseeError = ref('');
const show2FAInput = ref(false);
const twoFactorCode = ref('');
const twoFactorInput = ref(null);
let providerPromise = null;

const walletChipEl = ref(null);
const walletChipTooltipOpen = ref(false);

const walletConnected = computed(() => !!session.state.address && !session.state.sessionStale);

const needsWalletVerification = computed(() => {
  if (!session.state.address) return false;
  if (session.state.loading) return false;
  if (session.state.sessionStale) return false;

  const caps = Array.isArray(session.state.capabilities) ? session.state.capabilities : null;
  if (!caps) return false;
  return !caps.includes('config.write');
});

const isOdyseePrincipal = computed(() => {
  const addr = session.state.address;
  return typeof addr === 'string' && addr.startsWith('odysee:');
});

const walletChipTitle = computed(() => {
  if (needsWalletVerification.value) return '';
  const addr = session.state.address;
  if (!addr) return '';
  if (isOdyseePrincipal.value) return 'Odysee session';
  return `Wallet: ${addr}`;
});

const shortAddr = computed(() => {
  const addr = session.state.address;
  if (!addr) return '';
  if (isOdyseePrincipal.value) {
    return 'Odysee session';
  }
  return addr.slice(0, 5) + '...' + addr.slice(-5);
});

function hideWalletChipTooltip() {
  walletChipTooltipOpen.value = false;
}

function onWalletChipToggleTooltip() {
  if (!needsWalletVerification.value) return;
  walletChipTooltipOpen.value = !walletChipTooltipOpen.value;
}

function onGlobalPointerDown(e) {
  if (!walletChipTooltipOpen.value) return;
  const el = walletChipEl.value;
  if (!el) return;
  if (el.contains(e.target)) return;
  walletChipTooltipOpen.value = false;
}

onMounted(() => {
  try {
    document.addEventListener('pointerdown', onGlobalPointerDown, true);
  } catch {
    /* noop */
  }
});

onBeforeUnmount(() => {
  try {
    document.removeEventListener('pointerdown', onGlobalPointerDown, true);
  } catch {
    /* noop */
  }
});

async function ensureProvider() {
  if (!providerPromise) providerPromise = getWalletProvider();
  return providerPromise;
}

function toggleChooser() {
  if (busy.value) return;
  showChooser.value = !showChooser.value;
  if (!showChooser.value) {
    showOdyseeForm.value = false;
    odyseeError.value = '';
    odyseePassword.value = '';
    show2FAInput.value = false;
    twoFactorCode.value = '';
  }
}

function closeChooser() {
  showChooser.value = false;
  showOdyseeForm.value = false;
  odyseeError.value = '';
  odyseePassword.value = '';
  show2FAInput.value = false;
  twoFactorCode.value = '';
}

function openOdyseeForm() {
  odyseeError.value = '';
  showOdyseeForm.value = true;
  odyseePassword.value = '';
  show2FAInput.value = false;
  twoFactorCode.value = '';
}

function persistWidgetToken(widgetToken, expiresAt) {
  if (!widgetToken) return;
  try {
    localStorage.setItem('getty_widget_token', widgetToken);
  } catch {}
  try {
    let expiresAtDate = null;
    if (expiresAt) {
      try {
        const parsed = new Date(expiresAt);
        if (Number.isFinite(parsed.getTime())) expiresAtDate = parsed;
      } catch {}
    }
    const expiry = (expiresAtDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).toUTCString();
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `getty_widget_token=${encodeURIComponent(widgetToken)}; expires=${expiry}; Path=/; SameSite=Lax${secure}`;
  } catch {}
}

async function submitOdyseeLogin() {
  odyseeError.value = '';
  busy.value = true;
  try {
    let walletAddress = (odyseeWalletAddress.value || '').trim();
    if (!walletAddress) {
      try {
        const stored = localStorage.getItem('arweaveAddress');
        if (stored) walletAddress = String(stored).trim();
      } catch {}
    }
    const body = {
      email: odyseeEmail.value,
      password: odyseePassword.value,
      walletAddress,
      code: show2FAInput.value ? twoFactorCode.value : undefined,
    };

    let res = await fetchJson('/api/auth/odysee/login', { method: 'POST', body });
    if (!res || !res.success) {
      if (res?.error === '2fa_required') {
        show2FAInput.value = true;
        odyseeError.value = '';

        setTimeout(() => {
          if (twoFactorInput.value) twoFactorInput.value.focus();
        }, 100);
        busy.value = false;
        return;
      }
      if (res?.error === 'invalid_2fa_code') {
        throw new Error(t('twoFactor.invalidCode') || 'Invalid 2FA code');
      }
      if (res?.error === 'email_verification_required') {
        throw new Error(t('publicAuth.emailVerificationRequired'));
      }
      if (res?.error === 'odysee_email_not_found') {
        throw new Error(t('publicAuth.emailNotFound'));
      }
      if (res?.error === 'wallet_address_required') {
        try {
          const provider = await ensureProvider();
          if (provider && provider.hasProvider) {
            try {
              await provider.ensurePermissions(['ACCESS_ADDRESS']);
            } catch {}
            const addr = await provider.getActiveAddress();
            if (addr) {
              walletAddress = String(addr).trim();
              try {
                localStorage.setItem('arweaveAddress', walletAddress);
              } catch {}
              body.walletAddress = walletAddress;

              res = await fetchJson('/api/auth/odysee/login', { method: 'POST', body });
              if (res && res.success) {
                try {
                  const hash = res.walletHash;
                  if (hash) localStorage.setItem('getty_last_odysee_walletHash', String(hash));
                } catch {}
                if (res.widgetToken) persistWidgetToken(res.widgetToken, res.expiresAt);
                await session.refreshSession();
                try {
                  window.dispatchEvent(new CustomEvent('getty-session-updated'));
                } catch {}
                closeChooser();
                return;
              }
            }
          }
        } catch {}

        throw new Error(
          'No se pudo detectar tu wallet. Ingresa tu dirección de Arweave o permite acceso a Wander para obtenerla.'
        );
      }

      let msg = res?.error || 'odysee_login_failed';
      const reason = res?.details?.reason;
      const method = res?.details?.method;
      const rpcErr = res?.details?.rpcError;
      if (reason) msg += ` (${reason})`;
      if (method) msg += ` [${method}]`;
      if (rpcErr && typeof rpcErr === 'object' && rpcErr.message) msg += `: ${rpcErr.message}`;
      else if (rpcErr && typeof rpcErr !== 'object') msg += `: ${String(rpcErr)}`;
      throw new Error(msg);
    }

    if (res.widgetToken) persistWidgetToken(res.widgetToken, res.expiresAt);
    try {
      const hash = res.walletHash;
      if (hash) localStorage.setItem('getty_last_odysee_walletHash', String(hash));
    } catch {}
    await session.refreshSession();
    try {
      window.dispatchEvent(new CustomEvent('getty-session-updated'));
    } catch {}
    closeChooser();
  } catch (e) {
    odyseeError.value = e?.message || String(e);
  } finally {
    busy.value = false;
  }
}

async function startWanderLogin() {
  error.value = '';
  busy.value = true;
  try {
    closeChooser();
    const provider = await ensureProvider();
    if (!provider.hasProvider) throw new Error('Extension not detected');

    await provider.ensurePermissions(['ACCESS_ADDRESS', 'ACCESS_PUBLIC_KEY', 'SIGNATURE']);
    const address = await provider.getActiveAddress();
    if (!address) throw new Error('No se obtuvo dirección');
    const nonce = await fetchJson('/api/auth/wander/nonce', { method: 'POST', body: { address } });
    if (nonce.error) throw new Error(nonce.error);

    const msgBuffer = new TextEncoder().encode(nonce.message);
    let primarySig = await provider.signMessage(msgBuffer);
    let verify = await fetchJson('/api/auth/wander/verify', {
      method: 'POST',
      body: {
        address,
        signature: primarySig.signature,
        publicKey: primarySig.publicKey,
        strategy: primarySig.strategy,
        method: primarySig.method,
      },
    });
    if (!verify.success && verify.error === 'bad_signature') {
      try {
        const altMessage = new TextEncoder().encode(String(nonce.message));
        const altSig = await provider.signMessage(altMessage);
        verify = await fetchJson('/api/auth/wander/verify', {
          method: 'POST',
          body: {
            address,
            signature: altSig.signature,
            publicKey: altSig.publicKey,
            strategy: altSig.strategy,
            method: altSig.method,
          },
        });
      } catch {}
    }
    if (!verify.success) throw new Error(verify.error || 'verify_failed');
    await session.refreshSession();
    try {
      const hash = session.state.walletHash;
      if (hash) localStorage.setItem('getty_last_wander_walletHash', String(hash));
    } catch {}
    try {
      window.dispatchEvent(new CustomEvent('getty-session-updated'));
    } catch {}
  } catch (e) {
    error.value = e.message || String(e);
  } finally {
    busy.value = false;
  }
}

const balanceLabel = computed(() => {
  if (!session.state.address) return '';
  return '';
});
</script>
<style scoped>
button {
  background: var(--bg-card);
}
button:hover {
  background: var(--bg-chat);
}
.balance-label {
  display: inline-block;
}
</style>
