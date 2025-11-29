const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { z } = require('zod');
const { isTrustedLocalAdmin, shouldMaskSensitive } = require('../lib/trust');
const { isOpenTestMode } = require('../lib/test-open-mode');
const { getStorage, STORAGE_PROVIDERS } = require('../lib/storage');

const WUZZY_PROVIDER = 'wuzzy';

function isValidArweaveId(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length < 128 && !/\s/.test(trimmed);
}

function toNumber(value, fallback = 0) {
  const parsed = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeWuzzySelection(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const txId = typeof raw.wuzzyId === 'string' ? raw.wuzzyId.trim() : '';
  const urlRaw = typeof raw.wuzzyUrl === 'string' ? raw.wuzzyUrl.trim() : '';
  if (!isValidArweaveId(txId) || !urlRaw) {
    return null;
  }
  let normalizedUrl = '';
  try {
    const parsedUrl = new URL(urlRaw);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return null;
    }
    if (parsedUrl.protocol === 'http:') {
      parsedUrl.protocol = 'https:';
    }
    normalizedUrl = parsedUrl.href;
  } catch {
    return null;
  }
  const width = Math.max(0, Math.round(toNumber(raw.wuzzyWidth, 0)));
  const height = Math.max(0, Math.round(toNumber(raw.wuzzyHeight, 0)));
  const size = Math.max(0, Math.round(toNumber(raw.wuzzySize, 0)));
  const originalName = typeof raw.wuzzyOriginalName === 'string' ? raw.wuzzyOriginalName.trim() : '';
  const sha256 = typeof raw.wuzzySha256 === 'string' ? raw.wuzzySha256.trim() : '';
  const fingerprint = typeof raw.wuzzyFingerprint === 'string' && raw.wuzzyFingerprint.trim()
    ? raw.wuzzyFingerprint.trim()
    : txId;
  return {
    txId,
    id: txId,
    url: normalizedUrl,
    width,
    height,
    size,
    originalName,
    sha256,
    fingerprint,
  };
}

function normalizeProvider(provider) {
  if (!provider || typeof provider !== 'string') return '';
  const lower = provider.trim().toLowerCase();
  if (lower === STORAGE_PROVIDERS.SUPABASE) return STORAGE_PROVIDERS.SUPABASE;
  if (lower === STORAGE_PROVIDERS.TURBO || lower === 'arweave') return STORAGE_PROVIDERS.TURBO;
  if (lower === WUZZY_PROVIDER) return WUZZY_PROVIDER;
  return lower;
}

function readGifDimensionsFromBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 10) {
    throw new Error('Invalid buffer');
  }

  const signature = buffer.toString('ascii', 0, 6);
  if (signature !== 'GIF87a' && signature !== 'GIF89a') {
    throw new Error('Invalid GIF signature');
  }

  const width = buffer.readUInt16LE(6);
  const height = buffer.readUInt16LE(8);
  return { width, height };
}

