const { describe, test, expect, beforeEach } = require('@jest/globals');
const TwoFactorAuth = require('../lib/two-factor');
const { authenticator } = require('otplib');

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mockqrcode'),
}));

describe('TwoFactorAuth', () => {
  const encryptionKey = 'test-secret-key-must-be-long-enough';
  let tfa;

  beforeEach(() => {
    tfa = new TwoFactorAuth(encryptionKey);
  });

  test('should generate secret and QR code', async () => {
    const result = await tfa.generateSecret('user@example.com');
    expect(result).toHaveProperty('secret');
    expect(result).toHaveProperty('otpauth');
    expect(result).toHaveProperty('qrCodeUrl');
    expect(decodeURIComponent(result.otpauth)).toContain('user@example.com');
  });

  test('should encrypt and decrypt secret correctly', () => {
    const secret = 'KVKFKRCPNZQUYMLXOVYDSQKJKZDTSRLD';
    const encrypted = tfa.encryptSecret(secret);
    expect(encrypted).not.toBe(secret);
    expect(encrypted).toContain(':'); // IV:Ciphertext

    const decrypted = tfa.decryptSecret(encrypted);
    expect(decrypted).toBe(secret);
  });

  test('should verify valid token', () => {
    const secret = authenticator.generateSecret();
    const token = authenticator.generate(secret);
    const isValid = tfa.verify(token, secret);
    expect(isValid).toBe(true);
  });

  test('should reject invalid token', () => {
    const secret = authenticator.generateSecret();
    const isValid = tfa.verify('000000', secret);
    expect(isValid).toBe(false);
  });

  test('should generate backup codes', () => {
    const codes = tfa.generateBackupCodes(5);
    expect(codes).toHaveLength(5);
    codes.forEach(code => {
      expect(typeof code).toBe('string');
      expect(code.length).toBeGreaterThan(0);
    });
  });
});
