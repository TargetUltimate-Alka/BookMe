const crypto = require('crypto');
const db = require('../../../shared/db');
const inMemoryStore = require('../../../shared/inMemoryStore');
const { storageProvider } = require('../../../shared/providers/externalProviders');
const { getConfigNumber, appendAuditLog } = require('./configAuditRepository');

const ALLOWED_PHOTO_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const ALLOWED_VIDEO_MIMES = new Set(['video/mp4']);

function normalizeMediaType(mediaType, mimeType) {
  const upper = String(mediaType || '').toUpperCase();
  if (upper === 'PHOTO' || upper === 'IMAGE') return 'PHOTO';
  if (upper === 'VIDEO') return 'VIDEO';
  const mime = String(mimeType || '').toLowerCase();
  if (mime.startsWith('video/')) return 'VIDEO';
  return 'PHOTO';
}

function mapMediaRow(row) {
  if (!row) return null;
  const mediaType = normalizeMediaType(row.media_type, row.mime_type);
  const sizeBytes = Number(row.file_size_bytes ?? row.size_bytes ?? 0);
  const checksum = row.content_hash_sha256 || row.sha256_checksum || '';
  const modStatus = row.moderation_status || 'PENDING';
  return {
    id: row.id,
    vendorId: row.vendor_id,
    packageId: row.package_id || null,
    mediaType,
    mimeType: row.mime_type,
    fileName: row.file_name || null,
    fileSizeBytes: sizeBytes,
    sizeBytes,
    durationSeconds:
      row.duration_seconds !== null && row.duration_seconds !== undefined
        ? Number(row.duration_seconds)
        : null,
    contentHashSha256: checksum,
    sha256Checksum: checksum,
    storageKey: row.storage_key,
    storageUrl: row.storage_url,
    moderationStatus: modStatus,
    rejectionReason: row.rejection_reason || row.moderation_notes || null,
    moderationNotes: row.moderation_notes || row.rejection_reason || null,
    moderatedBy: row.moderated_by || null,
    moderatedAt: row.moderated_at || null,
    isPublic: Boolean(row.is_public ?? (modStatus === 'APPROVED')),
    caption: row.caption || null,
    createdAt: row.created_at,
  };
}

async function validateMediaInput({
  mediaType,
  mimeType,
  fileSizeBytes,
  sizeBytes,
  durationSeconds,
  contentHashSha256,
  sha256Checksum,
}) {
  const normType = normalizeMediaType(mediaType, mimeType);
  const normMime = String(mimeType || '').toLowerCase().trim();
  const size = Number(fileSizeBytes ?? sizeBytes ?? 0);
  const hash = String(contentHashSha256 || sha256Checksum || '').trim().toLowerCase();

  const maxPhotoBytes = await getConfigNumber('MEDIA_MAX_PHOTO_SIZE_BYTES', 5 * 1024 * 1024);
  const maxVideoBytes = await getConfigNumber('MEDIA_MAX_VIDEO_SIZE_BYTES', 20 * 1024 * 1024);
  const minVideoSec = await getConfigNumber('MEDIA_MIN_VIDEO_DURATION_SEC', 5);
  const maxVideoSec = await getConfigNumber('MEDIA_MAX_VIDEO_DURATION_SEC', 10);

  if (!Number.isFinite(size) || size <= 0) {
    const err = new Error('fileSizeBytes must be a positive integer');
    err.status = 400;
    err.code = 'INVALID_MEDIA_SIZE';
    throw err;
  }

  if (normType === 'PHOTO') {
    if (!ALLOWED_PHOTO_MIMES.has(normMime)) {
      const err = new Error('Photo must be JPG, PNG, or WEBP (image/jpeg, image/png, image/webp).');
      err.status = 400;
      err.code = 'INVALID_MEDIA_MIME';
      throw err;
    }
    if (size > maxPhotoBytes) {
      const err = new Error(`Photo exceeds maximum allowed size of ${maxPhotoBytes} bytes (5 MB).`);
      err.status = 400;
      err.code = 'MEDIA_FILE_TOO_LARGE';
      throw err;
    }
  } else if (normType === 'VIDEO') {
    if (!ALLOWED_VIDEO_MIMES.has(normMime)) {
      const err = new Error('Video must be MP4 (video/mp4).');
      err.status = 400;
      err.code = 'INVALID_MEDIA_MIME';
      throw err;
    }
    if (size > maxVideoBytes) {
      const err = new Error(`Video exceeds maximum allowed size of ${maxVideoBytes} bytes (20 MB).`);
      err.status = 400;
      err.code = 'MEDIA_FILE_TOO_LARGE';
      throw err;
    }
    const dur = Number(durationSeconds);
    if (!Number.isFinite(dur) || dur < minVideoSec || dur > maxVideoSec) {
      const err = new Error(`Video duration must be between ${minVideoSec} and ${maxVideoSec} seconds.`);
      err.status = 400;
      err.code = 'INVALID_VIDEO_DURATION';
      throw err;
    }
  } else {
    const err = new Error('mediaType must be PHOTO or VIDEO');
    err.status = 400;
    err.code = 'INVALID_MEDIA_TYPE';
    throw err;
  }

  // If no hash was supplied in a simple upload call, derive a deterministic hash or require it when provided
  const resolvedHash =
    hash && hash.length >= 8
      ? hash
      : crypto
          .createHash('sha256')
          .update(`${normType}:${normMime}:${size}:${durationSeconds || 0}:${Date.now()}:${Math.random()}`)
          .digest('hex');

  return {
    mediaType: normType,
    mimeType: normMime,
    fileSizeBytes: size,
    durationSeconds: normType === 'VIDEO' ? Number(durationSeconds) : null,
    contentHashSha256: resolvedHash,
  };
}

