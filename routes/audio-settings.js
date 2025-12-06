const path = require('path');
const crypto = require('crypto');
const WebSocket = require('ws');
const { getStorage, STORAGE_PROVIDERS } = require('../lib/storage');
const { loadTenantConfig, saveTenantConfig } = require('../lib/tenant-config');

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

function normalizeProvider(provider) {
  if (!provider || typeof provider !== 'string') return '';
  const lower = provider.trim().toLowerCase();
  if (lower === STORAGE_PROVIDERS.TURBO || lower === 'arweave') return STORAGE_PROVIDERS.TURBO;
  if (lower === STORAGE_PROVIDERS.SUPABASE) return STORAGE_PROVIDERS.SUPABASE;
  if (lower === WUZZY_PROVIDER) return WUZZY_PROVIDER;
  return lower;
}

function ensureSettingsShape(raw = {}) {
  const src = raw.audioSource === 'custom' ? 'custom' : 'remote';
  const size = Number.isFinite(raw.audioFileSize)
    ? raw.audioFileSize
    : Number(raw.audioFileSize) || 0;
  const volRaw = Number.isFinite(raw.volume) ? raw.volume : parseFloat(raw.volume);
  const volume = Number.isFinite(volRaw) ? Math.max(0, Math.min(1, volRaw)) : 0.5;
  const normalized = {
    audioSource: src,
    hasCustomAudio: !!raw.hasCustomAudio,
    audioFileName:
      typeof raw.audioFileName === 'string' && raw.audioFileName ? raw.audioFileName : null,
    audioFileSize: size >= 0 ? size : 0,
    audioFileUrl:
      typeof raw.audioFileUrl === 'string' && raw.audioFileUrl ? raw.audioFileUrl : null,
    audioFilePath:
      typeof raw.audioFilePath === 'string' && raw.audioFilePath ? raw.audioFilePath : null,
    audioLibraryId: typeof raw.audioLibraryId === 'string' ? raw.audioLibraryId : '',
    storageProvider: normalizeProvider(raw.storageProvider),
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : true,
    volume,
    wuzzyId: typeof raw.wuzzyId === 'string' ? raw.wuzzyId : '',
    wuzzyUrl: typeof raw.wuzzyUrl === 'string' ? raw.wuzzyUrl : '',
    wuzzySize: Number.isFinite(raw.wuzzySize) ? raw.wuzzySize : Number(raw.wuzzySize) || 0,
    wuzzyOriginalName:
      typeof raw.wuzzyOriginalName === 'string' ? raw.wuzzyOriginalName : '',
    wuzzyMimeType: typeof raw.wuzzyMimeType === 'string' ? raw.wuzzyMimeType : '',
    wuzzySha256: typeof raw.wuzzySha256 === 'string' ? raw.wuzzySha256 : '',
    wuzzyFingerprint:
      typeof raw.wuzzyFingerprint === 'string' ? raw.wuzzyFingerprint : '',
  };
  if (normalized.storageProvider !== WUZZY_PROVIDER) {
    clearWuzzyMetadata(normalized);
  } else {
    normalized.wuzzySize = Math.max(0, Number(normalized.wuzzySize) || 0);
  }
  return normalized;
}

