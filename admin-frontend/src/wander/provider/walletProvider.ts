import {
  EXTENDED_WALLET_PERMISSIONS,
  MINIMUM_WALLET_PERMISSIONS,
  type PermissionName,
  type RawWalletProvider,
  type WalletAdapter,
  type WalletDisconnectedEventDetail,
  type WalletEventListener,
  type WalletSignature,
  type WalletSwitchEventDetail
} from './walletTypes';

function b64ToUrl(b64: string): string {
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function bytesToB64Url(bytes: ArrayBuffer | Uint8Array | unknown): string {
  try {
    const view =
      bytes instanceof Uint8Array
        ? bytes
        : bytes instanceof ArrayBuffer
          ? new Uint8Array(bytes)
          : new Uint8Array(bytes as ArrayBufferLike);
    let str = '';
    for (const b of view) {
      if (typeof b !== 'number') continue;
      str += String.fromCharCode(b);
    }
    return b64ToUrl(btoa(str));
  } catch {
    return '';
  }
}

function adaptWindowProvider(
  raw: RawWalletProvider | null | undefined,
  meta?: { name?: string }
): WalletAdapter | null {
  if (!raw) return null;
  const provider = raw;
  const providerName = meta?.name || '';
  const cache = {
    address: '' as string,
    addressTs: 0,
    publicKey: '' as string,
    publicKeyTs: 0
  };
  let polling = false;
  const listeners = new Set<WalletEventListener>();
  let walletLoadedDispatched = false;

  function emit(evt: Parameters<WalletEventListener>[0], data: unknown): void {
    listeners.forEach((fn) => {
      try {
        fn(evt, data);
      } catch {
        /* noop */
      }
    });
    if (typeof window !== 'undefined') {
      try {
        if (evt === 'account-changed') {
          const detail: WalletSwitchEventDetail = {
            address: (data as { current?: string })?.current ?? ''
          };
          window.dispatchEvent(new CustomEvent('walletSwitch', { detail }));
        } else if (evt === 'disconnected') {
          const detail: WalletDisconnectedEventDetail = { reason: 'provider_disconnect' };
          window.dispatchEvent(new CustomEvent('walletDisconnected', { detail }));
        }
      } catch {
        /* noop */
      }
    }
  }

  function startPolling(): void {
    if (polling) return;
    polling = true;
    let last: string | null = null;
    const interval = setInterval(async () => {
      try {
        if (typeof document !== 'undefined' && document.hidden) return;
        let next = '';
        if (provider.getActiveAddress) next = await provider.getActiveAddress();
        else if (provider.getAddress) next = await provider.getAddress();
        else if (provider.address) next = provider.address;
        if (next && next !== last) {
          const previous = last;
          last = next;
          cache.address = next;
          cache.addressTs = Date.now();
          emit('account-changed', { previous, current: next });
        }
      } catch {
        /* noop */
      }
    }, 1500);
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => clearInterval(interval));
    }
  }

  const PERMISSION_STEPS: readonly PermissionName[][] = [
    ['ACCESS_ADDRESS'],
    [...MINIMUM_WALLET_PERMISSIONS],
    [...EXTENDED_WALLET_PERMISSIONS],
    [...EXTENDED_WALLET_PERMISSIONS, 'DISPATCH']
  ];

  async function requestPermissions(step: number): Promise<void> {
    const perms = PERMISSION_STEPS[step] || [];
    if (!perms.length) return;
    try {
      if (provider.connect) await provider.connect(perms as PermissionName[]);
      else if (provider.connectPermissions) await provider.connectPermissions(perms as PermissionName[]);
    } catch {
      /* noop */
    }
  }

  const granted = new Set<PermissionName>();

  async function ensurePermissions(targets: PermissionName[]): Promise<void> {
    const missing = targets.filter((p) => !granted.has(p));
    if (!missing.length) return;
    for (let i = 0; i < PERMISSION_STEPS.length; i++) {
      await requestPermissions(i);
      try {
        if (provider.getPermissions) {
          const current = await provider.getPermissions();
          if (Array.isArray(current)) {
            for (const perm of current) granted.add(perm as PermissionName);
          }
        }
      } catch {
        /* noop */
      }
      const stillMissing = targets.filter((p) => !granted.has(p));
      if (!stillMissing.length) break;
    }
    if (!walletLoadedDispatched && granted.size) {
      walletLoadedDispatched = true;
      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(
            new CustomEvent('arweaveWalletLoaded', {
              detail: { permissions: Array.from(granted) as PermissionName[] }
            })
          );
        } catch {
          /* noop */
        }
      }
    }
  }

  async function getActiveAddress(): Promise<string> {
    const now = Date.now();
    if (cache.address && now - cache.addressTs < 10_000) return cache.address;
    let next = '';
    if (provider.getActiveAddress) next = await provider.getActiveAddress();
    else if (provider.getAddress) next = await provider.getAddress();
    else if (provider.address) next = provider.address;
    cache.address = next || '';
    cache.addressTs = now;
    return cache.address;
  }

  async function getActivePublicKey(): Promise<string> {
    const now = Date.now();
    if (cache.publicKey && now - cache.publicKeyTs < 15_000) return cache.publicKey;
    let next = '';
    if (provider.getActivePublicKey) next = await provider.getActivePublicKey();
    else if (provider.getPublicKey) next = await provider.getPublicKey();
    else if (provider.getOwner) next = await provider.getOwner();
    cache.publicKey = next || '';
    cache.publicKeyTs = now;
    return cache.publicKey;
  }

  async function disconnect(): Promise<void> {
    try {
      if (provider.disconnect) await provider.disconnect();
    } catch {
      /* noop */
    }
    cache.address = '';
    cache.publicKey = '';
    granted.clear();
    if (typeof window !== 'undefined') emit('disconnected', {});
  }

  async function signMessage(message: unknown): Promise<WalletSignature> {
    const win = typeof window !== 'undefined' ? window : ({} as Window & typeof globalThis);
    const signMessageFn = provider.signMessage?.bind(provider);
    const signatureFn = (provider as unknown as { signature?: (...args: unknown[]) => Promise<unknown> })
      .signature?.bind(provider);
    if (!signMessageFn && !signatureFn) throw new Error('No wallet signMessage/signature implementation available');

    const cacheKey = '__wallet_sig_strategy_v1';

    const encoder = new TextEncoder();
    const toBytes = (input: unknown): Uint8Array => {
      if (input instanceof Uint8Array) return input;
      if (input instanceof ArrayBuffer) return new Uint8Array(input);
      if (typeof input === 'string') return encoder.encode(input);
      if (input && typeof input === 'object' && ('data' in input || 'message' in input)) {
        const inner = (input as Record<string, unknown>).data ?? (input as Record<string, unknown>).message;
        return toBytes(inner);
      }
      return encoder.encode(String(input ?? ''));
    };

    const bytes = toBytes(message);

    const bytesCopy = (() => {
      try {
        const out = new Uint8Array(bytes.byteLength);
        out.set(bytes);
        return out;
      } catch {
        return new Uint8Array();
      }
    })();
    const bufferCopy = bytesCopy.buffer;
    const bufferSlice = (() => {
      try {
        return bufferCopy.slice(0);
      } catch {
        return bufferCopy;
      }
    })();

    const arrayBufferExact = (() => {
      try {
        const ab = new ArrayBuffer(bytesCopy.byteLength);
        new Uint8Array(ab).set(bytesCopy);
        return ab;
      } catch {
        return bufferSlice;
      }
    })();

    const errors: string[] = [];
    let successLabel: string | null = null;

    const attempt = async (label: string, fn: () => Promise<unknown>): Promise<unknown> => {
      try {
        const result = await fn();
        if (result) {
          return result;
        }
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        errors.push(`${label}: ${errMsg}`);
      }
      return null;
    };

    let signed: unknown = null;

    const isWanderInjected = providerName === 'wander' || providerName === 'arweaveWallet';

    if (!signed && signMessageFn) {
      signed = await attempt('signMessage(Uint8Array)', () => signMessageFn(bytesCopy));
      if (signed) successLabel = 'signMessage(Uint8Array)';

      if (!signed) {
        signed = await attempt('signMessage(ArrayBuffer:exact)', () => signMessageFn(arrayBufferExact));
        if (signed) successLabel = 'signMessage(ArrayBuffer:exact)';
      }

      if (!signed) {
        signed = await attempt('signMessage(ArrayBuffer:slice)', () => signMessageFn(bufferSlice));
        if (signed) successLabel = 'signMessage(ArrayBuffer:slice)';
      }

      if (!signed) {
        signed = await attempt('signMessage(ArrayBuffer:buffer)', () => signMessageFn(bufferCopy));
        if (signed) successLabel = 'signMessage(ArrayBuffer:buffer)';
      }
    }

    if (!signed && !signMessageFn && signatureFn) {
      const algo = { name: 'RSA-PSS', saltLength: 32 };
      signed = await attempt('signature(Uint8Array,RSA-PSS)', () => signatureFn(bytesCopy, algo));
      if (signed) successLabel = 'signature(Uint8Array,RSA-PSS)';

      if (!signed) {
        signed = await attempt('signature(ArrayBuffer,RSA-PSS)', () => signatureFn(arrayBufferExact, algo));
        if (signed) successLabel = 'signature(ArrayBuffer,RSA-PSS)';
      }
    }

    if (!signed) {
      throw new Error(`Wander signMessage API failed: ${errors.join(' | ')}`);
    }

    const sigRaw = signed;
    let ownerRaw: unknown = null;

    try {
      ownerRaw = await provider.getActivePublicKey?.();
    } catch {
      /* noop */
    }
    if (!ownerRaw) {
      try {
        ownerRaw = await provider.getPublicKey?.();
      } catch {
        /* noop */
      }
    }
    if (!ownerRaw) {
      try {
        ownerRaw = await provider.getOwner?.();
      } catch {
        /* noop */
      }
    }

    const signature = typeof sigRaw === 'string' ? b64ToUrl(sigRaw) : bytesToB64Url(sigRaw);
    const publicKey = typeof ownerRaw === 'string' ? b64ToUrl(ownerRaw) : bytesToB64Url(ownerRaw as ArrayBuffer | Uint8Array | undefined);

    if (!signature || !publicKey) throw new Error('Incomplete signature (missing signature or publicKey)');

    if (successLabel && win.localStorage) {
      try {
        win.localStorage.setItem(cacheKey, successLabel);
      } catch {
        /* noop */
      }
    }

    return { signature, publicKey, strategy: successLabel, method: successLabel } satisfies WalletSignature;
  }

  return {
    hasProvider: true,
    on(listener: WalletEventListener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async ensurePermissions(minimal = MINIMUM_WALLET_PERMISSIONS.slice()) {
      await ensurePermissions([...minimal]);
      startPolling();
    },
    getActiveAddress,
    getActivePublicKey,
    disconnect,
    signMessage
  } satisfies WalletAdapter;
}

