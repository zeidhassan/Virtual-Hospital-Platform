const crypto = require('crypto');
const algorithm = 'aes-256-gcm';

// AES-256-GCM is authenticated encryption — unlike the CBC mode this
// replaces, a tampered or corrupted ciphertext is detected (decryption
// throws) instead of silently producing garbage or being undetectably
// modifiable.
const encrypt = (text) => {
    if (text == null || text === '') return '';
    const key = process.env.ENCRYPTION_KEY;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
    let encrypted = cipher.update(text, 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

// Returns '' for empty/missing input (nothing to decrypt) — a real failure
// (corrupted data, wrong key, tampered ciphertext) throws instead of
// silently degrading to an empty string, so a genuine problem is visible
// rather than rendering as a blank field.
const decrypt = (encryptedText) => {
    if (!encryptedText) return '';
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
        throw new Error('Malformed ciphertext: expected iv:authTag:ciphertext.');
    }
    const [ivHex, authTagHex, encrypted] = parts;
    const key = process.env.ENCRYPTION_KEY;
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), iv);
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');
    return decrypted;
};

module.exports = { encrypt, decrypt };
