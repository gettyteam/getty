const path = require('path');
const crypto = require('crypto');
const WebSocket = require('ws');
const { getStorage, STORAGE_PROVIDERS } = require('../lib/storage');

const WUZZY_PROVIDER = 'wuzzy';

function isValidArweaveId(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length < 128 && !/\s/.test(trimmed);
}

function normalizeWuzzySelection(raw = {}) {
  const wuzzyId = typeof raw.wuzzyId === 'string' ? raw.wuzzyId.trim() : '';
  const wuzzyUrlRaw = typeof raw.wuzzyUrl === 'string' ? raw.wuzzyUrl.trim() : '';
  if (!isValidArweaveId(wuzzyId) || !wuzzyUrlRaw) {
    return null;
  }
  let normalizedUrl = '';
  try {
    const parsed = new URL(wuzzyUrlRaw);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    if (parsed.protocol === 'http:') {
      parsed.protocol = 'https:';
    }
    normalizedUrl = parsed.href;
  } catch {
    return null;
  }
  const sizeRaw = Number(raw.wuzzySize);
  const size = Number.isFinite(sizeRaw) ? sizeRaw : Number(raw.wuzzySize) || 0;
  const originalName =
    typeof raw.wuzzyOriginalName === 'string' ? raw.wuzzyOriginalName.trim() : '';
  const mimeType = typeof raw.wuzzyMimeType === 'string' ? raw.wuzzyMimeType.trim() : '';
  const owner = typeof raw.wuzzyOwner === 'string' ? raw.wuzzyOwner.trim() : '';
  const sha256 = typeof raw.wuzzySha256 === 'string' ? raw.wuzzySha256.trim() : '';
  const fingerprint =
    typeof raw.wuzzyFingerprint === 'string' && raw.wuzzyFingerprint.trim()
      ? raw.wuzzyFingerprint.trim()
      : `${wuzzyId}::${size || 0}`;
  return {
    id: wuzzyId,
    url: normalizedUrl,
    size: Math.max(0, size),
    originalName,
    mimeType,
    owner,
    sha256,
    fingerprint,
  };
}

function clearWuzzyMetadata(target = {}) {
  target.wuzzyId = '';
  target.wuzzyUrl = '';
  target.wuzzySize = 0;
  target.wuzzyOriginalName = '';
  target.wuzzyMimeType = '';
  target.wuzzySha256 = '';
  target.wuzzyFingerprint = '';
  return target;
}

function applyWuzzyMetadata(target = {}, source = {}) {
  clearWuzzyMetadata(target);
  target.wuzzyId = source.id || source.wuzzyId || '';
  target.wuzzyUrl = source.url || source.wuzzyUrl || '';
  const rawSize = Number(source.size ?? source.wuzzySize);
  target.wuzzySize = Number.isFinite(rawSize) ? Math.max(0, rawSize) : 0;
  target.wuzzyOriginalName = source.originalName || source.wuzzyOriginalName || '';
  target.wuzzyMimeType = source.mimeType || source.wuzzyMimeType || '';
  target.wuzzySha256 = source.sha256 || source.wuzzySha256 || '';
  target.wuzzyFingerprint = source.fingerprint || source.wuzzyFingerprint || '';
  return target;
}

function buildWuzzyLibraryEntry(selection) {
  if (!selection || !selection.id || !selection.url) return null;
  return {
    id: selection.id,
    url: selection.url,
    size: Math.max(0, Number(selection.size) || 0),
    originalName: selection.originalName || selection.id,
    path: '',
    uploadedAt: new Date().toISOString(),
    mimeType: selection.mimeType || '',
    sha256: selection.sha256 || '',
    fingerprint: selection.fingerprint || `${selection.id}::${selection.size || 0}`,
    owner: selection.owner || '',
    provider: WUZZY_PROVIDER,
  };
}

