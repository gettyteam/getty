<template>
  <div class="relative" :class="{ 'opacity-70 pointer-events-none': busy }">
    <button
      v-if="!session.state.address"
      @click="toggleChooser"
      class="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm hover:bg-card transition-colors"
      :disabled="busy"
      :aria-busy="busy.toString()"
      :title="t('adminAuth.connectWalletTitle')">
      <WalletIcon class="w-4 h-4" />
      <span class="btn-label">{{ busy ? '...' : t('walletLogin') }}</span>
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
          class="w-full px-3 py-2 rounded-lg border border-border bg-transparent text-sm"
          type="email"
          autocomplete="username"
          :placeholder="t('publicAuth.emailPlaceholder')" />

        <template v-if="!odyseeMagicLinkPending">
          <label class="text-xs opacity-70">{{ t('publicAuth.passwordLabel') }}</label>
          <input
            v-model="odyseePassword"
            class="w-full px-3 py-2 rounded-lg border border-border bg-transparent text-sm"
            type="password"
            autocomplete="current-password"
            :placeholder="t('publicAuth.passwordPlaceholder')" />
        </template>

        <label class="text-xs opacity-70">{{ t('publicAuth.walletAddressOptionalLabel') }}</label>
        <input
          v-model.trim="odyseeWalletAddress"
          class="w-full px-3 py-2 rounded-lg border border-border bg-transparent text-sm"
          type="text"
          autocomplete="off"
          :placeholder="t('publicAuth.walletAddressOptionalPlaceholder')" />

        <template v-if="!odyseeMagicLinkPending">
          <button
            type="button"
            class="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border text-sm hover:bg-card transition-colors text-center"
            @click="submitOdyseeLogin"
            :disabled="busy || !odyseeEmail || !odyseePassword">
            <img :src="odyseeLogo" alt="" class="h-4 w-4" aria-hidden="true" />
            {{ busy ? '...' : t('publicAuth.connectOdysee') }}
          </button>
        </template>

        <button
          type="button"
          class="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border text-sm hover:bg-card transition-colors text-center"
          @click="submitOdyseeMagicLink"
          :disabled="busy || !odyseeEmail"
          :title="t('publicAuth.magicLinkTooltip')">
          <i class="pi pi-envelope opacity-80" aria-hidden="true"></i>
          {{
            busy
              ? odyseeMagicLinkPending
                ? t('sending')
                : '...'
              : odyseeMagicLinkSent
                ? t('publicAuth.retrySendingLink')
                : t('publicAuth.sendMagicLink')
          }}
        </button>

        <template v-if="!odyseeMagicLinkPending">
          <a
            class="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border text-sm hover:bg-card transition-colors text-center"
            href="https://odysee.com/$/signup"
            target="_blank"
            rel="noopener noreferrer">
            <i class="pi pi-user-plus opacity-80" aria-hidden="true"></i>
            {{ t('publicAuth.createAccount') }}
          </a>
        </template>

        <p v-if="odyseeMagicLinkPending" class="text-xs opacity-70">
          {{ t('publicAuth.magicLinkWaiting') }}
        </p>

        <p v-if="odyseeError" class="text-xs text-red-500">{{ odyseeError }}</p>
      </div>
    </div>

    <div v-else class="flex items-center gap-2">
      <div
        ref="walletChipEl"
        class="relative group flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm bg-[var(--bg-card)]/60 backdrop-blur-sm"
        :title="!needsWalletVerification ? 'Wallet: ' + session.state.address : ''"
        tabindex="0"
        @click="onWalletChipToggleTooltip"
        @keydown.enter.prevent="onWalletChipToggleTooltip"
        @keydown.space.prevent="onWalletChipToggleTooltip"
        @keydown.esc.stop.prevent="hideWalletChipTooltip">
        <WsStatusDot
          :connected="walletConnected"
          size="sm"
          sr-label="Estado de la sesión de wallet" />
        <i class="pi pi-wallet text-[16px] leading-none opacity-80" aria-hidden="true"></i>
        <span class="font-mono truncate max-w-[110px]" aria-label="Dirección wallet">{{
          shortAddr
        }}</span>
        <span v-if="balanceLabel" class="balance-label text-xs font-mono opacity-80">{{
          balanceLabel
        }}</span>

        <span
          v-if="needsWalletVerification"
          class="absolute -top-1 -right-1 flex h-3 w-3"
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
const odyseeMagicLinkPending = ref(false);
const odyseeMagicLinkSent = ref(false);
let providerPromise = null;

