const { encrypt, decrypt } = require('../../src/utils/encrypt');

describe('Encryption Utility', () => {
  const secret = 'myTestString';

  it('should encrypt and decrypt correctly', () => {
    process.env.ENCRYPTION_KEY = '12345678901234567890123456789012'; // 32-byte key for AES-256
    const encrypted = encrypt(secret);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(secret);
  });
});
