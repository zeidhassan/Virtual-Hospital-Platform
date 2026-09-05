const { encrypt, decrypt } = require('../../src/utils/encrypt');
const crypto = require('crypto');

describe('Encrypt/Decrypt Utils', () => {
  const originalEnv = process.env;
  const dummyKey = crypto.randomBytes(32).toString('hex').slice(0, 32);

  beforeEach(() => {
    process.env = { ...originalEnv, ENCRYPTION_KEY: dummyKey };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('should encrypt and decrypt correctly', () => {
    const text = 'sensitive-data';
    const encrypted = encrypt(text);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(text);
  });

  test('should return empty string only for missing/empty input', () => {
    expect(decrypt(null)).toBe('');
    expect(decrypt('')).toBe('');
  });

  test('should throw on malformed or tampered ciphertext, not silently return empty', () => {
    // AES-256-GCM is authenticated — a genuinely corrupted or non-ciphertext
    // value must be visible as an error, not degrade into a blank field.
    expect(() => decrypt('invalid')).toThrow();

    const encrypted = encrypt('sensitive-data');
    const [iv, authTag, cipherHex] = encrypted.split(':');
    const tampered = `${iv}:${authTag}:${cipherHex.slice(0, -2)}00`;
    expect(() => decrypt(tampered)).toThrow();
  });

  test('should throw if ENCRYPTION_KEY is not set', () => {
    process.env.ENCRYPTION_KEY = '';
    expect(() => encrypt('test')).toThrow();
  });
});