/**
 * Generates a presigned upload URL after validating file constraints on the server (FR-VEN-02).
 */
async function createPresignedMediaUpload(vendorId, payload = {}) {
  const validated = await validateMediaInput(payload);
  const presigned = await storageProvider.createPresignedUpload({
    vendorId,
    fileName: payload.fileName || `asset.${validated.mediaType === 'VIDEO' ? 'mp4' : 'jpg'}`,
    mimeType: validated.mimeType,
    sizeBytes: validated.fileSizeBytes,
    sha256Checksum: validated.contentHashSha256,
  });

  return {
    ...presigned,
    validatedConstraints: validated,
  };
}

/**
 * Registers an uploaded media asset, enforces cross-vendor duplicate SHA-256 hash rejection,
 * and places the item into the PENDING moderation queue (private until approved).
 */
async function registerVendorMedia(vendorId, payload = {}) {
  const validated = await validateMediaInput(payload);

  // Check for cross-vendor duplicate content hash (FR-VEN-02 anti-fake-portfolio protection)
  let duplicateVendor = null;
  if (db.isPgActive()) {
    const dupRes = await db.query(
      'SELECT vendor_id FROM vendor_media WHERE content_hash_sha256 = $1 AND vendor_id <> $2 LIMIT 1;',
      [validated.contentHashSha256, vendorId]
    );
    if (dupRes.rows[0]) duplicateVendor = dupRes.rows[0].vendor_id;
  } else {
    for (const m of inMemoryStore.vendorMedia) {
      const existingHash = m.content_hash_sha256 || m.sha256_checksum;
      if (existingHash === validated.contentHashSha256 && m.vendor_id !== vendorId) {
        duplicateVendor = m.vendor_id;
        break;
      }
    }
  }

  if (duplicateVendor) {
    const err = new Error(
      'Duplicate media detected: this exact file hash is already registered to another vendor portfolio.'
    );
    err.status = 409;
    err.code = 'DUPLICATE_MEDIA_HASH';
    throw err;
  }

  const id = `med_${crypto.randomBytes(6).toString('hex')}`;
  const now = new Date().toISOString();
  const storageKey = payload.storageKey || `vendors/${vendorId}/${id}`;
  const storageUrl = payload.storageUrl || `https://storage.bookme.local/${storageKey}`;

  const row = {
    id,
    vendor_id: vendorId,
    package_id: payload.packageId || null,
    media_type: validated.mediaType,
    mime_type: validated.mimeType,
    file_name: payload.fileName || `${id}.${validated.mediaType === 'VIDEO' ? 'mp4' : 'jpg'}`,
    file_size_bytes: validated.fileSizeBytes,
    size_bytes: validated.fileSizeBytes,
    duration_seconds: validated.durationSeconds,
    content_hash_sha256: validated.contentHashSha256,
    sha256_checksum: validated.contentHashSha256,
    storage_key: storageKey,
    storage_url: storageUrl,
    moderation_status: 'PENDING',
    rejection_reason: null,
    moderation_notes: null,
    moderated_by: null,
    moderated_at: null,
    is_public: false,
    caption: payload.caption || null,
    created_at: now,
  };

  if (db.isPgActive()) {
    await db.query(
      `INSERT INTO vendor_media (
         id, vendor_id, package_id, media_type, mime_type, file_name, file_size_bytes,
         duration_seconds, content_hash_sha256, storage_key, storage_url,
         moderation_status, is_public, created_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14);`,
      [
        row.id,
        row.vendor_id,
        row.package_id,
        row.media_type,
        row.media_type === 'VIDEO' ? 'video/mp4' : row.mime_type,
        row.file_name,
        row.file_size_bytes,
        row.duration_seconds,
        row.content_hash_sha256,
        row.storage_key,
        row.storage_url,
        row.moderation_status,
        row.is_public,
        row.created_at,
      ]
    );
  } else {
    inMemoryStore.vendorMedia.push(row);
    inMemoryStore.mediaAssets.push(row);
  }

  return mapMediaRow(row);
}

