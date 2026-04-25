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

  test('should return empty string if decrypt input is malformed', () => {
    // decrypt now has a try/catch — malformed input returns '' instead of throwing
    expect(decrypt('invalid')).toBe('');
    expect(decrypt(null)).toBe('');
    expect(decrypt('')).toBe('');
  });

  test('should throw if ENCRYPTION_KEY is not set', () => {
    process.env.ENCRYPTION_KEY = '';
    expect(() => encrypt('test')).toThrow();
  });
});
