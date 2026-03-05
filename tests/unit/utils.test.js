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

  test('should throw error if decrypt input is malformed', () => {
    expect(() => decrypt('invalid')).toThrow();
  });

  test('should throw if ENCRYPTION_KEY is not set', () => {
    process.env.ENCRYPTION_KEY = '';
    expect(() => encrypt('test')).toThrow();
  });
});