const walletChipEl = ref(null);
const walletChipTooltipOpen = ref(false);

let __odyseeMagicLinkTimer = null;
let __odyseeMagicLinkDelayMs = 12000;
let __odyseeMagicLinkInFlight = false;
let __odyseeMagicLinkFocusHandler = null;

const walletConnected = computed(() => !!session.state.address && !session.state.sessionStale);

const needsWalletVerification = computed(() => {
  if (!session.state.address) return false;
  if (session.state.loading) return false;
  if (session.state.sessionStale) return false;

  const caps = Array.isArray(session.state.capabilities) ? session.state.capabilities : null;
  if (!caps) return false;
  return !caps.includes('config.write');
});

const shortAddr = computed(() => {
  if (!session.state.address) return '';
  return session.state.address.slice(0, 5) + '...' + session.state.address.slice(-5);
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
    odyseeMagicLinkPending.value = false;
    stopOdyseeMagicLinkPolling();
  }
}

function closeChooser() {
  showChooser.value = false;
  showOdyseeForm.value = false;
  odyseeError.value = '';
  odyseePassword.value = '';
  odyseeMagicLinkPending.value = false;
  stopOdyseeMagicLinkPolling();
}

function openOdyseeForm() {
  odyseeError.value = '';
  showOdyseeForm.value = true;
  odyseePassword.value = '';
  odyseeMagicLinkPending.value = false;
  stopOdyseeMagicLinkPolling();
}

function stopOdyseeMagicLinkPolling() {
  try {
    if (__odyseeMagicLinkTimer) clearTimeout(__odyseeMagicLinkTimer);
  } catch {}
  __odyseeMagicLinkTimer = null;
  __odyseeMagicLinkDelayMs = 12000;
  __odyseeMagicLinkInFlight = false;
  try {
    if (__odyseeMagicLinkFocusHandler)
      window.removeEventListener('focus', __odyseeMagicLinkFocusHandler);
  } catch {}
  __odyseeMagicLinkFocusHandler = null;
}

function scheduleOdyseeMagicLinkPoll(email, walletAddress) {
  try {
    if (__odyseeMagicLinkTimer) clearTimeout(__odyseeMagicLinkTimer);
  } catch {}
  __odyseeMagicLinkTimer = setTimeout(() => {
    void attemptOdyseeMagicLinkPoll(email, walletAddress);
  }, __odyseeMagicLinkDelayMs);
}

async function attemptOdyseeMagicLinkPoll(email, walletAddress) {
  if (!showChooser.value || !showOdyseeForm.value) return;
  if (!email) return;
  if (__odyseeMagicLinkInFlight) return;

  try {
    __odyseeMagicLinkInFlight = true;

    let wa = (walletAddress || '').trim();
    if (!wa) {
      try {
        const stored = localStorage.getItem('arweaveAddress');
        if (stored) wa = String(stored).trim();
      } catch {}
    }

    const body = {
      email,
      walletAddress: wa,
      useMagicLink: true,
      skipResend: true,
    };

    const res = await fetchJson('/api/auth/odysee/login', { method: 'POST', body });
    if (res && res.success) {
      if (res.widgetToken) persistWidgetToken(res.widgetToken, res.expiresAt);
      await session.refreshSession();
      try {
        window.dispatchEvent(new CustomEvent('getty-session-updated'));
      } catch {}
      stopOdyseeMagicLinkPolling();
      closeChooser();
      return;
    }

    if (res?.error === 'email_verification_required') {
      __odyseeMagicLinkDelayMs = Math.min(Math.floor(__odyseeMagicLinkDelayMs * 1.25), 30000);
      scheduleOdyseeMagicLinkPoll(email, wa);
      return;
    }

    stopOdyseeMagicLinkPolling();
    odyseeMagicLinkPending.value = false;
    if (res?.error) odyseeError.value = res.error;
  } catch {
    __odyseeMagicLinkDelayMs = Math.min(Math.floor(__odyseeMagicLinkDelayMs * 1.25), 30000);
    scheduleOdyseeMagicLinkPoll(email, walletAddress);
  } finally {
    __odyseeMagicLinkInFlight = false;
  }
}

