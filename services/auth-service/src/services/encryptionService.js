const crypto = require('crypto');
const config = require('../config');

// Derive 32-byte key from configuration
const KEY = crypto.createHash('sha256').update(config.encryptionKey).digest();
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypt a plaintext string using AES-256-GCM
 * Output format: iv:authTag:ciphertext (hex encoded)
 */
function encrypt(plaintext) {
  if (!plaintext) return plaintext;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt an AES-256-GCM encrypted string
 */
function decrypt(ciphertext) {
  if (!ciphertext) return ciphertext;
  try {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      // In case it's not encrypted or legacy
      return ciphertext;
    }
    const [ivHex, tagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    return ciphertext;
  }
}

/**
 * Deterministic blind index for phone lookup using HMAC-SHA256
 */
function hashPhone(phone) {
  if (!phone) return '';
  return crypto.createHmac('sha256', KEY).update(phone.trim()).digest('hex');
}

/**
 * Mask phone numbers for audit logging: e.g. +919876543210 -> +91******3210
 */
function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return '[MASKED]';
  const clean = phone.trim();
  if (clean.length < 6) return '***';
  const prefix = clean.slice(0, 3);
  const suffix = clean.slice(-4);
  return `${prefix}${'*'.repeat(clean.length - 7)}${suffix}`;
}

module.exports = {
  encrypt,
  decrypt,
  hashPhone,
  maskPhone,
};
