const crypto = require('crypto');

const DEFAULT_ENCRYPTION_KEY = 'default-insecure-key-change-me';
const allowInsecureKey = process.env.GETTY_ALLOW_INSECURE_STORE_KEY === '1';

function checkSecureKey() {
  const enforceSecureKey =
    !allowInsecureKey &&
    process.env.NODE_ENV !== 'test' &&
    (process.env.REDIS_URL ||
      process.env.GETTY_REQUIRE_SESSION === '1' ||
      process.env.GETTY_MULTI_TENANT_WALLET === '1');

  if (
    enforceSecureKey &&
    !allowInsecureKey &&
    (!process.env.STORE_ENCRYPTION_KEY ||
      process.env.STORE_ENCRYPTION_KEY === DEFAULT_ENCRYPTION_KEY)
  ) {
    throw new Error(
      '[store] STORE_ENCRYPTION_KEY is required when running in hosted mode (Redis/session/wallet enabled). Set STORE_ENCRYPTION_KEY to a strong secret or opt-in with GETTY_ALLOW_INSECURE_STORE_KEY=1.'
    );
  }
}

class InMemoryKV {
  constructor() {
    this.map = new Map();
  }
  async get(key) {
    return this.map.get(key);
  }
  async set(key, val, ttlSec) {
    this.map.set(key, val);
    if (ttlSec && ttlSec > 0) {
      setTimeout(() => this.map.delete(key), ttlSec * 1000).unref?.();
    }
    return true;
  }
  async del(key) {
    this.map.delete(key);
  }
}

function safeJSONParse(s, fallback) {
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

class NamespacedStore {
  constructor({ redis, ttlSeconds = 72 * 3600 } = {}) {
    this.ttl = ttlSeconds;
    this.redis = redis || null;
    this.kv = this.redis ? null : new InMemoryKV();
    this.__configPrefix = 'gettycfg:';
    this._encryptionKey = null;
  }

  attachRedis(redis, ttlSeconds = this.ttl) {
    if (!redis) return false;
    this.redis = redis;
    if (typeof ttlSeconds === 'number' && Number.isFinite(ttlSeconds)) {
      this.ttl = ttlSeconds;
    }
    this.kv = null;
    return true;
  }

  get encryptionKey() {
    if (!this._encryptionKey) {
      checkSecureKey();
      const passphrase = process.env.STORE_ENCRYPTION_KEY || DEFAULT_ENCRYPTION_KEY;
      this._encryptionKey = this._deriveKey(passphrase);
    }
    return this._encryptionKey;
  }

  _deriveKey(passphrase) {
    return crypto.scryptSync(passphrase, 'salt', 32);
  }

  _encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  _decrypt(encryptedText) {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) return encryptedText;
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  _key(ns, key) {
    return `getty:${ns}:${key}`;
  }

  _configKey(ns, key) {
    return `${this.__configPrefix}${ns}:${key}`;
  }

  async get(ns, key, fallback = null) {
    const k = this._key(ns, key);
    if (this.redis) {
      try {
        const val = await this.redis.get(k);
        if (!val) return fallback;
        const decrypted = this._decrypt(val);
        return safeJSONParse(decrypted, fallback);
      } catch (e) {
        console.warn('[store] get error:', e.message);
        return fallback;
      }
    }
    const val = await this.kv.get(k);
    return typeof val === 'undefined' ? fallback : val;
  }

  async set(ns, key, value) {
    const k = this._key(ns, key);
    if (this.redis) {
      try {
        const v = this._encrypt(JSON.stringify(value));
        if (this.ttl && this.ttl > 0) await this.redis.set(k, v, 'EX', this.ttl);
        else await this.redis.set(k, v);
        return true;
      } catch (e) {
        console.warn('[store] set error:', e.message);
        return false;
      }
    }
    await this.kv.set(k, value, this.ttl);
    return true;
  }

  async setConfig(ns, key, value) {
    const k = this._configKey(ns, key);
    if (this.redis) {
      try {
        const v = this._encrypt(JSON.stringify(value));
        await this.redis.set(k, v);
        return true;
      } catch (e) {
        console.warn('[store] setConfig error:', e.message);
        return false;
      }
    }
    await this.kv.set(k, value, 0);
    return true;
  }

  async getConfig(ns, key, fallback = null) {
    const k = this._configKey(ns, key);
    if (this.redis) {
      try {
        const val = await this.redis.get(k);
        if (!val) return fallback;
        const decrypted = this._decrypt(val);
        return safeJSONParse(decrypted, fallback);
      } catch (e) {
        console.warn('[store] getConfig error:', e.message);
        return fallback;
      }
    }

    const val = await this.kv.get(k);
    return typeof val === 'undefined' ? fallback : val;
  }

  async delConfig(ns, key) {
    const k = this._configKey(ns, key);
    if (this.redis) return this.redis.del(k);
    return this.kv.del(k);
  }

  async del(ns, key) {
    const k = this._key(ns, key);
    if (this.redis) return this.redis.del(k);
    return this.kv.del(k);
  }

  async isConfigBlocked(ns, key) {
    if (!this.redis) return false;
    try {
      const k = `${this.__configPrefix}${ns}:${key}:blocked`;
      const exists = await this.redis.exists(k);
      if (!exists) return false;
      const details = await this.redis.get(k);
      return safeJSONParse(details, {});
    } catch (e) {
      console.warn('[store] isConfigBlocked error:', e.message);
      return false;
    }
  }

  async export(ns) {
    if (!this.redis) {
      const prefix = `getty:${ns}:`;
      const out = {};
      for (const [k, v] of this.kv.map.entries()) {
        if (k.startsWith(prefix)) out[k.slice(prefix.length)] = v;
      }
      return out;
    }
    return {};
  }

  static genToken(bytes = 24) {
    return crypto.randomBytes(bytes).toString('base64url');
  }
}

module.exports = { NamespacedStore };