function startOdyseeMagicLinkPolling(email, walletAddress) {
  stopOdyseeMagicLinkPolling();
  odyseeMagicLinkPending.value = true;
  __odyseeMagicLinkDelayMs = 12000;
  scheduleOdyseeMagicLinkPoll(email, walletAddress);
  __odyseeMagicLinkFocusHandler = () => {
    void attemptOdyseeMagicLinkPoll(email, walletAddress);
  };
  try {
    window.addEventListener('focus', __odyseeMagicLinkFocusHandler);
  } catch {}
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
    odyseeMagicLinkPending.value = false;
    stopOdyseeMagicLinkPolling();
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
    };
    let res = await fetchJson('/api/auth/odysee/login', { method: 'POST', body });
    if (!res || !res.success) {
      if (res?.error === 'email_verification_required') {
        throw new Error(t('publicAuth.emailVerificationRequired'));
      }
      if (res?.error === 'wallet_address_required') {
        // Try to obtain the wallet address from Wander automatically and retry once.
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

async function submitOdyseeMagicLink() {
  odyseeError.value = '';
  busy.value = true;
  try {
    odyseeMagicLinkPending.value = true;
    odyseeMagicLinkSent.value = false;
    stopOdyseeMagicLinkPolling();
    let walletAddress = (odyseeWalletAddress.value || '').trim();
    if (!walletAddress) {
      try {
        const stored = localStorage.getItem('arweaveAddress');
        if (stored) walletAddress = String(stored).trim();
      } catch {}
    }
    const body = {
      email: odyseeEmail.value,
      walletAddress,
      useMagicLink: true,
    };
    let res = await fetchJson('/api/auth/odysee/login', { method: 'POST', body });
    if (!res || !res.success) {
      if (res?.error === 'email_verification_required') {
        odyseeError.value = t('publicAuth.emailVerificationRequired');
        odyseeMagicLinkSent.value = true;
        startOdyseeMagicLinkPolling(odyseeEmail.value, walletAddress);
        return;
      }
      if (res?.error === 'odysee_email_not_found') {
        odyseeError.value = t('publicAuth.emailNotFound');
        stopOdyseeMagicLinkPolling();
        odyseeMagicLinkPending.value = false;
        odyseeMagicLinkSent.value = false;
        return;
      }
      if (res?.error === 'wallet_address_required') {
        // Try to obtain the wallet address from Wander automatically and retry once.
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
    await session.refreshSession();
    try {
      window.dispatchEvent(new CustomEvent('getty-session-updated'));
    } catch {}
    stopOdyseeMagicLinkPolling();
    odyseeMagicLinkPending.value = false;
    odyseeMagicLinkSent.value = false;
    closeChooser();
  } catch (e) {
    odyseeMagicLinkPending.value = false;
    odyseeMagicLinkSent.value = false;
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

    await provider.ensurePermissions([
      'ACCESS_ADDRESS',
      'ACCESS_PUBLIC_KEY',
      'SIGN_MESSAGE',
      'SIGNATURE',
    ]);
    const address = await provider.getActiveAddress();
    if (!address) throw new Error('No se obtuvo dirección');
    const nonce = await fetchJson('/api/auth/wander/nonce', { method: 'POST', body: { address } });
    if (nonce.error) throw new Error(nonce.error);

    let primarySig = await provider.signMessage(nonce.message);
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
        const altMessage = String(nonce.message);
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