function registerAudioSettingsRoutes(
  app,
  wss,
  audioUpload,
  AUDIO_UPLOADS_DIR,
  AUDIO_CONFIG_FILE = './audio-settings.json',
  { store } = {}
) {
  const { isOpenTestMode } = require('../lib/test-open-mode');
  const requireAdminWrites =
    process.env.GETTY_REQUIRE_ADMIN_WRITE === '1' || !!process.env.REDIS_URL;
  const LIBRARY_FILE = path.join(process.cwd(), 'config', 'audio-library.json');

  async function loadLibrary(req) {
    try {
      const loaded = await loadTenantConfig(req, store, LIBRARY_FILE, 'audio-library.json');
      const data = loaded.data;
      const list = Array.isArray(data)
        ? data
        : data && Array.isArray(data.items)
          ? data.items
          : [];
      return list;
    } catch (error) {
      console.warn('[audio-library] load error', error.message);
      return [];
    }
  }

  async function saveLibrary(req, items) {
    try {
      await saveTenantConfig(req, store, LIBRARY_FILE, 'audio-library.json', items);
    } catch (error) {
      console.warn('[audio-library] save error', error.message);
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

  app.get('/api/audio-settings', async (req, res) => {
    try {
      const requireSessionFlag = process.env.GETTY_REQUIRE_SESSION === '1';
      const hosted = !!process.env.REDIS_URL;
      const hasNs = !!(req?.ns?.admin || req?.ns?.pub);
      if (!isOpenTestMode() && (requireSessionFlag || hosted) && !hasNs) {
        const sanitized = ensureSettingsShape({
          audioSource: 'remote',
          hasCustomAudio: false,
          enabled: true,
          volume: 0.5,
        });
        return res.json({ ...sanitized, libraryItem: null });
      }

      let settings = ensureSettingsShape({});

      if (store && store.isConfigBlocked) {
        const ns = req?.ns?.admin || req?.ns?.pub;
        if (await store.isConfigBlocked(ns, 'audio-settings.json')) {
          return res.status(403).json({ error: 'configuration_blocked', details: 'This configuration has been blocked by moderation.' });
        }
      }

      try {
        const loaded = await loadTenantConfig(req, store, AUDIO_CONFIG_FILE, 'audio-settings.json');
        const data = loaded.data;
        if (data) {
          settings = ensureSettingsShape(data);
        }
      } catch (error) {
        console.error('Error loading tenant audio settings:', error);
      }

      const libraryItem = settings.audioLibraryId
        ? await findLibraryEntry(req, settings.audioLibraryId)
        : null;
      res.json({ ...settings, libraryItem });
    } catch (error) {
      console.error('Error getting audio settings:', error);
      res.status(500).json({ error: 'Error al cargar configuración de audio' });
    }
  });

  app.get('/api/audio-settings/library', async (req, res) => {
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
      console.error('[audio-library] list error', error.message);
      res.status(500).json({ error: 'audio_library_list_failed' });
    }
  });

  app.post('/api/audio-settings', audioUpload.single('audioFile'), async (req, res) => {
    try {
      const requireSessionFlag = process.env.GETTY_REQUIRE_SESSION === '1';
      const hosted = !!process.env.REDIS_URL;
      const hasNs = !!(req?.ns?.admin || req?.ns?.pub);
      if (!isOpenTestMode() && (requireSessionFlag || hosted) && !hasNs) {
        return res.status(401).json({ error: 'no_session' });
      }
      if (requireAdminWrites) {
        const isAdmin = !!(req?.auth && req.auth.isAdmin);
        if (!isAdmin) return res.status(401).json({ error: 'admin_required' });
      }
      const ns = req?.ns?.admin || req?.ns?.pub || null;

      if (store && store.isConfigBlocked && await store.isConfigBlocked(ns, 'audio-settings.json')) {
        return res.status(403).json({ error: 'configuration_blocked', details: 'This configuration has been blocked by moderation.' });
      }

      const { audioSource } = req.body;
      const selectedAudioIdRaw = req.body.selectedAudioId;
      const selectedAudioId =
        typeof selectedAudioIdRaw === 'string' && selectedAudioIdRaw.trim()
          ? selectedAudioIdRaw.trim()
          : '';
      const preferredProviderRaw =
        typeof req.body.storageProvider === 'string' ? req.body.storageProvider : '';
      const preferredProvider = normalizeProvider(preferredProviderRaw);
      const wuzzySelection = normalizeWuzzySelection(req.body);

      if (!audioSource || (audioSource !== 'remote' && audioSource !== 'custom')) {
        return res.status(400).json({ error: 'Invalid audio source' });
      }

      let libraryItem = null;
      let currentSettings = null;
      try {
        const loaded = await loadTenantConfig(req, store, AUDIO_CONFIG_FILE, 'audio-settings.json');
        const data = loaded.data;
        currentSettings = ensureSettingsShape(data);
      } catch (error) {
        console.error('Error loading current tenant audio settings:', error);
        currentSettings = ensureSettingsShape({});
      }

      const settings = {
        audioSource,
        storageProvider: normalizeProvider(currentSettings?.storageProvider),
      };
      clearWuzzyMetadata(settings);

      if (Object.prototype.hasOwnProperty.call(req.body, 'enabled')) {
        settings.enabled = req.body.enabled === 'true' || req.body.enabled === true ? true : false;
      }
      if (Object.prototype.hasOwnProperty.call(req.body, 'volume')) {
        const vol = parseFloat(req.body.volume);
        if (!isNaN(vol)) settings.volume = Math.max(0, Math.min(1, vol));
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
        const fileName = `custom-notification-audio-${ns ? ns.replace(/[^a-zA-Z0-9_-]/g, '_') : 'global'}-${Date.now()}.mp3`;

        try {
          const storageInstance = getStorage(preferredProvider || undefined);
          if (!storageInstance) {
            throw new Error('Storage service not configured');
          }

          const fileBuffer = req.file.buffer || Buffer.alloc(0);
          const fileHash =
            fileBuffer && fileBuffer.length
              ? crypto.createHash('sha256').update(fileBuffer).digest('hex')
              : '';
          const normalizedName = (req.file.originalname || fileName || '').toLowerCase();
          const fingerprint = `${normalizedName}::${req.file.size || 0}`;
          const uploadResult = await storageInstance.uploadFile(
            'tip-goal-audio',
            fileName,
            fileBuffer,
            {
              contentType: req.file.mimetype || 'audio/mpeg',
            }
          );

          const providerId = normalizeProvider(
            uploadResult.provider || storageInstance.provider || preferredProvider
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

          settings.hasCustomAudio = true;
          settings.audioFileName = libraryItem.originalName;
          settings.audioFileSize = libraryItem.size;
          settings.audioFileUrl = libraryItem.url;
          settings.audioFilePath = libraryItem.path;
          settings.audioLibraryId = libraryItem.id;
          settings.storageProvider = providerId;
          clearWuzzyMetadata(settings);
          await upsertLibraryEntry(req, libraryItem);
        } catch (uploadError) {
          console.error('Error uploading audio file:', uploadError);
          if (uploadError.code === 'TURBO_FILE_TOO_LARGE') {
            return res.status(400).json({ error: 'File too large for free upload. Maximum 100KB. Try using a smaller file or switch to Supabase storage.' });
          }
          if (uploadError.code === 'TURBO_INSUFFICIENT_BALANCE') {
            return res.status(400).json({ error: 'Upload not possible with Turbo. Please switch to Supabase storage.' });
          }
          return res.status(500).json({ error: 'Error uploading audio file' });
        }
      } else if (audioSource === 'custom' && selectedAudioId) {
        try {
          const entry = await findLibraryEntry(req, selectedAudioId);
          if (!entry) {
            return res.status(404).json({ error: 'audio_library_item_not_found' });
          }
          const providerId = normalizeProvider(entry.provider);
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
          libraryItem = entry;
        } catch (lookupError) {
          console.error('[audio-library] lookup error', lookupError.message);
          return res.status(500).json({ error: 'audio_library_lookup_failed' });
        }
      } else if (audioSource === 'remote') {
        const shouldDeleteStoredFile =
          currentSettings.audioFilePath && !currentSettings.audioLibraryId;
        if (
          shouldDeleteStoredFile &&
          normalizeProvider(currentSettings.storageProvider) === STORAGE_PROVIDERS.SUPABASE
        ) {
          try {
            const storageInstance = getStorage(STORAGE_PROVIDERS.SUPABASE);
            if (storageInstance && storageInstance.provider === STORAGE_PROVIDERS.SUPABASE) {
              await storageInstance.deleteFile('tip-goal-audio', currentSettings.audioFilePath);
            }
          } catch (deleteError) {
            console.warn('Error deleting old audio file from Supabase:', deleteError);
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

      let payload = null;

      const merged = ensureSettingsShape({ ...currentSettings, ...settings });
      try {
        await saveTenantConfig(req, store, AUDIO_CONFIG_FILE, 'audio-settings.json', merged);
        payload = merged;
      } catch (error) {
        console.error('Error saving audio configuration:', error);
        return res.status(500).json({ error: 'Error saving audio configuration' });
      }

      try {
        if (ns && store) {
          if (typeof wss.broadcast === 'function') {
            wss.broadcast(ns, { type: 'audioSettingsUpdate', data: payload });
          } else {
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'audioSettingsUpdate', data: payload }));
              }
            });
          }
        } else {
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: 'audioSettingsUpdate', data: payload }));
            }
          });
        }
      } catch (broadcastError) {
        console.warn('Error broadcasting audio settings update:', broadcastError);
      }

      res.json({
        success: true,
        message: 'Audio configuration successfully saved',
        settings: payload,
        libraryItem,
      });
    } catch (error) {
      console.error('Error saving audio settings:', error);
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'The file is too large. Maximum 1MB.' });
      }
      if (error.message === 'Only MP3 files are allowed') {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.delete('/api/audio-settings/library/:id', async (req, res) => {
    try {
      const requireSessionFlag = process.env.GETTY_REQUIRE_SESSION === '1';
      const hosted = !!process.env.REDIS_URL;
      const hasNs = !!(req?.ns?.admin || req?.ns?.pub);
      if (!isOpenTestMode() && (requireSessionFlag || hosted) && !hasNs) {
        return res.status(401).json({ error: 'no_session' });
      }
      if (requireAdminWrites) {
        const isAdmin = !!(req?.auth && req.auth.isAdmin);
        if (!isAdmin) return res.status(401).json({ error: 'admin_required' });
      }

      const ns = req?.ns?.admin || req?.ns?.pub || null;
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
      const allowVirtualDelete = providerId === WUZZY_PROVIDER;
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
          console.warn('[audio-library] failed to delete Supabase file:', deleteError.message);
        }
      } else if (allowVirtualDelete) {
        // No-op: Wuzzy selections point to external assets and don't require remote deletion.
      }

      const updatedItems = items.filter((item) => item && item.id !== entryId);
      await saveLibrary(req, updatedItems);

      let settingsPayload = null;
      let currentSettings = ensureSettingsShape({});
      try {
        const loaded = await loadTenantConfig(req, store, AUDIO_CONFIG_FILE, 'audio-settings.json');
        if (loaded.data) currentSettings = ensureSettingsShape(loaded.data);
      } catch (e) {
        console.warn('[audio-library] failed to load settings for reset check', e.message);
      }

      if (currentSettings.audioLibraryId === entryId) {
        const merged = ensureSettingsShape({
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
        await saveTenantConfig(req, store, AUDIO_CONFIG_FILE, 'audio-settings.json', merged);
        settingsPayload = merged;
      }

      if (settingsPayload) {
        try {
          if (ns && store) {
            if (typeof wss.broadcast === 'function') {
              wss.broadcast(ns, { type: 'audioSettingsUpdate', data: settingsPayload });
            } else {
              wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(
                    JSON.stringify({ type: 'audioSettingsUpdate', data: settingsPayload })
                  );
                }
              });
            }
          } else {
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'audioSettingsUpdate', data: settingsPayload }));
              }
            });
          }
        } catch (broadcastError) {
          console.warn(
            'Error broadcasting audio settings update after library delete:',
            broadcastError
          );
        }
      }

      return res.json({ success: true });
    } catch (error) {
      console.error('[audio-library] delete error', error);
      return res.status(500).json({ error: 'audio_library_delete_failed' });
    }
  });

  app.delete('/api/audio-settings', async (req, res) => {
    try {
      const requireSessionFlag = process.env.GETTY_REQUIRE_SESSION === '1';
      const hosted = !!process.env.REDIS_URL;
      const hasNs = !!(req?.ns?.admin || req?.ns?.pub);
      if (!isOpenTestMode() && (requireSessionFlag || hosted) && !hasNs) {
        return res.status(401).json({ error: 'no_session' });
      }
      if (requireAdminWrites) {
        const isAdmin = !!(req?.auth && req.auth.isAdmin);
        if (!isAdmin) return res.status(401).json({ error: 'admin_required' });
      }
      const ns = req?.ns?.admin || req?.ns?.pub || null;

      let currentSettings = null;
      try {
        const loaded = await loadTenantConfig(req, store, AUDIO_CONFIG_FILE, 'audio-settings.json');
        currentSettings = ensureSettingsShape(loaded.data || {});
      } catch (error) {
        console.error('Error loading current tenant audio settings for delete:', error);
        currentSettings = ensureSettingsShape({});
      }

      const shouldDeleteStoredFile =
        currentSettings.audioFilePath && !currentSettings.audioLibraryId;
      if (
        shouldDeleteStoredFile &&
        normalizeProvider(currentSettings.storageProvider) === STORAGE_PROVIDERS.SUPABASE
      ) {
        try {
          const storageInstance = getStorage(STORAGE_PROVIDERS.SUPABASE);
          if (storageInstance && storageInstance.provider === STORAGE_PROVIDERS.SUPABASE) {
            await storageInstance.deleteFile('tip-goal-audio', currentSettings.audioFilePath);
          }
        } catch (deleteError) {
          console.warn('Error deleting audio file from Supabase:', deleteError);
        }
      }

      const resetSettings = {
        audioSource: 'remote',
        hasCustomAudio: false,
        audioFileName: null,
        audioFileSize: 0,
        audioFileUrl: null,
        audioFilePath: null,
        audioLibraryId: '',
        storageProvider: '',
      };

      const merged = ensureSettingsShape({ ...currentSettings, ...resetSettings });
      await saveTenantConfig(req, store, AUDIO_CONFIG_FILE, 'audio-settings.json', merged);

      try {
        if (typeof wss.broadcast === 'function') {
          wss.broadcast(ns, { type: 'audioSettingsUpdate', data: merged });
        } else {
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN)
              client.send(JSON.stringify({ type: 'audioSettingsUpdate', data: merged }));
          });
        }
      } catch (broadcastError) {
        console.warn('Error broadcasting audio settings reset:', broadcastError);
      }

      return res.json({ success: true });
    } catch (error) {
      console.error('Error deleting audio settings:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/custom-audio', async (req, res) => {
    try {
      let settings = null;
      try {
        const loaded = await loadTenantConfig(req, store, AUDIO_CONFIG_FILE, 'audio-settings.json');
        const data = loaded.data?.data ? loaded.data.data : loaded.data;
        if (data) {
          settings = ensureSettingsShape(data);
        }
      } catch (error) {
        console.error('Error loading tenant audio settings for custom audio:', error);
      }

      if (!settings) {
        settings = ensureSettingsShape({});
      }

      if (!settings || !settings.audioFileUrl) {
        return res.status(404).json({ error: 'Custom audio not found' });
      }

      res.json({ url: settings.audioFileUrl });
    } catch (error) {
      console.error('Error serving custom audio:', error);
      res.status(500).json({ error: 'Error serving custom audio' });
    }
  });
}

module.exports = registerAudioSettingsRoutes;