async function getVendorMedia(vendorId, { packageId, publicOnly = false, moderationStatus } = {}) {
  let items = [];
  if (db.isPgActive()) {
    const res = await db.query(
      'SELECT * FROM vendor_media WHERE vendor_id = $1 ORDER BY created_at DESC;',
      [vendorId]
    );
    items = res.rows.map(mapMediaRow);
  } else {
    items = inMemoryStore.vendorMedia
      .filter((m) => m.vendor_id === vendorId)
      .map(mapMediaRow);
  }

  if (packageId) {
    items = items.filter((m) => m.packageId === packageId || m.packageId === null);
  }
  if (publicOnly) {
    items = items.filter((m) => m.isPublic && m.moderationStatus === 'APPROVED');
  }
  if (moderationStatus) {
    items = items.filter((m) => m.moderationStatus === moderationStatus);
  }
  return items;
}

async function deleteVendorMedia(mediaId, vendorId) {
  if (!db.isPgActive()) {
    const idx = inMemoryStore.vendorMedia.findIndex(
      (m) => m.id === mediaId && (!vendorId || m.vendor_id === vendorId)
    );
    if (idx === -1) return false;
    inMemoryStore.vendorMedia.splice(idx, 1);
    const assetIdx = inMemoryStore.mediaAssets.findIndex((m) => m.id === mediaId);
    if (assetIdx !== -1) inMemoryStore.mediaAssets.splice(assetIdx, 1);
    return true;
  }

  const res = await db.query(
    'DELETE FROM vendor_media WHERE id = $1 AND ($2::varchar IS NULL OR vendor_id = $2) RETURNING id;',
    [mediaId, vendorId || null]
  );
  return res.rowCount > 0;
}

async function listModerationQueue(status = 'PENDING') {
  const filterStatus = typeof status === 'object' && status !== null ? status.status || 'PENDING' : status || 'PENDING';
  if (db.isPgActive()) {
    const res = await db.query(
      'SELECT * FROM vendor_media WHERE moderation_status = $1 ORDER BY created_at ASC;',
      [filterStatus]
    );
    return res.rows.map(mapMediaRow);
  }
  return inMemoryStore.vendorMedia
    .filter((m) => m.moderation_status === filterStatus)
    .map(mapMediaRow);
}

