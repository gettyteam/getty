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

  const DEBUG_WALLET =
    typeof window !== 'undefined' &&
    typeof window.localStorage !== 'undefined' &&
    window.localStorage.getItem('getty:debugWallet') === '1';

  const debugLog = (message: string, payload?: unknown) => {
    if (!DEBUG_WALLET) return;
    try {
      // eslint-disable-next-line no-console
      console.debug(message, payload);
    } catch {
      /* noop */
    }
  };

  const errorLog = (message: string, payload?: unknown) => {
    if (!DEBUG_WALLET) return;
    try {
      // eslint-disable-next-line no-console
      console.error(message, payload);
    } catch {
      /* noop */
    }
  };
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

  const LEGACY_INVALID_PERMISSIONS = new Set<string>(['SIGN_MESSAGE']);

  async function requestPermissions(perms: PermissionName[]): Promise<void> {
    if (!perms.length) return;

    const safePerms = perms.filter((p) => !LEGACY_INVALID_PERMISSIONS.has(String(p))) as PermissionName[];
    if (!safePerms.length) return;

    const preferConnectPermissions = providerName === 'arweaveWallet' || providerName === 'wander';

    try {
      debugLog('[walletProvider.ensurePermissions] requesting', {
        providerName,
        preferConnectPermissions,
        perms: safePerms
      });
    } catch {
      /* noop */
    }

    try {
      if (preferConnectPermissions) {
        if (provider.connectPermissions) await provider.connectPermissions(safePerms);
        else if (provider.connect) await provider.connect(safePerms);
        else throw new Error('Wallet does not support permission requests');
        return;
      }

      if (provider.connect) await provider.connect(safePerms);
      else if (provider.connectPermissions) await provider.connectPermissions(safePerms);
      else throw new Error('Wallet does not support permission requests');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Permission request failed for ${providerName} with [${safePerms.join(', ')}]: ${msg}`);
    }
  }

  const granted = new Set<PermissionName>();

  async function ensurePermissions(targets: PermissionName[]): Promise<void> {
    const safeTargets = targets.filter((p) => !LEGACY_INVALID_PERMISSIONS.has(String(p))) as PermissionName[];
    const refreshGranted = async () => {
      if (!provider.getPermissions) return;
      const current = await provider.getPermissions();
      if (Array.isArray(current)) {
        for (const perm of current) granted.add(perm as PermissionName);
      }
    };

    try {
      await refreshGranted();
    } catch {
      /* noop */
    }

    let missing = safeTargets.filter((p) => !granted.has(p));
    if (!missing.length) return;

    await requestPermissions([...safeTargets]);

    try {
      await refreshGranted();
    } catch {
      for (const p of safeTargets) granted.add(p);
    }

    missing = safeTargets.filter((p) => !granted.has(p));

    if (missing.length) {
      for (let i = 0; i < PERMISSION_STEPS.length; i++) {
        const stepPerms = PERMISSION_STEPS[i] || [];
        try {
          await requestPermissions(stepPerms);
        } catch {
          /* noop */
        }
        try {
          await refreshGranted();
        } catch {
          /* noop */
        }
        missing = safeTargets.filter((p) => !granted.has(p));
        if (!missing.length) break;
      }
    }

    if (missing.length) {
      throw new Error(`Missing permission(s): ${missing.join(', ')}`);
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
        // Debug trace to capture provider and argument types when trying different
        // signMessage variants. This helps reproduce "Input is not an ArrayBuffer"
        // errors coming from the injected Wander SDK.
        debugLog('[walletProvider.signMessage] attempt', {
          providerName,
          label,
          bytesCopyIsUint8: bytesCopy instanceof Uint8Array,
          arrayBufferExactIsArrayBuffer: arrayBufferExact instanceof ArrayBuffer,
          bufferSliceIsArrayBuffer: bufferSlice instanceof ArrayBuffer,
          bufferCopyIsArrayBuffer: bufferCopy instanceof ArrayBuffer
        });

        const result = await fn();
        if (result) {
          return result;
        }
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        errorLog('[walletProvider.signMessage] attempt error', {
          providerName,
          label,
          error: errMsg,
          bytesCopyIsUint8: bytesCopy instanceof Uint8Array,
          arrayBufferExactIsArrayBuffer: arrayBufferExact instanceof ArrayBuffer
        });
        errors.push(`${label}: ${errMsg}`);
      }
      return null;
    };

    let signed: unknown = null;

    const isWanderInjected = providerName === 'arweaveWallet' || providerName === 'wander';

    if (!signed && signMessageFn) {

      const preferArrayBufferFirst = false;

      if (preferArrayBufferFirst) {
        signed = await attempt('signMessage(Uint8Array)', () => signMessageFn(bytesCopy, { hashAlgorithm: 'SHA-256' }));
        if (signed) successLabel = 'signMessage(Uint8Array)';

        if (!signed) {
          signed = await attempt('signMessage(Uint8Array)', () => signMessageFn(bytesCopy, { hashAlgorithm: 'SHA-256' }));
          if (signed) successLabel = 'signMessage(Uint8Array)';
        }

        if (!signed) {
          signed = await attempt('signMessage(ArrayBufferView:DataView)', () =>
            signMessageFn(new DataView(arrayBufferExact), { hashAlgorithm: 'SHA-256' })
          );
          if (signed) successLabel = 'signMessage(ArrayBufferView:DataView)';
        }

      } else {
        signed = await attempt('signMessage(Uint8Array)', () => signMessageFn(bytesCopy, { hashAlgorithm: 'SHA-256' }));
        if (signed) successLabel = 'signMessage(Uint8Array)';

        if (!signed) {
          signed = await attempt('signMessage(ArrayBufferView:DataView)', () =>
            signMessageFn(new DataView(arrayBufferExact), { hashAlgorithm: 'SHA-256' })
          );
          if (signed) successLabel = 'signMessage(ArrayBufferView:DataView)';
        }

        if (!signed && !isWanderInjected) {
          signed = await attempt('signMessage(ArrayBuffer:exact)', () =>
            signMessageFn(arrayBufferExact, { hashAlgorithm: 'SHA-256' })
          );
          if (signed) successLabel = 'signMessage(ArrayBuffer:exact)';
        }
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

    if (!signed && signMessageFn && !isWanderInjected) {
      const arrayBufferErrorFound = errors.some((e) => /ArrayBuffer/.test(e));
      if (arrayBufferErrorFound) {
        const wrapperAttempts: Array<{ label: string; fn: () => Promise<unknown> }> = [
          { label: 'signMessage({data:ArrayBuffer})', fn: () => signMessageFn({ data: arrayBufferExact }, {}) },
          { label: 'signMessage({message:ArrayBuffer})', fn: () => signMessageFn({ message: arrayBufferExact }, {}) },
          { label: 'signMessage({data:Uint8Array})', fn: () => signMessageFn({ data: bytesCopy }, {}) },
        ];
        for (const wa of wrapperAttempts) {
          const res = await attempt(wa.label, wa.fn);
          if (res) {
            signed = res;
            successLabel = wa.label;
            break;
          }
        }
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
    { name: 'arweaveWallet', provider: win.arweaveWallet },
    { name: 'wander', provider: win.wander },
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
