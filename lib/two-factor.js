const crypto = require('crypto');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');

authenticator.options = {
  window: 4,
  step: 30,
};

const ENCRYPTION_ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

class TwoFactorAuth {
  constructor(encryptionKey) {
    if (!encryptionKey) {
      throw new Error('TwoFactorAuth requires an encryption key');
    }
    this.key = crypto.scryptSync(encryptionKey, 'salt', 32);
  }

  /**
   * Generate a new TOTP secret and QR code
   * @param {string} accountName - e.g. user's email
   * @param {string} issuer - e.g. 'OdyseeApp'
   */
  async generateSecret(accountName, issuer = 'Getty') {
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(accountName, issuer, secret);
    const qrCodeUrl = await QRCode.toDataURL(otpauth);
    
    return {
      secret,
      otpauth,
      qrCodeUrl
    };
  }

  /**
   * Verify a TOTP token against a secret
   * @param {string} token - The 6-digit code
   * @param {string} secret - The raw secret (unencrypted)
   */
  verify(token, secret) {
    try {
      return authenticator.check(token, secret);
    } catch {
      return false;
    }
  }

  /**
   * Encrypt the secret for storage
   * @param {string} secret 
   */
  encryptSecret(secret) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, this.key, iv);
    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt the stored secret
   * @param {string} encryptedSecret 
   */
  decryptSecret(encryptedSecret) {
    const [ivHex, encrypted] = encryptedSecret.split(':');
    if (!ivHex || !encrypted) throw new Error('Invalid encrypted secret format');
    
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, this.key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Generate backup codes
   * @param {number} count 
   */
  generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(4).toString('hex'));
    }
    return codes;
  }
}

module.exports = TwoFactorAuth;