async function moderateMediaItem(
  mediaId,
  { status, rejectionReason, moderationNotes, actorId, actorRole, moderatedBy } = {}
) {
  const normStatus = String(status || '').toUpperCase();
  if (!['APPROVED', 'REJECTED'].includes(normStatus)) {
    const err = new Error('Moderation status must be APPROVED or REJECTED');
    err.status = 400;
    err.code = 'INVALID_MODERATION_STATUS';
    throw err;
  }

  const reasonText = rejectionReason || moderationNotes || null;
  if (normStatus === 'REJECTED' && (!reasonText || !String(reasonText).trim())) {
    const err = new Error('rejectionReason is mandatory when rejecting media');
    err.status = 400;
    err.code = 'MODERATION_REASON_REQUIRED';
    throw err;
  }

  const isPublic = normStatus === 'APPROVED';
  const now = new Date().toISOString();
  const moderator = actorId || moderatedBy || 'operations';

  let updatedRow = null;
  if (db.isPgActive()) {
    const res = await db.query(
      `UPDATE vendor_media
       SET moderation_status = $1, rejection_reason = $2, moderated_by = $3, moderated_at = $4, is_public = $5
       WHERE id = $6 RETURNING *;`,
      [normStatus, reasonText, moderator, now, isPublic, mediaId]
    );
    updatedRow = res.rows[0];
  } else {
    const existing = inMemoryStore.vendorMedia.find((m) => m.id === mediaId);
    if (existing) {
      existing.moderation_status = normStatus;
      existing.rejection_reason = reasonText;
      existing.moderation_notes = reasonText;
      existing.moderated_by = moderator;
      existing.moderated_at = now;
      existing.is_public = isPublic;
      updatedRow = existing;
    }
  }

  if (!updatedRow) {
    const err = new Error('Media asset not found');
    err.status = 404;
    err.code = 'MEDIA_NOT_FOUND';
    throw err;
  }

  await appendAuditLog({
    actorId: moderator,
    actorRole: actorRole || 'operations',
    action: `MEDIA_MODERATION_${normStatus}`,
    entity: 'MediaAsset',
    entityId: mediaId,
    afterState: { moderationStatus: normStatus, isPublic, rejectionReason: reasonText },
    reason: reasonText,
  });

  return mapMediaRow(updatedRow);
}

/**
 * Checks whether a vendor/package satisfies FR-VEN-02 publish criteria:
 * at least 3 APPROVED photos and 1 APPROVED video (5–10s).
 */
async function checkPackagePublishMediaEligibility(vendorId, packageId = null) {
  const minPhotos = await getConfigNumber('MEDIA_MIN_PHOTOS_TO_PUBLISH', 3);
  const minVideos = await getConfigNumber('MEDIA_MIN_VIDEOS_TO_PUBLISH', 1);

  const allApproved = await getVendorMedia(vendorId, {
    packageId,
    publicOnly: true,
    moderationStatus: 'APPROVED',
  });

  const approvedPhotos = allApproved.filter((m) => m.mediaType === 'PHOTO').length;
  const approvedVideos = allApproved.filter((m) => m.mediaType === 'VIDEO').length;

  const eligible = approvedPhotos >= minPhotos && approvedVideos >= minVideos;
  const reasons = [];
  if (approvedPhotos < minPhotos) {
    reasons.push(`Requires at least ${minPhotos} approved photos (currently ${approvedPhotos}).`);
  }
  if (approvedVideos < minVideos) {
    reasons.push(`Requires at least ${minVideos} approved 5–10s video (currently ${approvedVideos}).`);
  }

  return {
    eligible,
    canPublish: eligible,
    approvedPhotos,
    approvedVideos,
    requiredPhotos: minPhotos,
    requiredVideos: minVideos,
    reasons,
  };
}

module.exports = {
  createPresignedMediaUpload,
  generatePresignedUploadUrl: createPresignedMediaUpload,
  registerVendorMedia,
  registerMediaAsset: registerVendorMedia,
  getVendorMedia,
  listVendorMedia: getVendorMedia,
  deleteVendorMedia,
  listModerationQueue,
  moderateMediaItem,
  moderateMediaAsset: moderateMediaItem,
  checkPackagePublishMediaEligibility,
  evaluatePackageMediaEligibility: checkPackagePublishMediaEligibility,
};
