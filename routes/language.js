const { z } = require('zod');
const path = require('path');
const fs = require('fs');
const { loadTenantConfig, saveTenantConfig } = require('../lib/tenant-config');

function registerLanguageRoutes(app, languageConfig, wss, store) {
  const CONFIG_FILE = path.join(process.cwd(), 'language-settings.json');

  app.get('/api/language', async (req, res) => {
    try {
      let currentLanguage = languageConfig.getLanguage();
      
      try {
        const lt = await loadTenantConfig(
          req,
          store,
          CONFIG_FILE,
          'language-settings.json'
        );
        const loaded = lt.data?.data ? lt.data.data : lt.data;
        if (loaded && loaded.language) {
          currentLanguage = loaded.language;
        }
      } catch {}

      const availableLanguages = languageConfig.getAvailableLanguages();
      return res.json({ currentLanguage, availableLanguages });
    } catch (error) {
      return res.status(500).json({ error: 'internal_error', details: error.message });
    }
  });

  app.post('/api/language', async (req, res) => {
    try {
      const available = languageConfig.getAvailableLanguages();
      const schema = z.object({ language: z.enum(available) });

      const hosted = !!process.env.REDIS_URL;
      const requireSession = process.env.GETTY_REQUIRE_SESSION === '1' || hosted;
      let ns = null;
      if (requireSession) {
        try {
          ns = req?.ns?.admin || req?.ns?.pub || null;
          if (!ns) return res.status(401).json({ error: 'session_required' });
        } catch {
          return res.status(401).json({ error: 'session_required' });
        }
      } else {
          ns = req?.ns?.admin || req?.ns?.pub || null;
      }

      if (process.env.GETTY_ENABLE_CSRF === '1') {
        try {
          const hdrName = (
            process.env.VITE_GETTY_CSRF_HEADER ||
            process.env.GETTY_CSRF_HEADER ||
            'x-csrf-token'
          ).toLowerCase();
          const token = (req.headers && req.headers[hdrName]) || '';
          if (!token || typeof token !== 'string' || token.trim() === '') {
            return res.status(403).json({ error: 'missing_csrf' });
          }
        } catch {
          return res.status(403).json({ error: 'missing_csrf' });
        }
      }

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'invalid_language' });
      }
      const { language } = parsed.data;

      try {
        const saveContext = { ns: { admin: ns } };
        if (req.walletSession) saveContext.walletSession = req.walletSession;
        
        await saveTenantConfig(
            saveContext,
            store,
            CONFIG_FILE,
            'language-settings.json',
            { language }
        );
      } catch (e) {
          console.warn('[language] Tenant save failed, falling back to global file:', e);
          try {
            fs.writeFileSync(CONFIG_FILE, JSON.stringify({ language }, null, 2));
          } catch (err) {
             console.error('Failed to save global language config:', err);
             return res.status(500).json({ error: 'save_failed' });
          }
      }
      
      if (wss && typeof wss.broadcast === 'function') {
        wss.broadcast(ns, { type: 'chatConfigUpdate', data: { language } });
      }
      return res.json({ success: true, language });
    } catch (error) {
      return res.status(500).json({ error: 'internal_error', details: error.message });
    }
  });
}

module.exports = registerLanguageRoutes;