function registerGoalAudioRoutes(app, wss, strictLimiter, _GOAL_AUDIO_UPLOADS_DIR) {
  const multer = require('multer');
  const multerUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 1024 * 1024 * 1, // 1MB limit
      files: 1,
    },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith('audio/')) {
        cb(null, true);
      } else {
        cb(new Error('Only audio files are allowed'));
      }
    },
  });
  const { isOpenTestMode } = require('../lib/test-open-mode');
  const { loadConfigWithFallback } = require('../lib/tenant');
  const { loadTenantConfig, saveTenantConfig } = require('../lib/tenant-config');

  const LIBRARY_FILE = path.join(process.cwd(), 'config', 'audio-library.json');

  function normalizeProvider(provider) {
    if (!provider || typeof provider !== 'string') return '';
    const lower = provider.trim().toLowerCase();
    if (lower === STORAGE_PROVIDERS.TURBO || lower === 'arweave') {
      return STORAGE_PROVIDERS.TURBO;
    }
    if (lower === STORAGE_PROVIDERS.SUPABASE) {
      return STORAGE_PROVIDERS.SUPABASE;
    }
    if (lower === WUZZY_PROVIDER) {
      return WUZZY_PROVIDER;
    }
    return lower;
  }

  function resolveStore() {
    try {
      if (typeof app?.get === 'function') {
        return app.get('store') || null;
      }
    } catch {}
    return null;
  }

  async function loadLibrary(req) {
    const store = resolveStore();
    try {
      const loaded = await loadTenantConfig(req, store, LIBRARY_FILE, 'audio-library.json');
      const data = loaded.data;
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.items)) return data.items;
      return [];
    } catch (error) {
      console.warn('[goal-audio][library] load error', error.message);
      return [];
    }
  }

  async function saveLibrary(req, items) {
    const store = resolveStore();
    try {
      await saveTenantConfig(req, store, LIBRARY_FILE, 'audio-library.json', items);
    } catch (error) {
      console.warn('[goal-audio][library] save error', error.message);
    }
  }

  async function upsertLibraryEntry(req, entry) {
    if (!entry || !entry.id) return null;
    const current = await loadLibrary(req);
    const filtered = current.filter((item) => item && item.id !== entry.id);
    const updated = [entry, ...filtered];
    const maxItems = 50;
    const trimmed = updated.slice(0, maxItems);
    await saveLibrary(req, trimmed);
    return trimmed;
  }

  async function findLibraryEntry(req, entryId) {
    if (!entryId) return null;
    const items = await loadLibrary(req);
    return items.find((item) => item && item.id === entryId) || null;
  }
  app.get('/api/goal-audio', (req, res) => {
    try {
      const tokenParam =
        typeof req.query?.widgetToken === 'string' && req.query.widgetToken.trim()
          ? req.query.widgetToken.trim()
          : typeof req.query?.token === 'string' && req.query.token.trim()
            ? req.query.token.trim()
            : '';
      if (tokenParam && req.app?.get('store')) {
        try {
          const walletHash = req.app.get('store').get(tokenParam, 'walletHash');
          if (walletHash) {
            req.ns = req.ns || {};
            req.ns.pub = walletHash;
          }
        } catch (e) {
          console.warn('Failed to resolve widgetToken for goal audio:', e.message);
        }
      }

      const ns = req?.ns?.admin || req?.ns?.pub || null;
      const hosted = !!process.env.REDIS_URL || process.env.GETTY_REQUIRE_SESSION === '1';
      if (hosted && !ns) {
        return res.status(404).json({ error: 'No audio file found' });
      }

      const SETTINGS_FILENAME = 'goal-audio-settings.json';
      const GLOBAL_SETTINGS_PATH = path.join(process.cwd(), 'config', SETTINGS_FILENAME);
      let customAudioUrl = null;
      let storageProvider = '';

      try {
        const loaded = loadConfigWithFallback(req, GLOBAL_SETTINGS_PATH, SETTINGS_FILENAME);
        const settings = loaded.data;
        if (settings && settings.audioFileUrl) {
          customAudioUrl = settings.audioFileUrl;
        }
        if (settings && typeof settings.storageProvider === 'string') {
          storageProvider = settings.storageProvider;
        }
      } catch (e) {
        console.warn('Error loading goal audio settings for URL:', e.message);
      }

      if (customAudioUrl && typeof customAudioUrl === 'string') {
        return res.json({ url: customAudioUrl, storageProvider });
      } else {
        return res.json({
          url: 'https://52agquhrbhkx3u72ikhun7oxngtan55uvxqbp4pzmhslirqys6wq.arweave.net/7oBoUPEJ1X3T-kKPRv3XaaYG97St4Bfx-WHktEYYl60',
        });
      }
    } catch (error) {
      console.error('Error serving goal audio:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  const SETTINGS_FILENAME = 'goal-audio-settings.json';
  const GLOBAL_SETTINGS_PATH = path.join(process.cwd(), 'config', SETTINGS_FILENAME);

  function normalizeSettings(raw) {
    const base = raw && typeof raw === 'object' ? raw : {};
    const size = Number.isFinite(base.audioFileSize)
      ? base.audioFileSize
      : Number(base.audioFileSize) || 0;
    const volumeRaw = typeof base.volume === 'number' ? base.volume : parseFloat(base.volume);
    const volume = Number.isFinite(volumeRaw) ? Math.min(Math.max(volumeRaw, 0), 1) : 0.8;
    const enabled = (() => {
      if (typeof base.enabled === 'boolean') return base.enabled;
      if (typeof base.enabled === 'string') {
        const lowered = base.enabled.trim().toLowerCase();
        if (['false', '0', 'off', 'no'].includes(lowered)) return false;
        if (['true', '1', 'on', 'yes'].includes(lowered)) return true;
      }
      return true;
    })();
    const normalized = {
      audioSource: base.audioSource || 'remote',
      hasCustomAudio: !!base.hasCustomAudio,
      audioFileName:
        typeof base.audioFileName === 'string' && base.audioFileName ? base.audioFileName : null,
      audioFileSize: size >= 0 ? size : 0,
      audioFileUrl:
        typeof base.audioFileUrl === 'string' && base.audioFileUrl
          ? base.audioFileUrl
          : typeof base.customAudioUrl === 'string'
            ? base.customAudioUrl
            : null,
      audioFilePath:
        typeof base.audioFilePath === 'string' && base.audioFilePath ? base.audioFilePath : null,
      audioLibraryId: typeof base.audioLibraryId === 'string' ? base.audioLibraryId : '',
      storageProvider: normalizeProvider(base.storageProvider),
      enabled,
      volume,
      wuzzyId: typeof base.wuzzyId === 'string' ? base.wuzzyId : '',
      wuzzyUrl: typeof base.wuzzyUrl === 'string' ? base.wuzzyUrl : '',
      wuzzySize: Number.isFinite(base.wuzzySize) ? base.wuzzySize : Number(base.wuzzySize) || 0,
      wuzzyOriginalName:
        typeof base.wuzzyOriginalName === 'string' ? base.wuzzyOriginalName : '',
      wuzzyMimeType: typeof base.wuzzyMimeType === 'string' ? base.wuzzyMimeType : '',
      wuzzySha256: typeof base.wuzzySha256 === 'string' ? base.wuzzySha256 : '',
      wuzzyFingerprint:
        typeof base.wuzzyFingerprint === 'string' ? base.wuzzyFingerprint : '',
    };
    if (normalized.storageProvider !== WUZZY_PROVIDER) {
      clearWuzzyMetadata(normalized);
    } else {
      normalized.wuzzySize = Math.max(0, Number(normalized.wuzzySize) || 0);
    }

    if (normalized.hasCustomAudio && !normalized.audioFileUrl) {
      normalized.hasCustomAudio = false;
    }

    return normalized;
  }

  app.get('/api/goal-audio-settings/library', async (req, res) => {
    try {
      const requireSessionFlag = process.env.GETTY_REQUIRE_SESSION === '1';
      const hosted = !!process.env.REDIS_URL;
      const hasNs = !!(req?.ns?.admin || req?.ns?.pub);
      if (!isOpenTestMode() && (requireSessionFlag || hosted) && !hasNs) {
        return res.status(401).json({ error: 'no_session' });
      }
      const items = await loadLibrary(req);
      res.json({ items });
    } catch (error) {
      console.error('[goal-audio][library] list error', error.message);
      res.status(500).json({ error: 'audio_library_list_failed' });
    }
  });

  app.delete('/api/goal-audio-settings/library/:id', async (req, res) => {
    try {
      const requireSessionFlag = process.env.GETTY_REQUIRE_SESSION === '1';
      const hosted = !!process.env.REDIS_URL;
      const hasNs = !!(req?.ns?.admin || req?.ns?.pub);
      if (!isOpenTestMode() && (requireSessionFlag || hosted) && !hasNs) {
        return res.status(401).json({ error: 'no_session' });
      }
      const requireAdminWrites = process.env.GETTY_REQUIRE_ADMIN_WRITE === '1' || !!process.env.REDIS_URL;
      if (requireAdminWrites) {
        const isAdmin = !!(req?.auth && req.auth.isAdmin);
        if (!isAdmin) return res.status(401).json({ error: 'admin_required' });
      }

      const entryId = typeof req.params?.id === 'string' ? req.params.id.trim() : '';
      if (!entryId) {
        return res.status(400).json({ error: 'invalid_library_id' });
      }

      const items = await loadLibrary(req);
      const target = items.find((item) => item && item.id === entryId) || null;
      if (!target) {
        return res.status(404).json({ error: 'audio_library_item_not_found' });
      }

      const providerId = normalizeProvider(target.provider);
      if (
        providerId &&
        providerId !== STORAGE_PROVIDERS.SUPABASE &&
        providerId !== WUZZY_PROVIDER
      ) {
        return res.status(400).json({ error: 'audio_library_delete_unsupported' });
      }

      if (providerId === STORAGE_PROVIDERS.SUPABASE && target.path) {
        try {
          const storageInstance = getStorage(STORAGE_PROVIDERS.SUPABASE);
          if (storageInstance && storageInstance.provider === STORAGE_PROVIDERS.SUPABASE) {
            await storageInstance.deleteFile('tip-goal-audio', target.path);
          }
        } catch (deleteError) {
          console.warn('[goal-audio][library] failed to delete Supabase file:', deleteError.message);
        }
      }

      const updatedItems = items.filter((item) => item && item.id !== entryId);
      await saveLibrary(req, updatedItems);

      let settingsPayload = null;
      let currentSettings = normalizeSettings({});
      try {
        const loaded = await loadTenantConfig(req, resolveStore(), GLOBAL_SETTINGS_PATH, SETTINGS_FILENAME);
        if (loaded.data) currentSettings = normalizeSettings(loaded.data);
      } catch (e) {
        console.warn('[goal-audio][library] failed to load settings for reset check', e.message);
      }

      if (currentSettings.audioLibraryId === entryId) {
        const merged = normalizeSettings({
          ...currentSettings,
          audioSource: 'remote',
          hasCustomAudio: false,
          audioFileName: null,
          audioFileSize: 0,
          audioFileUrl: null,
          audioFilePath: null,
          audioLibraryId: '',
          storageProvider: '',
        });
        clearWuzzyMetadata(merged);
        await saveTenantConfig(req, resolveStore(), GLOBAL_SETTINGS_PATH, SETTINGS_FILENAME, merged);
        settingsPayload = merged;
      }

      if (settingsPayload) {
        try {
          const ns = req?.ns?.admin || req?.ns?.pub || null;
          if (ns && wss) {
            if (typeof wss.broadcast === 'function') {
              wss.broadcast(ns, { type: 'goalAudioSettingsUpdate', data: settingsPayload });
            } else {
              wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(
                    JSON.stringify({ type: 'goalAudioSettingsUpdate', data: settingsPayload })
                  );
                }
              });
            }
          } else if (wss) {
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'goalAudioSettingsUpdate', data: settingsPayload }));
              }
            });
          }
        } catch (broadcastError) {
          console.warn('Error broadcasting goal audio settings update:', broadcastError);
        }
      }

      res.json({ success: true });
    } catch (error) {
      console.error('[goal-audio][library] delete error', error.message);
      res.status(500).json({ error: 'audio_library_delete_failed' });
    }
  });

  app.get('/api/goal-audio-settings', async (req, res) => {
    try {
      const tokenParam =
        typeof req.query?.widgetToken === 'string' && req.query.widgetToken.trim()
          ? req.query.widgetToken.trim()
          : typeof req.query?.token === 'string' && req.query.token.trim()
            ? req.query.token.trim()
            : '';
      if (tokenParam && req.app?.get('store')) {
        try {
          const walletHash = req.app.get('store').get(tokenParam, 'walletHash');
          if (walletHash) {
            req.ns = req.ns || {};
            req.ns.pub = walletHash;
          }
        } catch (e) {
          console.warn('Failed to resolve widgetToken for goal audio settings:', e.message);
        }
      }

      const requireSessionFlag = process.env.GETTY_REQUIRE_SESSION === '1';
      const hosted = !!process.env.REDIS_URL;
      const hasNs = !!(req?.ns?.admin || req?.ns?.pub);
      if (!isOpenTestMode() && (requireSessionFlag || hosted) && !hasNs) {
        return res.json({ audioSource: 'remote', hasCustomAudio: false });
      }

      const store = resolveStore();
      if (store && store.isConfigBlocked && await store.isConfigBlocked(req?.ns?.admin || req?.ns?.pub, SETTINGS_FILENAME)) {
        return res.status(403).json({ error: 'configuration_blocked', details: 'This configuration has been blocked by moderation.' });
      }

      try {
        const loaded = await loadTenantConfig(req, resolveStore(), GLOBAL_SETTINGS_PATH, SETTINGS_FILENAME);
        const raw = loaded.data;
        const meta = loaded.meta || (loaded.tenantPath ? { source: 'tenant' } : { source: 'global' });
        const flat = normalizeSettings(raw || {});
        const libraryItem = flat.audioLibraryId
          ? await findLibraryEntry(req, flat.audioLibraryId)
          : null;
        return res.json(meta ? { meta, libraryItem, ...flat } : { libraryItem, ...flat });
      } catch (e) {
        console.error('Error loading goal audio settings (tenant):', e);
        return res.json({ audioSource: 'remote', hasCustomAudio: false });
      }
    } catch (error) {
      console.error('Error loading goal audio settings:', error);
      res.status(500).json({ error: 'Error loading settings' });
    }
  });

  app.post(
    '/api/goal-audio-settings',
    strictLimiter,
    multerUpload.single('audioFile'),
    async (req, res) => {
      try {
        const requireSessionFlag = process.env.GETTY_REQUIRE_SESSION === '1';
        const hosted = !!process.env.REDIS_URL;
        const hasNs = !!(req?.ns?.admin || req?.ns?.pub);
        if (!isOpenTestMode() && (requireSessionFlag || hosted) && !hasNs) {
          return res.status(401).json({ error: 'no_session' });
        }

        const store = resolveStore();
        if (store && store.isConfigBlocked && await store.isConfigBlocked(req?.ns?.admin || req?.ns?.pub, SETTINGS_FILENAME)) {
          return res.status(403).json({ error: 'configuration_blocked', details: 'This configuration has been blocked by moderation.' });
        }

        const requireAdminWrites = process.env.GETTY_REQUIRE_ADMIN_WRITE === '1' || hosted;
        if (requireAdminWrites) {
          const isAdmin = !!(req?.auth && req.auth.isAdmin);
          if (!isAdmin) return res.status(401).json({ error: 'admin_required' });
        }

        const { audioSource } = req.body;
        const requestedStorageProviderRaw =
          typeof req.body.storageProvider === 'string' ? req.body.storageProvider : '';
        const preferredProvider = normalizeProvider(requestedStorageProviderRaw);
        const wuzzySelection = normalizeWuzzySelection(req.body);
        if (!audioSource || (audioSource !== 'remote' && audioSource !== 'custom')) {
          return res.status(400).json({ error: 'Invalid audio source' });
        }

        const selectedAudioIdRaw = req.body.selectedAudioId;
        const selectedAudioId =
          typeof selectedAudioIdRaw === 'string' && selectedAudioIdRaw.trim()
            ? selectedAudioIdRaw.trim()
            : '';

        const current = await loadTenantConfig(req, resolveStore(), GLOBAL_SETTINGS_PATH, SETTINGS_FILENAME);
        const currentData = normalizeSettings(current.data || {});
        const ns = req?.ns?.admin || req?.ns?.pub || null;

        const settings = {
          audioSource,
          storageProvider: currentData.storageProvider,
          hasCustomAudio: currentData.hasCustomAudio,
          audioFileName: currentData.audioFileName,
          audioFileSize: currentData.audioFileSize,
          audioFileUrl: currentData.audioFileUrl,
          audioFilePath: currentData.audioFilePath,
          audioLibraryId: currentData.audioLibraryId,
          enabled: typeof currentData.enabled === 'boolean' ? currentData.enabled : true,
          volume: Number.isFinite(currentData.volume) ? currentData.volume : 0.8,
        };
        clearWuzzyMetadata(settings);
        let libraryItem = null;

        if (Object.prototype.hasOwnProperty.call(req.body, 'enabled')) {
          const rawEnabled = req.body.enabled;
          if (typeof rawEnabled === 'boolean') {
            settings.enabled = rawEnabled;
          } else if (typeof rawEnabled === 'string') {
            const lowered = rawEnabled.trim().toLowerCase();
            if (['false', '0', 'off', 'no'].includes(lowered)) settings.enabled = false;
            if (['true', '1', 'on', 'yes'].includes(lowered)) settings.enabled = true;
          }
        }
        if (Object.prototype.hasOwnProperty.call(req.body, 'volume')) {
          const parsedVolume = parseFloat(req.body.volume);
          if (Number.isFinite(parsedVolume)) {
            settings.volume = Math.min(Math.max(parsedVolume, 0), 1);
          }
        }

        const wantsWuzzySelection = audioSource === 'custom' && preferredProvider === WUZZY_PROVIDER;

        if (wantsWuzzySelection) {
          const normalizedWuzzy = wuzzySelection;
          if (!normalizedWuzzy) {
            return res.status(400).json({ error: 'invalid_wuzzy_selection' });
          }
          const wuzzyLibraryItem = buildWuzzyLibraryEntry(normalizedWuzzy);
          if (!wuzzyLibraryItem) {
            return res.status(400).json({ error: 'invalid_wuzzy_selection' });
          }
          await upsertLibraryEntry(req, wuzzyLibraryItem);
          libraryItem = wuzzyLibraryItem;
          settings.hasCustomAudio = true;
          settings.audioFileName = wuzzyLibraryItem.originalName || wuzzyLibraryItem.id;
          settings.audioFileSize = Number(wuzzyLibraryItem.size) || 0;
          settings.audioFileUrl = wuzzyLibraryItem.url || null;
          settings.audioFilePath = null;
          settings.audioLibraryId = wuzzyLibraryItem.id;
          settings.storageProvider = WUZZY_PROVIDER;
          applyWuzzyMetadata(settings, wuzzyLibraryItem);
        } else if (audioSource === 'custom' && req.file) {
          const nsSafe = ns ? ns.replace(/[^a-zA-Z0-9_-]/g, '_') : 'global';
          const fileName = `goal-audio-${nsSafe}-${Date.now()}.mp3`;

          const shouldDeleteStoredFile = currentData.audioFilePath && !currentData.audioLibraryId;
          if (
            shouldDeleteStoredFile &&
            normalizeProvider(currentData.storageProvider) === STORAGE_PROVIDERS.SUPABASE
          ) {
            try {
              const storage = getStorage(STORAGE_PROVIDERS.SUPABASE);
              if (storage && storage.provider === STORAGE_PROVIDERS.SUPABASE) {
                await storage.deleteFile('tip-goal-audio', currentData.audioFilePath);
              }
            } catch (deleteError) {
              console.warn(
                '[goal-audio] failed to delete previous audio from Supabase:',
                deleteError.message
              );
            }
          }

          const storage = getStorage(preferredProvider || undefined);
          if (!storage) {
            throw new Error('Storage service not configured');
          }
          const fileBuffer = req.file.buffer || Buffer.alloc(0);
          const fileHash = fileBuffer.length
            ? crypto.createHash('sha256').update(fileBuffer).digest('hex')
            : '';
          const normalizedName = (req.file.originalname || fileName || '').toLowerCase();
          const fingerprint = `${normalizedName}::${req.file.size || 0}`;

          try {
            const uploadResult = await storage.uploadFile('tip-goal-audio', fileName, fileBuffer, {
              contentType: req.file.mimetype || 'audio/mpeg',
            });

            const providerId = normalizeProvider(
              uploadResult.provider || storage.provider || preferredProvider
            );
            const derivedId =
              uploadResult.fileName ||
              uploadResult.path ||
              uploadResult.transactionId ||
              fingerprint ||
              `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

            libraryItem = {
              id: derivedId,
              url: uploadResult.publicUrl,
              size: Number(req.file.size) || Number(uploadResult.size) || 0,
              originalName:
                req.file.originalname ||
                uploadResult.originalName ||
                uploadResult.fileName ||
                derivedId,
              path: uploadResult.path || uploadResult.fileName || derivedId,
              uploadedAt: new Date().toISOString(),
              mimeType: req.file.mimetype || 'audio/mpeg',
              sha256: fileHash,
              fingerprint,
              provider: providerId,
            };

            await upsertLibraryEntry(req, libraryItem);

            settings.hasCustomAudio = true;
            settings.audioFileName = libraryItem.originalName;
            settings.audioFileSize = libraryItem.size;
            settings.audioFileUrl = libraryItem.url;
            settings.audioFilePath = libraryItem.path;
            settings.audioLibraryId = libraryItem.id;
            settings.storageProvider = providerId;
          } catch (uploadError) {
            console.error('Error uploading goal audio file:', uploadError);
            if (uploadError.code === 'TURBO_FILE_TOO_LARGE') {
              return res.status(400).json({ error: 'File too large for free upload. Maximum 100KB. Try using a smaller image or switch to Supabase storage.' });
            }
            if (uploadError.code === 'TURBO_INSUFFICIENT_BALANCE') {
              return res.status(400).json({ error: 'Upload not possible with Turbo. Please switch to Supabase storage.' });
            }
            return res.status(500).json({ error: 'Error uploading goal audio file' });
          }
        } else if (audioSource === 'custom' && selectedAudioId) {
          try {
            const entry = await findLibraryEntry(req, selectedAudioId);
            if (!entry) {
              return res.status(404).json({ error: 'audio_library_item_not_found' });
            }
            const providerId = normalizeProvider(entry.provider);
            libraryItem = entry;
            settings.hasCustomAudio = true;
            settings.audioFileName = entry.originalName || entry.id;
            settings.audioFileSize = Number(entry.size) || 0;
            settings.audioFileUrl = entry.url || null;
            settings.audioFilePath = entry.path || entry.id || null;
            settings.audioLibraryId = entry.id;
            settings.storageProvider = providerId;
            if (providerId === WUZZY_PROVIDER) {
              settings.audioFilePath = null;
              applyWuzzyMetadata(settings, {
                id: entry.id,
                url: entry.url,
                size: entry.size,
                originalName: entry.originalName,
                mimeType: entry.mimeType,
                sha256: entry.sha256,
                fingerprint: entry.fingerprint,
              });
            } else {
              clearWuzzyMetadata(settings);
            }
          } catch (lookupError) {
            console.error('[goal-audio][library] lookup error', lookupError.message);
            return res.status(500).json({ error: 'audio_library_lookup_failed' });
          }
        } else if (audioSource === 'remote') {
          const shouldDeleteStoredFile = currentData.audioFilePath && !currentData.audioLibraryId;
          if (
            shouldDeleteStoredFile &&
            normalizeProvider(currentData.storageProvider) === STORAGE_PROVIDERS.SUPABASE
          ) {
            try {
              const storage = getStorage(STORAGE_PROVIDERS.SUPABASE);
              if (storage && storage.provider === STORAGE_PROVIDERS.SUPABASE) {
                await storage.deleteFile('tip-goal-audio', currentData.audioFilePath);
              }
            } catch (deleteError) {
              console.warn('Error deleting old goal audio file from Supabase:', deleteError);
            }
          }
          settings.hasCustomAudio = false;
          settings.audioFileName = null;
          settings.audioFileSize = 0;
          settings.audioFileUrl = null;
          settings.audioFilePath = null;
          settings.audioLibraryId = '';
          settings.storageProvider = '';
          clearWuzzyMetadata(settings);
        }

        const next = normalizeSettings({ ...currentData, ...settings });
        const saveRes = await saveTenantConfig(
          req,
          resolveStore(),
          GLOBAL_SETTINGS_PATH,
          SETTINGS_FILENAME,
          next
        );

        try {
          const nsForBroadcast = req?.ns?.admin || req?.ns?.pub || null;
          if (nsForBroadcast) {
            if (typeof wss.broadcast === 'function') {
              wss.broadcast(nsForBroadcast, { type: 'goalAudioSettingsUpdate', data: next });
            } else {
              wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({ type: 'goalAudioSettingsUpdate', data: next }));
                }
              });
            }
          } else {
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'goalAudioSettingsUpdate', data: next }));
              }
            });
          }
        } catch (broadcastError) {
          console.warn('Error broadcasting goal audio settings update:', broadcastError);
        }

        return res.json({ success: true, meta: saveRes.meta, ...next, libraryItem });
      } catch (error) {
        console.error('Error saving goal audio settings:', error);
        res.status(500).json({ error: 'Error saving settings' });
      }
    }
  );

  app.delete('/api/goal-audio-settings', strictLimiter, async (req, res) => {
    try {
      const requireSessionFlag = process.env.GETTY_REQUIRE_SESSION === '1';
      const hostedWithRedis = !!process.env.REDIS_URL;
      const shouldRequireSession = requireSessionFlag || hostedWithRedis;
      const requireAdminWrites = process.env.GETTY_REQUIRE_ADMIN_WRITE === '1' || hostedWithRedis;

      if (!isOpenTestMode() && shouldRequireSession) {
        const nsCheck = req?.ns?.admin || req?.ns?.pub || null;
        if (!nsCheck) return res.status(401).json({ error: 'session_required' });
      }
      if (requireAdminWrites) {
        const isAdmin = !!(req?.auth && req.auth.isAdmin);
        if (!isAdmin) return res.status(401).json({ error: 'admin_required' });
      }

      try {
        const loaded = await loadTenantConfig(req, resolveStore(), GLOBAL_SETTINGS_PATH, SETTINGS_FILENAME);
        const data = loaded.data;
        if (
          data &&
          data.audioFilePath &&
          typeof data.audioFilePath === 'string' &&
          (!data.audioLibraryId || !data.audioLibraryId.length) &&
          normalizeProvider(data.storageProvider) === STORAGE_PROVIDERS.SUPABASE
        ) {
          const storage = getStorage(STORAGE_PROVIDERS.SUPABASE);
          if (storage && storage.provider === STORAGE_PROVIDERS.SUPABASE) {
            storage.deleteFile('tip-goal-audio', data.audioFilePath).catch((deleteError) => {
              console.warn('Failed to delete goal audio from Supabase:', deleteError.message);
            });
          }
        }
      } catch (configError) {
        console.warn('Error loading config for audio deletion:', configError.message);
      }

      try {
        const next = {
            audioSource: 'remote',
            hasCustomAudio: false,
            audioFileName: null,
            audioFileSize: 0,
            audioFileUrl: null,
            audioFilePath: null,
            audioLibraryId: '',
            storageProvider: '',
            enabled: true,
            volume: 0.8,
          };
          clearWuzzyMetadata(next);
          const saveRes = await saveTenantConfig(
            req,
            resolveStore(),
            GLOBAL_SETTINGS_PATH,
            SETTINGS_FILENAME,
            next
          );

          try {
            const ns = req?.ns?.admin || req?.ns?.pub || null;
            if (ns) {
              if (typeof wss.broadcast === 'function') {
                wss.broadcast(ns, { type: 'goalAudioSettingsUpdate', data: next });
              } else {
                wss.clients.forEach((client) => {
                  if (client.readyState === WebSocket.OPEN)
                    client.send(JSON.stringify({ type: 'goalAudioSettingsUpdate', data: next }));
                });
              }
            } else {
              wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN)
                  client.send(JSON.stringify({ type: 'goalAudioSettingsUpdate', data: next }));
              });
            }
          } catch (broadcastError) {
            console.warn('Error broadcasting goal audio settings reset:', broadcastError);
          }

          return res.json({ success: true, meta: saveRes.meta, ...next });
        } catch (e) {
          console.error('Error resetting goal audio settings (tenant):', e);
          return res.json({ success: true, audioSource: 'remote', hasCustomAudio: false });
        }
    } catch (error) {
      console.error('Error deleting goal audio:', error);
      res.status(500).json({ error: 'Error deleting audio' });
    }
  });

  app.get('/api/goal-custom-audio', async (req, res) => {
    try {
      const ns = req?.ns?.admin || req?.ns?.pub || null;
      const hosted = !!process.env.REDIS_URL || process.env.GETTY_REQUIRE_SESSION === '1';
      if (!isOpenTestMode() && hosted && !ns) {
        return res.status(404).json({ error: 'Custom goal audio not found' });
      }

      let customAudioUrl = null;
      let storageProvider = '';
      try {
        const loaded = await loadTenantConfig(req, resolveStore(), GLOBAL_SETTINGS_PATH, SETTINGS_FILENAME);
        const data = loaded.data;
        if (data && data.audioFileUrl) {
          customAudioUrl = data.audioFileUrl;
        }
        if (data && typeof data.storageProvider === 'string') {
          storageProvider = data.storageProvider;
        }
      } catch (e) {
        console.warn('Error loading goal audio settings for URL:', e.message);
      }

      if (customAudioUrl && typeof customAudioUrl === 'string') {
        return res.json({ url: customAudioUrl, storageProvider });
      } else {
        return res.status(404).json({ error: 'Custom goal audio not found' });
      }
    } catch (error) {
      console.error('Error serving custom goal audio:', error);
      res.status(500).json({ error: 'Error serving custom goal audio' });
    }
  });
}

module.exports = registerGoalAudioRoutes;