export async function getWalletProvider(): Promise<WalletAdapter> {
  const win = typeof window !== 'undefined' ? window : ({} as Window & typeof globalThis);
  const candidates: Array<{ name: string; provider: RawWalletProvider | undefined }> = [
    { name: 'wander', provider: win.wander },
    { name: 'arweaveWallet', provider: win.arweaveWallet },
    { name: 'arconnect', provider: win.arconnect }
  ];
  for (const { name, provider } of candidates) {
    const adapted = adaptWindowProvider(provider, { name });
    if (adapted) {
      return adapted;
    }
  }
  return {
    hasProvider: false,
    on() {
      return () => undefined;
    },
    async ensurePermissions() {
      throw new Error('No wallet extension detected');
    },
    async getActiveAddress() {
      throw new Error('No wallet extension detected');
    },
    async getActivePublicKey() {
      throw new Error('No wallet extension detected');
    },
    async disconnect() {
      throw new Error('No wallet extension detected');
    },
    async signMessage() {
      throw new Error('No wallet extension detected');
    }
  } satisfies WalletAdapter;
}

export function isDummyAllowed(): boolean {
  return (
    import.meta.env.DEV === true ||
    (typeof window !== 'undefined' && window.__GETTY_DUMMY_WALLET === true)
  );
}