function registerTipNotificationGifRoutes(app, strictLimiter, { store } = {}) {
  const { loadTenantConfig, saveTenantConfig } = require('../lib/tenant-config');
  const CONFIG_FILENAME = 'tip-notification-config.json';
  const CONFIG_FILE = path.join(process.cwd(), 'config', CONFIG_FILENAME);
  const BUCKET_NAME = 'notification-gifs';
  const LIBRARY_FILE = path.join(process.cwd(), 'config', 'tip-notification-gif-library.json');

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 1024 * 1024 * 2 },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype === 'image/gif' || file.originalname.toLowerCase().endsWith('.gif')) {
        cb(null, true);
      } else {
        cb(new Error('Only GIF images are allowed'));
      }
    },
  });

  function ensureConfigShape(raw = {}) {
    const pos =
      typeof raw.position === 'string' && ['left', 'right', 'top', 'bottom'].includes(raw.position)
        ? raw.position
        : 'right';
    return {
      ...raw,
      gifPath: typeof raw.gifPath === 'string' ? raw.gifPath : '',
      position: pos,
      width: Number.isFinite(raw.width) ? raw.width : Number(raw.width) || 0,
      height: Number.isFinite(raw.height) ? raw.height : Number(raw.height) || 0,
      libraryId: typeof raw.libraryId === 'string' ? raw.libraryId : '',
      storageProvider: typeof raw.storageProvider === 'string' ? raw.storageProvider : '',
    };
  }

  function normalizeLibraryEntry(raw) {
    if (!raw || typeof raw !== 'object') return null;
    return {
      id: typeof raw.id === 'string' ? raw.id : '',
      url: typeof raw.url === 'string' ? raw.url : '',
      width: Number.isFinite(raw.width) ? raw.width : Number(raw.width) || 0,
      height: Number.isFinite(raw.height) ? raw.height : Number(raw.height) || 0,
      size: Number.isFinite(raw.size) ? raw.size : Number(raw.size) || 0,
      originalName: typeof raw.originalName === 'string' ? raw.originalName : '',
      uploadedAt: typeof raw.uploadedAt === 'string' ? raw.uploadedAt : new Date(0).toISOString(),
      provider: typeof raw.provider === 'string' ? raw.provider : STORAGE_PROVIDERS.SUPABASE,
      path: typeof raw.path === 'string' ? raw.path : '',
      sha256: typeof raw.sha256 === 'string' ? raw.sha256 : '',
      fingerprint: (() => {
        if (typeof raw.fingerprint === 'string' && raw.fingerprint) {
          return raw.fingerprint;
        }
        const baseName = (
          typeof raw.originalName === 'string' && raw.originalName
            ? raw.originalName
            : typeof raw.id === 'string'
              ? raw.id
              : ''
        )
          .trim()
          .toLowerCase();
        if (!baseName || !raw.size) return '';
        return `${baseName}::${Number(raw.size) || 0}`;
      })(),
    };
  }

  async function loadLibrary(req) {
    try {
      const loaded = await loadTenantConfig(
        req,
        store,
        LIBRARY_FILE,
        'tip-notification-gif-library.json'
      );
      const data = loaded.data;
      const list = Array.isArray(data)
        ? data
        : data && Array.isArray(data.items)
          ? data.items
          : [];
      return list.map(normalizeLibraryEntry).filter((entry) => entry && entry.id);
    } catch (error) {
      console.warn('[gif-library] load error', error.message);
      return [];
    }
  }

  async function saveLibrary(req, items) {
    try {
      await saveTenantConfig(
        req,
        store,
        LIBRARY_FILE,
        'tip-notification-gif-library.json',
        items
      );
    } catch (error) {
      console.warn('[gif-library] save error', error.message);
    }
  }

  async function upsertLibraryEntry(req, entry) {
    if (!entry || !entry.id) return;
    const normalized = normalizeLibraryEntry(entry);
    if (!normalized) return;
    const current = await loadLibrary(req);
    const filtered = current.filter((item) => item && item.id !== normalized.id);
    const updated = [normalized, ...filtered];
    const maxItems = 50;
    const trimmed = updated.slice(0, maxItems);
    await saveLibrary(req, trimmed);
    return trimmed;
  }

  async function findLibraryEntry(req, entryId) {
    if (!entryId) return null;
    const items = await loadLibrary(req);
    const found = items.find((item) => item && item.id === entryId) || null;
    if (!found) {
      console.warn(
        '[gif-library] item not found',
        { requestedId: entryId, availableIds: items.map((i) => i.id) }
      );
    }
    return found;
  }

  app.get('/api/tip-notification-gif', async (req, res) => {
    try {
      const loaded = await loadTenantConfig(req, store, CONFIG_FILE, CONFIG_FILENAME);
      const cfg = ensureConfigShape(loaded.data || {});
      const hasNs = !!(req?.ns?.admin || req?.ns?.pub);
      const conceal = shouldMaskSensitive(req);
      const trusted = isTrustedLocalAdmin(req);

      if (!hasNs) {
        const requireSessionFlag = process.env.GETTY_REQUIRE_SESSION === '1';
        if (requireSessionFlag) {
          return res.json({ gifPath: '', width: 0, height: 0, libraryId: '' });
        }
        return res.json({ gifPath: '', position: 'right', width: 0, height: 0, libraryId: '' });
      }

      if (conceal && !trusted && !hasNs) {
        return res.json({ gifPath: '', width: 0, height: 0, libraryId: '' });
      }

      res.json(cfg);
    } catch {
      res.status(500).json({ error: 'Error loading config' });
    }
  });

  app.get('/api/tip-notification-gif/library', strictLimiter, async (req, res) => {
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
      console.error('[gif-library] list error', error.message);
      res.status(500).json({ error: 'library_list_failed' });
    }
  });

  app.post(
    '/api/tip-notification-gif',
    strictLimiter,
    (req, res, next) => {
      const requireSessionFlag = process.env.GETTY_REQUIRE_SESSION === '1';
      const hosted = !!process.env.REDIS_URL;
      const hasNs = !!(req?.ns?.admin || req?.ns?.pub);
      const requireAdminWrites = process.env.GETTY_REQUIRE_ADMIN_WRITE === '1' || hosted;
      if (!isOpenTestMode() && (requireSessionFlag || hosted) && !hasNs) {
        return res.status(401).json({ error: 'no_session' });
      }
      if (!isOpenTestMode() && requireAdminWrites) {
        const isAdmin = !!(req?.auth && req.auth.isAdmin);
        if (!isAdmin) return res.status(401).json({ error: 'admin_required' });
      }
      upload.single('gifFile')(req, res, function (err) {
        if (err) {
          return res.status(400).json({ error: err.message });
        }
        next();
      });
    },
    async (req, res) => {
      try {
        const bodySchema = z
          .object({
            position: z.enum(['left', 'right', 'top', 'bottom']).default('right'),
            selectedGifId: z.string().max(220).optional().nullable(),
          })
          .passthrough();
        const parsed = bodySchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: 'Invalid position' });
        const position = parsed.data.position;
        const selectedGifIdRaw = parsed.data.selectedGifId;
        const selectedGifId =
          typeof selectedGifIdRaw === 'string' && selectedGifIdRaw.trim()
            ? selectedGifIdRaw.trim()
            : null;
        const ns = req?.ns?.admin || req?.ns?.pub || null;
        const loaded = await loadTenantConfig(req, store, CONFIG_FILE, CONFIG_FILENAME);
        let config = ensureConfigShape(loaded.data || {});
        let libraryEntry = null;
        const preferredProviderRaw =
          typeof req.body?.storageProvider === 'string' ? req.body.storageProvider : '';
        const normalizedPreferredProvider = normalizeProvider(preferredProviderRaw);

        if (normalizedPreferredProvider === WUZZY_PROVIDER) {
          const wuzzySelection = normalizeWuzzySelection(req.body);
          if (!wuzzySelection) {
            return res.status(400).json({ error: 'invalid_wuzzy_selection' });
          }
          config.gifPath = wuzzySelection.url;
          config.width = wuzzySelection.width;
          config.height = wuzzySelection.height;
          config.storageProvider = WUZZY_PROVIDER;
          libraryEntry = {
            id: wuzzySelection.id,
            url: wuzzySelection.url,
            width: wuzzySelection.width,
            height: wuzzySelection.height,
            size: wuzzySelection.size,
            originalName: wuzzySelection.originalName || `${wuzzySelection.txId}.gif`,
            uploadedAt: new Date().toISOString(),
            provider: WUZZY_PROVIDER,
            path: '',
            sha256: wuzzySelection.sha256 || '',
            fingerprint: wuzzySelection.fingerprint || wuzzySelection.id,
          };
          config.libraryId = libraryEntry.id;
          await upsertLibraryEntry(req, libraryEntry);
        } else if (req.file) {
          let dims;
          try {
            dims = readGifDimensionsFromBuffer(req.file.buffer);
          } catch {
            return res.status(400).json({ error: 'Invalid GIF file' });
          }

          const storage = getStorage(preferredProviderRaw);
          const preferredTurbo = normalizedPreferredProvider === STORAGE_PROVIDERS.TURBO;
          if (preferredTurbo || (!normalizedPreferredProvider && storage?.provider === STORAGE_PROVIDERS.TURBO)) {
            const fileBuffer = req.file.buffer || Buffer.alloc(0);
            const sizeFromRequest = Number(req.file.size);
            const fileSize =
              Number.isFinite(sizeFromRequest) && sizeFromRequest >= 0
                ? sizeFromRequest
                : fileBuffer.length;
            const MAX_FREE_SIZE_BYTES = 102400; // 100KB
            if (fileSize > MAX_FREE_SIZE_BYTES) {
              return res.status(400).json({ error: 'File too large for free upload' });
            }
          }

          if (!storage) {
            if (process.env.NODE_ENV === 'test') {
              const safeNs = ns ? ns.replace(/[^a-zA-Z0-9_-]/g, '_') : 'global';
              const mockUrl = `https://mock.supabase.co/storage/v1/object/public/notification-gifs/${safeNs}/tip-notification.gif`;
              config.gifPath = mockUrl;
              config.width = dims.width;
              config.height = dims.height;
              config.libraryId = '';
              config.storageProvider = STORAGE_PROVIDERS.SUPABASE;
            } else {
              return res.status(500).json({ error: 'Storage service not configured' });
            }
          } else {
            const safeNs = ns ? ns.replace(/[^a-zA-Z0-9_-]/g, '_') : 'global';
            const filePath = `${safeNs}/tip-notification.gif`;

            const fileBuffer = req.file.buffer || Buffer.alloc(0);
            const sizeFromRequest = Number(req.file.size);
            const fileSize =
              Number.isFinite(sizeFromRequest) && sizeFromRequest >= 0
                ? sizeFromRequest
                : fileBuffer.length;
            let fileHash = '';
            try {
              fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
            } catch (hashError) {
              console.warn('[gif-library] failed to hash upload', hashError.message);
            }
            const normalizedName = (req.file.originalname || '').toLowerCase();
            const fingerprint = normalizedName
              ? `${normalizedName}::${fileSize || 0}`
              : `${filePath.toLowerCase()}::${fileSize || 0}`;

            try {
              const uploadResult = await storage.uploadFile(BUCKET_NAME, filePath, fileBuffer, {
                contentType: 'image/gif',
              });

              config.gifPath = uploadResult.publicUrl;
              config.width = dims.width;
              config.height = dims.height;
              config.storageProvider =
                uploadResult.provider || storage.provider || STORAGE_PROVIDERS.SUPABASE;
              libraryEntry = {
                id: uploadResult.fileName,
                url: uploadResult.publicUrl,
                width: dims.width,
                height: dims.height,
                size: fileSize || 0,
                originalName: req.file.originalname || '',
                uploadedAt: new Date().toISOString(),
                provider: uploadResult.provider || storage.provider || STORAGE_PROVIDERS.SUPABASE,
                path: uploadResult.path || '',
                sha256: fileHash,
                fingerprint,
              };
              config.libraryId = libraryEntry.id;
              await upsertLibraryEntry(req, libraryEntry);
            } catch (uploadError) {
              console.error('Supabase upload error:', uploadError);
              if (uploadError.code === 'TURBO_FILE_TOO_LARGE') {
                return res.status(400).json({ error: 'File too large for free Turbo upload (max 100KB). Please try uploading a smaller file or use Supabase.', code: 'TURBO_FILE_TOO_LARGE' });
              }
              if (uploadError.code === 'TURBO_INSUFFICIENT_BALANCE') {
                return res.status(400).json({ error: 'Upload not possible with Turbo. Please switch to Supabase storage.', code: 'TURBO_INSUFFICIENT_BALANCE' });
              }
              return res.status(500).json({ error: 'Failed to upload file' });
            }
          }
        } else if (selectedGifId) {
          try {
            const entry = await findLibraryEntry(req, selectedGifId);
            if (!entry) {
              return res.status(404).json({ error: 'library_item_not_found' });
            }
            config.gifPath = entry.url || '';
            config.width = Number.isFinite(entry.width) ? entry.width : Number(entry.width) || 0;
            config.height = Number.isFinite(entry.height)
              ? entry.height
              : Number(entry.height) || 0;
            config.libraryId = entry.id;
            config.storageProvider = entry.provider || STORAGE_PROVIDERS.SUPABASE;
            libraryEntry = entry;
          } catch (error) {
            console.error('[gif-library] lookup error', error.message);
            return res.status(500).json({ error: 'library_lookup_failed' });
          }
        }

        config.position = position;
        await saveTenantConfig(req, store, CONFIG_FILE, CONFIG_FILENAME, config);
        res.json({ success: true, ...config, libraryItem: libraryEntry });
      } catch (_e) {
        console.error('Error saving GIF config:', _e);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  );

  app.delete('/api/tip-notification-gif/library/:id', strictLimiter, async (req, res) => {
    const requireSessionFlag = process.env.GETTY_REQUIRE_SESSION === '1';
    const hosted = !!process.env.REDIS_URL;
    const hasNs = !!(req?.ns?.admin || req?.ns?.pub);
    if (!isOpenTestMode() && (requireSessionFlag || hosted) && !hasNs) {
      return res.status(401).json({ error: 'no_session' });
    }

    const entryId = req.params.id;
    if (!entryId) return res.status(400).json({ error: 'invalid_id' });

    try {
      const items = await loadLibrary(req);
      const target = items.find((item) => item && item.id === entryId);

      if (!target) {
        return res.status(404).json({ error: 'library_item_not_found' });
      }

      const provider = normalizeProvider(target.provider);
      if (provider !== STORAGE_PROVIDERS.SUPABASE && provider !== WUZZY_PROVIDER) {
        return res.status(400).json({ error: 'gif_library_delete_unsupported' });
      }

      if (provider === STORAGE_PROVIDERS.SUPABASE && target.path) {
        const storage = getStorage(STORAGE_PROVIDERS.SUPABASE);
        if (storage) {
          try {
            await storage.deleteFile(BUCKET_NAME, target.path);
          } catch (e) {
            console.warn('Failed to delete file from Supabase:', e.message);
          }
        }
      }

      const updatedItems = items.filter((i) => i.id !== entryId);
      await saveLibrary(req, updatedItems);

      const loaded = await loadTenantConfig(req, store, CONFIG_FILE, CONFIG_FILENAME);
      let cfg = ensureConfigShape(loaded.data || {});

      let cleared = false;
      if (cfg.libraryId === entryId) {
        const clearedCfg = ensureConfigShape({
          ...cfg,
          gifPath: '',
          width: 0,
          height: 0,
          libraryId: '',
          storageProvider: '',
        });
        cleared = true;
        await saveTenantConfig(req, store, CONFIG_FILE, CONFIG_FILENAME, clearedCfg);
      }

      return res.json({ success: true, cleared });
    } catch (error) {
      console.error('[gif-library] delete error', error);
      return res.status(500).json({ error: 'gif_library_delete_failed' });
    }
  });

  app.delete('/api/tip-notification-gif', strictLimiter, async (req, res) => {
    const requireSessionFlag = process.env.GETTY_REQUIRE_SESSION === '1';
    const hosted = !!process.env.REDIS_URL;
    if (process.env.GETTY_DISABLE_GIF_DELETE === '1') {
      return res.status(405).json({ error: 'gif_delete_disabled' });
    }
    const hasNs = !!(req?.ns?.admin || req?.ns?.pub);
    const requireAdminWrites = process.env.GETTY_REQUIRE_ADMIN_WRITE === '1' || hosted;
    if (!isOpenTestMode() && (requireSessionFlag || hosted) && !hasNs) {
      return res.status(401).json({ error: 'no_session' });
    }
    if (!isOpenTestMode() && requireAdminWrites) {
      const isAdmin = !!(req?.auth && req.auth.isAdmin);
      if (!isAdmin) return res.status(401).json({ error: 'admin_required' });
    }
    if (!isOpenTestMode() && !hosted && !requireSessionFlag && !isTrustedLocalAdmin(req)) {
      return res.status(403).json({ error: 'forbidden_untrusted_context' });
    }
    try {
      const loaded = await loadTenantConfig(req, store, CONFIG_FILE, CONFIG_FILENAME);
      let cfgToUse = ensureConfigShape(loaded.data || {});

      const shouldDeleteStoredFile =
        cfgToUse.gifPath &&
        !cfgToUse.libraryId &&
        cfgToUse.storageProvider === STORAGE_PROVIDERS.SUPABASE;
      if (shouldDeleteStoredFile) {
        const storage = getStorage();
        if (storage) {
          try {
            const urlParts = cfgToUse.gifPath.split('/storage/v1/object/public/');
            if (urlParts.length === 2) {
              const filePath = urlParts[1].split('/').slice(1).join('/');
              await storage.deleteFile(BUCKET_NAME, filePath);
            }
          } catch (deleteError) {
            console.warn('Failed to delete file from Supabase:', deleteError.message);
          }
        }
      }

      const cleared = {
        ...cfgToUse,
        gifPath: '',
        position: 'right',
        width: 0,
        height: 0,
        libraryId: '',
        storageProvider: '',
      };
      await saveTenantConfig(req, store, CONFIG_FILE, CONFIG_FILENAME, cleared);
      return res.json({ success: true, ...cleared });
    } catch {
      res.status(500).json({ error: 'Internal server error' });
    }
  });
}

module.exports = registerTipNotificationGifRoutes;
