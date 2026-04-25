const crypto = require('crypto');
const algorithm = 'aes-256-cbc';

const encrypt = (text) => {
    const key = process.env.ENCRYPTION_KEY;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
    let encrypted = cipher.update(text, 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
};

const decrypt = (encryptedText) => {
    if (!encryptedText) return '';
    try {
        const key = process.env.ENCRYPTION_KEY;
        const [ivHex, encrypted] = encryptedText.split(':');
        if (!ivHex || !encrypted) return '';
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf-8');
        decrypted += decipher.final('utf-8');
        return decrypted;
    } catch {
        return '';
    }
};

module.exports = { encrypt, decrypt };
