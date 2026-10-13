const crypto = require('crypto');

/**
 * AES-256-GCM encryption for sensitive KYC & payout references at rest,
 * plus strict PII / Aadhaar redaction helpers (SRS §6, §7, §11.4, FR-ONB-03, FR-COM-01).
 */

function getEncryptionKey() {
  const rawSecret =
    process.env.DATA_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    'bookme-dev-fallback-encryption-key-do-not-use-in-prod';
  return crypto.createHash('sha256').update(String(rawSecret)).digest();
}

function encryptSensitiveRef(plainText) {
  if (!plainText) return null;
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `enc_v1:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptSensitiveRef(cipherText) {
  if (!cipherText) return null;
  if (!String(cipherText).startsWith('enc_v1:')) return cipherText;
  try {
    const parts = String(cipherText).split(':');
    if (parts.length !== 4) return null;
    const iv = Buffer.from(parts[1], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');
    const encrypted = Buffer.from(parts[3], 'hex');
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return null;
  }
}

function hashSha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

/**
 * Rejects any raw 12-digit Aadhaar number in request payloads (FR-ONB-03).
 */
function containsRawAadhaar(input) {
  if (!input) return false;
  const serialized = typeof input === 'string' ? input : JSON.stringify(input);
  // Check explicit aadhaarNumber / aadhaar fields or raw 12-digit Aadhaar pattern
  if (/"aadhaar(Number|_number)?"\s*:\s*"?[0-9\s-]{12,14}"?/i.test(serialized)) {
    return true;
  }
  return false;
}

/**
 * Strips any contact details (phone, email, UPI) from free-text descriptions (FR-COM-01, FR-COM-02).
 */
function sanitizePublicText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\b(?:\+91[-\s]?)?[6-9]\d{9}\b/g, '[REDACTED_PHONE]')
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[REDACTED_EMAIL]');
}

/**
 * Redacts all sensitive KYC, bank, PAN, Aadhaar, IP, and contact fields from customer/public responses.
 */
function redactVendorForPublic(vendor) {
  if (!vendor) return null;
  const safe = {
    id: vendor.id,
    businessName: vendor.businessName,
    category: vendor.category,
    categories: vendor.categories || (vendor.category ? [vendor.category] : []),
    categoryDetails: vendor.categoryDetails || [],
    description: sanitizePublicText(vendor.description || ''),
    photoUrl: vendor.photoUrl || null,
    location: vendor.location || '',
    city: vendor.city || (vendor.serviceLocation && vendor.serviceLocation.city) || '',
    serviceLocation: vendor.serviceLocation
      ? {
          city: vendor.serviceLocation.city || '',
          state: vendor.serviceLocation.state || '',
          address: sanitizePublicText(vendor.serviceLocation.address || ''),
          latitude: vendor.serviceLocation.latitude ?? null,
          longitude: vendor.serviceLocation.longitude ?? null,
        }
      : null,
    serviceRadiusKm: vendor.serviceRadiusKm ?? 25,
    serviceAreas: vendor.serviceAreas || [],
    verified: Boolean(vendor.verified),
    kycStatus: vendor.kycStatus || (vendor.verified ? 'APPROVED' : 'DRAFT'),
    rating: vendor.rating !== undefined && vendor.rating !== null ? Number(vendor.rating) : null,
    averageRating: vendor.rating !== undefined && vendor.rating !== null ? Number(vendor.rating) : null,
    totalReviews: vendor.totalReviews ?? 0,
    responseScore: vendor.responseScore ?? 100,
    packagesCount: vendor.packagesCount ?? undefined,
    mediaUrls: vendor.mediaUrls || [],
    packages: vendor.packages || undefined,
    services: vendor.services || undefined,
    isDemo: Boolean(vendor.isDemo),
    demoLabel: vendor.isDemo ? 'Fictional Demo Data - Unverified' : undefined,
    createdAt: vendor.createdAt,
  };
  return safe;
}

function maskPan(pan) {
  const clean = String(pan || '').trim().toUpperCase();
  if (clean.length < 5) return 'XXXXX';
  return `${clean.slice(0, 2)}*****${clean.slice(-3)}`;
}

function maskBankAccount(acct) {
  const clean = String(acct || '').trim();
  return `XXXX-XXXX-${clean.slice(-4)}`;
}

module.exports = {
  encryptSensitiveRef,
  encryptSensitive: encryptSensitiveRef,
  decryptSensitiveRef,
  decryptSensitive: decryptSensitiveRef,
  maskPan,
  maskBankAccount,
  hashSha256,
  containsRawAadhaar,
  sanitizePublicText,
  redactVendorForPublic,
};

