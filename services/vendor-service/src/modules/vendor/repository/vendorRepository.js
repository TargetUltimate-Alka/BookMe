const crypto = require('crypto');
const db = require('../../../shared/db');
const inMemoryStore = require('../../../shared/inMemoryStore');
const {
  encryptSensitive,
  maskPan,
  maskBankAccount,
  containsRawAadhaar,
  redactVendorForPublic,
} = require('../../../shared/security/encryption');
const {
  toPaiseBigInt,
  calculateDiscountedPrice,
  calculateDistanceKm,
} = require('../../../shared/utils/moneyAndTime');
const {
  digilockerProvider,
  panProvider,
  bankPennyDropProvider,
} = require('../../../shared/providers/externalProviders');
const {
  getConfigValue,
  recordAuditLog,
  enqueueOutboxEvent,
} = require('./configAuditRepository');
const categoriesRepo = require('./categoriesRepository');
const packagesRepo = require('./packagesRepository');
const mediaRepo = require('./mediaRepository');
const availabilityRepo = require('../../availability/repository/availabilityRepository');

const VALID_KYC_STATUSES = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED'];

function mapVendorRow(row, options = {}) {
  if (!row) return null;
  const vendorCategories = inMemoryStore.vendorCategories
    .filter((vc) => vc.vendor_id === row.id)
    .map((vc) => {
      const cat = inMemoryStore.categories.find((c) => c.id === vc.category_id);
      return {
        categoryId: vc.category_id,
        slug: cat ? cat.slug : vc.category_id,
        name: cat ? cat.name : vc.category_id,
        isPrimary: Boolean(vc.is_primary),
      };
    });

  const mapped = {
    id: row.id,
    userId: row.user_id,
    businessName: row.business_name,
    category: row.category,
    categories: vendorCategories.length > 0
      ? vendorCategories
      : row.category
        ? [{ categoryId: row.category, slug: String(row.category).toLowerCase(), name: row.category, isPrimary: true }]
        : [],
    description: row.description || '',
    photoUrl: row.photo_url || null,
    location: row.location || '',
    address: row.address || '',
    latitude: row.latitude !== null && row.latitude !== undefined ? Number(row.latitude) : null,
    longitude: row.longitude !== null && row.longitude !== undefined ? Number(row.longitude) : null,
    serviceRadiusKm: Number(row.service_radius_km ?? 25),
    serviceAreas: Array.isArray(row.service_areas) ? row.service_areas : [],
    verified: Boolean(row.verified),
    kycStatus: row.kyc_status || (row.verified ? 'APPROVED' : 'DRAFT'),
    rejectionReason: row.rejection_reason || null,
    agreementVersion: row.agreement_version || null,
    agreementSignedAt: row.agreement_signed_at || null,
    rating: row.rating !== null && row.rating !== undefined ? parseFloat(row.rating) : null,
    reviewCount: Number(row.review_count ?? 0),
    isFeatured: Boolean(row.is_featured),
    featuredRank: row.featured_rank !== null && row.featured_rank !== undefined ? Number(row.featured_rank) : null,
    isDemo: Boolean(row.is_demo),
    violationCount: Number(row.violation_count ?? 0),
    preferredLanguage: row.preferred_language || 'en',
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };

  if (options.publicView) {
    return redactVendorForPublic(mapped);
  }
  return mapped;
}

async function recordStatusHistory(vendorId, fromStatus, toStatus, reason, changedBy, changedByRole) {
  const entry = {
    id: `vsh_${crypto.randomBytes(6).toString('hex')}`,
    vendor_id: vendorId,
    from_status: fromStatus || null,
    to_status: toStatus,
    reason: reason || null,
    changed_by: changedBy || 'system',
    changed_by_role: changedByRole || 'system',
    created_at: new Date(),
  };

  if (!db.isPgActive()) {
    inMemoryStore.vendorStatusHistory.push(entry);
    return entry;
  }

  await db.query(
    `INSERT INTO vendor_status_history (id, vendor_id, from_status, to_status, reason, changed_by, changed_by_role)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [entry.id, entry.vendor_id, entry.from_status, entry.to_status, entry.reason, entry.changed_by, entry.changed_by_role]
  );
  return entry;
}

async function syncVendorCategoriesInStore(vendorId, categoryInputs = [], primaryCategoryName = '') {
  const resolvedIds = [];
  if (Array.isArray(categoryInputs)) {
    for (const item of categoryInputs) {
      const val = typeof item === 'string' ? item : item?.categoryId || item?.slug || item?.name;
      if (!val) continue;
      const cat = await categoriesRepo.resolveCategoryBySlugOrId(val);
      if (cat && !resolvedIds.includes(cat.id)) {
        resolvedIds.push(cat.id);
      }
    }
  }
  if (primaryCategoryName && resolvedIds.length === 0) {
    const cat = await categoriesRepo.resolveCategoryBySlugOrId(primaryCategoryName);
    if (cat) resolvedIds.push(cat.id);
  }

  if (resolvedIds.length === 0) return;

  // Update inMemoryStore
  inMemoryStore.vendorCategories = inMemoryStore.vendorCategories.filter((vc) => vc.vendor_id !== vendorId);
  resolvedIds.forEach((catId, idx) => {
    inMemoryStore.vendorCategories.push({
      vendor_id: vendorId,
      category_id: catId,
      is_primary: idx === 0,
    });
  });

  if (db.isPgActive()) {
    await db.query(`DELETE FROM vendor_categories WHERE vendor_id = $1`, [vendorId]);
    for (let i = 0; i < resolvedIds.length; i++) {
      await db.query(
        `INSERT INTO vendor_categories (vendor_id, category_id, is_primary)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [vendorId, resolvedIds[i], i === 0]
      );
    }
  }
}

// ============================================================================
// Create & Update Vendor Profile / Onboarding Draft (FR-ONB-02)
// ============================================================================
async function createVendor(payload) {
  if (containsRawAadhaar(payload)) {
    const err = new Error('SECURITY_VIOLATION: Raw 12-digit Aadhaar numbers must never be transmitted or stored (FR-ONB-03 / NFR-SEC-05). Use DigiLocker KYC.');
    err.status = 400;
    err.code = 'RAW_AADHAAR_FORBIDDEN';
    throw err;
  }

  const {
    userId,
    businessName,
    category,
    categories,
    description = '',
    photoUrl = null,
    location = '',
    address = '',
    latitude = null,
    longitude = null,
    serviceRadiusKm = 25,
    serviceAreas = [],
    preferredLanguage = 'en',
    onboardingMode = false, // When true, starts in DRAFT (unverified); legacy callers auto-verify unless specified
    kycStatus: requestedKycStatus,
    verified: requestedVerified,
    isDemo = false,
  } = payload;

  const id = payload.id || `vnd_${crypto.randomBytes(4).toString('hex')}`;
  const primaryCategory = category || (Array.isArray(categories) && categories[0]) || 'General';

  // Determine initial status:
  // If called via new onboarding flow or isDemo, starts in DRAFT / unverified.
  // If called via legacy V1 POST /api/vendors without onboardingMode, keep V1 compatibility while recording status.
  const isDraftMode = onboardingMode === true || isDemo === true || requestedKycStatus === 'DRAFT';
  const verified = requestedVerified !== undefined ? Boolean(requestedVerified) : !isDraftMode;
  const kycStatus = requestedKycStatus || (verified ? 'APPROVED' : 'DRAFT');
  const currentAgreementVer = String(await getConfigValue('CURRENT_VENDOR_AGREEMENT_VERSION', 'v1.0'));

  const rowObj = {
    id,
    user_id: userId,
    business_name: businessName,
    category: typeof primaryCategory === 'string' ? primaryCategory : primaryCategory.name || 'General',
    description,
    photo_url: photoUrl,
    location,
    address,
    latitude: latitude !== null && latitude !== undefined ? Number(latitude) : null,
    longitude: longitude !== null && longitude !== undefined ? Number(longitude) : null,
    service_radius_km: Number(serviceRadiusKm ?? 25),
    service_areas: Array.isArray(serviceAreas) ? serviceAreas : [],
    verified,
    kyc_status: kycStatus,
    rejection_reason: null,
    agreement_version: verified ? currentAgreementVer : null,
    agreement_signed_at: verified ? new Date() : null,
    agreement_ip: null,
    rating: payload.rating !== undefined ? payload.rating : null,
    review_count: Number(payload.reviewCount ?? 0),
    is_featured: Boolean(payload.isFeatured ?? false),
    featured_rank: payload.featuredRank ?? null,
    is_demo: Boolean(isDemo),
    violation_count: 0,
    preferred_language: preferredLanguage,
    created_at: new Date(),
    updated_at: new Date(),
  };

  if (!db.isPgActive()) {
    inMemoryStore.vendors.push(rowObj);
    await syncVendorCategoriesInStore(id, categories, rowObj.category);
    await recordStatusHistory(id, null, kycStatus, 'Initial vendor profile created', userId, 'vendor');
    return mapVendorRow(rowObj);
  }

  const query = `
    INSERT INTO vendors (
      id, user_id, business_name, category, description, photo_url, location, address,
      latitude, longitude, service_radius_km, service_areas, verified, kyc_status,
      agreement_version, agreement_signed_at, rating, review_count, is_featured, is_demo, preferred_language
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
    RETURNING *;
  `;
  const values = [
    rowObj.id,
    rowObj.user_id,
    rowObj.business_name,
    rowObj.category,
    rowObj.description,
    rowObj.photo_url,
    rowObj.location,
    rowObj.address,
    rowObj.latitude,
    rowObj.longitude,
    rowObj.service_radius_km,
    JSON.stringify(rowObj.service_areas),
    rowObj.verified,
    rowObj.kyc_status,
    rowObj.agreement_version,
    rowObj.agreement_signed_at,
    rowObj.rating,
    rowObj.review_count,
    rowObj.is_featured,
    rowObj.is_demo,
    rowObj.preferred_language,
  ];

  const result = await db.query(query, values);
  await syncVendorCategoriesInStore(id, categories, rowObj.category);
  await recordStatusHistory(id, null, kycStatus, 'Initial vendor profile created', userId, 'vendor');
  return mapVendorRow(result.rows[0]);
}

async function getVendorById(id, options = {}) {
  if (!db.isPgActive()) {
    const row = inMemoryStore.vendors.find((v) => v.id === id);
    return mapVendorRow(row, options);
  }
  const query = `SELECT * FROM vendors WHERE id = $1;`;
  const result = await db.query(query, [id]);
  return mapVendorRow(result.rows[0], options);
}

async function getVendorByUserId(userId) {
  if (!db.isPgActive()) {
    const row = inMemoryStore.vendors.find((v) => v.user_id === userId);
    return mapVendorRow(row);
  }
  const query = `SELECT * FROM vendors WHERE user_id = $1;`;
  const result = await db.query(query, [userId]);
  return mapVendorRow(result.rows[0]);
}

async function getVendorsByIds(ids = [], options = {}) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  if (!db.isPgActive()) {
    return inMemoryStore.vendors
      .filter((v) => ids.includes(v.id))
      .map((v) => mapVendorRow(v, options));
  }
  const res = await db.query(`SELECT * FROM vendors WHERE id = ANY($1::varchar[])`, [ids]);
  return res.rows.map((r) => mapVendorRow(r, options));
}

async function updateVendor(id, updateFields) {
  if (containsRawAadhaar(updateFields)) {
    const err = new Error('SECURITY_VIOLATION: Raw 12-digit Aadhaar numbers must never be stored.');
    err.status = 400;
    err.code = 'RAW_AADHAAR_FORBIDDEN';
    throw err;
  }

  if (!db.isPgActive()) {
    const row = inMemoryStore.vendors.find((v) => v.id === id);
    if (!row) return null;

    const map = {
      businessName: 'business_name',
      description: 'description',
      photoUrl: 'photo_url',
      location: 'location',
      address: 'address',
      category: 'category',
      latitude: 'latitude',
      longitude: 'longitude',
      serviceRadiusKm: 'service_radius_km',
      serviceAreas: 'service_areas',
      preferredLanguage: 'preferred_language',
    };

    for (const [k, col] of Object.entries(map)) {
      if (updateFields[k] !== undefined) {
        row[col] = updateFields[k];
      }
    }
    row.updated_at = new Date();

    if (updateFields.categories !== undefined || updateFields.category !== undefined) {
      await syncVendorCategoriesInStore(id, updateFields.categories, row.category);
    }
    return mapVendorRow(row);
  }

  const allowedFields = {
    businessName: 'business_name',
    description: 'description',
    photoUrl: 'photo_url',
    location: 'location',
    address: 'address',
    category: 'category',
    latitude: 'latitude',
    longitude: 'longitude',
    serviceRadiusKm: 'service_radius_km',
    preferredLanguage: 'preferred_language',
  };

  const setClauses = [];
  const values = [];
  let paramIndex = 1;

  for (const [key, dbColumn] of Object.entries(allowedFields)) {
    if (updateFields[key] !== undefined) {
      setClauses.push(`${dbColumn} = $${paramIndex++}`);
      values.push(updateFields[key]);
    }
  }
  if (updateFields.serviceAreas !== undefined) {
    setClauses.push(`service_areas = $${paramIndex++}`);
    values.push(JSON.stringify(updateFields.serviceAreas));
  }

  if (setClauses.length > 0) {
    setClauses.push(`updated_at = NOW()`);
    values.push(id);
    const query = `
      UPDATE vendors
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *;
    `;
    const result = await db.query(query, values);
    if (updateFields.categories !== undefined || updateFields.category !== undefined) {
      await syncVendorCategoriesInStore(id, updateFields.categories, updateFields.category);
    }
    return mapVendorRow(result.rows[0]);
  }

  return getVendorById(id);
}

// ============================================================================
// KYC Verification Flows (FR-ONB-03, NFR-SEC-02, NFR-SEC-05)
// ============================================================================
async function ensureKycRecord(vendorId) {
  if (!db.isPgActive()) {
    let rec = inMemoryStore.vendorKycRecords.find((k) => k.vendor_id === vendorId);
    if (!rec) {
      rec = {
        id: `kyc_${crypto.randomBytes(6).toString('hex')}`,
        vendor_id: vendorId,
        digilocker_ref_enc: null,
        aadhaar_last4: null,
        verified_name: null,
        digilocker_verified: false,
        consent_given: false,
        consent_timestamp: null,
        pan_masked: null,
        pan_ref_enc: null,
        pan_verified: false,
        bank_account_masked: null,
        bank_ifsc: null,
        bank_ref_enc: null,
        bank_verified: false,
        verification_notes: null,
        verified_by: null,
        verified_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      inMemoryStore.vendorKycRecords.push(rec);
    }
    return rec;
  }

  const id = `kyc_${crypto.randomBytes(6).toString('hex')}`;
  await db.query(
    `INSERT INTO vendor_kyc_records (id, vendor_id) VALUES ($1, $2) ON CONFLICT (vendor_id) DO NOTHING`,
    [id, vendorId]
  );
  const res = await db.query(`SELECT * FROM vendor_kyc_records WHERE vendor_id = $1`, [vendorId]);
  return res.rows[0];
}

function mapKycStatusResponse(rec, vendor) {
  return {
    vendorId,
    kycStatus: vendor ? vendor.kycStatus : 'DRAFT',
    rejectionReason: vendor ? vendor.rejectionReason : null,
    digilocker: {
      verified: Boolean(rec?.digilocker_verified),
      aadhaarLast4: rec?.aadhaar_last4 ? `XXXX-XXXX-${rec.aadhaar_last4}` : null,
      verifiedName: rec?.verified_name || null,
      consentGiven: Boolean(rec?.consent_given),
      consentTimestamp: rec?.consent_timestamp || null,
    },
    pan: {
      verified: Boolean(rec?.pan_verified),
      panMasked: rec?.pan_masked || null,
    },
    bank: {
      verified: Boolean(rec?.bank_verified),
      accountMasked: rec?.bank_account_masked || null,
      ifsc: rec?.bank_ifsc || null,
    },
    agreement: {
      signedVersion: vendor?.agreementVersion || null,
      signedAt: vendor?.agreementSignedAt || null,
    },
    verifiedAt: rec?.verified_at || null,
  };
  function vendorId() {}
}

async function getKycStatus(vendorId) {
  const vendor = await getVendorById(vendorId);
  if (!vendor) return null;
  const rec = await ensureKycRecord(vendorId);
  const requiredAgreementVersion = String(await getConfigValue('CURRENT_VENDOR_AGREEMENT_VERSION', 'v1.0'));
  const statusHistory = await getVendorStatusHistory(vendorId);

  return {
    vendorId,
    kycStatus: vendor.kycStatus,
    verified: vendor.verified,
    rejectionReason: vendor.rejectionReason,
    digilocker: {
      verified: Boolean(rec.digilocker_verified),
      aadhaarMasked: rec.aadhaar_last4 ? `XXXX-XXXX-${rec.aadhaar_last4}` : null,
      aadhaarLast4: rec.aadhaar_last4 || null,
      verifiedName: rec.verified_name || null,
      consentGiven: Boolean(rec.consent_given),
      consentTimestamp: rec.consent_timestamp || null,
    },
    pan: {
      verified: Boolean(rec.pan_verified),
      panMasked: rec.pan_masked || null,
    },
    bank: {
      verified: Boolean(rec.bank_verified),
      accountMasked: rec.bank_account_masked || null,
      ifsc: rec.bank_ifsc || null,
    },
    agreement: {
      signedVersion: vendor.agreementVersion,
      requiredVersion: requiredAgreementVersion,
      isCurrentVersionSigned: vendor.agreementVersion === requiredAgreementVersion,
      signedAt: vendor.agreementSignedAt,
    },
    statusHistory,
  };
}

async function startDigiLockerKyc(vendorId, { redirectUri } = {}) {
  const session = await digilockerProvider.createAuthUrl({ vendorId, redirectUri });
  return session;
}

async function completeDigiLockerCallback(vendorId, payload = {}) {
  if (containsRawAadhaar(payload)) {
    const err = new Error('SECURITY_VIOLATION: Raw 12-digit Aadhaar numbers are prohibited. Only DigiLocker authorization code or last-4 masked digits are permitted.');
    err.status = 400;
    err.code = 'RAW_AADHAAR_FORBIDDEN';
    throw err;
  }

  if (payload.consentAccepted === false) {
    const err = new Error('Explicit user consent is required for DigiLocker KYC verification');
    err.status = 400;
    throw err;
  }

  const exchangeResult = await digilockerProvider.exchangeCode({
    code: payload.code || 'sandbox_auth_code',
    vendorId,
    simulatedName: payload.verifiedName,
    simulatedLast4: payload.aadhaarLast4,
  });

  const encRef = encryptSensitive(exchangeResult.digilockerRef);
  const consentTime = new Date(exchangeResult.consentTimestamp || Date.now());

  if (!db.isPgActive()) {
    const rec = await ensureKycRecord(vendorId);
    rec.digilocker_ref_enc = encRef;
    rec.aadhaar_last4 = String(exchangeResult.aadhaarLast4).slice(-4);
    rec.verified_name = exchangeResult.verifiedName;
    rec.digilocker_verified = true;
    rec.consent_given = true;
    rec.consent_timestamp = consentTime;
    rec.updated_at = new Date();
  } else {
    await ensureKycRecord(vendorId);
    await db.query(
      `UPDATE vendor_kyc_records
       SET digilocker_ref_enc = $1,
           aadhaar_last4 = $2,
           verified_name = $3,
           digilocker_verified = TRUE,
           consent_given = TRUE,
           consent_timestamp = $4,
           updated_at = NOW()
       WHERE vendor_id = $5`,
      [encRef, String(exchangeResult.aadhaarLast4).slice(-4), exchangeResult.verifiedName, consentTime, vendorId]
    );
  }

  await recordAuditLog({
    actorId: vendorId,
    actorRole: 'vendor',
    action: 'KYC_DIGILOCKER_VERIFIED',
    targetType: 'vendor',
    targetId: vendorId,
    metadata: {
      providerMode: exchangeResult.providerMode,
      aadhaarMasked: `XXXX-XXXX-${String(exchangeResult.aadhaarLast4).slice(-4)}`,
    },
  });

  return getKycStatus(vendorId);
}

async function verifyPanKyc(vendorId, { panNumber, nameOnPan }) {
  const result = await panProvider.verifyPan({ panNumber, nameOnPan });
  const masked = maskPan(result.pan);
  const encRef = encryptSensitive(JSON.stringify({ pan: result.pan, referenceId: result.referenceId }));

  if (!db.isPgActive()) {
    const rec = await ensureKycRecord(vendorId);
    rec.pan_masked = masked;
    rec.pan_ref_enc = encRef;
    rec.pan_verified = true;
    rec.updated_at = new Date();
  } else {
    await ensureKycRecord(vendorId);
    await db.query(
      `UPDATE vendor_kyc_records
       SET pan_masked = $1, pan_ref_enc = $2, pan_verified = TRUE, updated_at = NOW()
       WHERE vendor_id = $3`,
      [masked, encRef, vendorId]
    );
  }

  await recordAuditLog({
    actorId: vendorId,
    actorRole: 'vendor',
    action: 'KYC_PAN_VERIFIED',
    targetType: 'vendor',
    targetId: vendorId,
    metadata: { panMasked: masked, providerMode: result.providerMode },
  });

  return getKycStatus(vendorId);
}

async function verifyBankPennyDrop(vendorId, { accountHolderName, accountNumber, ifscCode }) {
  const result = await bankPennyDropProvider.verifyBankAccount({
    accountHolderName,
    accountNumber,
    ifscCode,
  });
  const maskedAcct = maskBankAccount(accountNumber);
  const encRef = encryptSensitive(
    JSON.stringify({
      accountNumber: String(accountNumber).trim(),
      ifsc: result.ifscCode,
      pennyDropRef: result.pennyDropRef,
    })
  );

  if (!db.isPgActive()) {
    const rec = await ensureKycRecord(vendorId);
    rec.bank_account_masked = maskedAcct;
    rec.bank_ifsc = result.ifscCode;
    rec.bank_ref_enc = encRef;
    rec.bank_verified = true;
    rec.updated_at = new Date();
  } else {
    await ensureKycRecord(vendorId);
    await db.query(
      `UPDATE vendor_kyc_records
       SET bank_account_masked = $1, bank_ifsc = $2, bank_ref_enc = $3, bank_verified = TRUE, updated_at = NOW()
       WHERE vendor_id = $4`,
      [maskedAcct, result.ifscCode, encRef, vendorId]
    );
  }

  await recordAuditLog({
    actorId: vendorId,
    actorRole: 'vendor',
    action: 'KYC_BANK_PENNY_DROP_VERIFIED',
    targetType: 'vendor',
    targetId: vendorId,
    metadata: { accountMasked: maskedAcct, ifsc: result.ifscCode, providerMode: result.providerMode },
  });

  return getKycStatus(vendorId);
}

// ============================================================================
// Vendor Agreement E-Sign (FR-ONB-04)
// ============================================================================
async function signVendorAgreement(vendorId, { agreementVersion, ipAddress = '127.0.0.1', userAgent = '', accepted = true }) {
  if (!accepted) {
    const err = new Error('Vendor agreement must be explicitly accepted');
    err.status = 400;
    throw err;
  }

  const requiredVersion = String(await getConfigValue('CURRENT_VENDOR_AGREEMENT_VERSION', 'v1.0'));
  const versionToSign = agreementVersion || requiredVersion;
  const signedAt = new Date();
  const canonicalTerms = `BookMe Vendor Marketplace Agreement ${versionToSign} | Vendor:${vendorId} | SignedAt:${signedAt.toISOString()}`;
  const docHash = crypto.createHash('sha256').update(canonicalTerms).digest('hex');
  const agrId = `agr_${crypto.randomBytes(6).toString('hex')}`;

  if (!db.isPgActive()) {
    const vendor = inMemoryStore.vendors.find((v) => v.id === vendorId);
    if (!vendor) {
      const err = new Error('Vendor not found');
      err.status = 404;
      throw err;
    }
    vendor.agreement_version = versionToSign;
    vendor.agreement_signed_at = signedAt;
    vendor.agreement_ip = ipAddress;
    vendor.updated_at = signedAt;

    inMemoryStore.vendorAgreements.push({
      id: agrId,
      vendor_id: vendorId,
      agreement_version: versionToSign,
      document_hash: docHash,
      ip_address: ipAddress,
      user_agent: userAgent,
      signed_at: signedAt,
    });
  } else {
    await db.query(
      `INSERT INTO vendor_agreements (id, vendor_id, agreement_version, document_hash, ip_address, user_agent, signed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [agrId, vendorId, versionToSign, docHash, ipAddress, userAgent, signedAt]
    );
    await db.query(
      `UPDATE vendors SET agreement_version = $1, agreement_signed_at = $2, agreement_ip = $3, updated_at = NOW() WHERE id = $4`,
      [versionToSign, signedAt, ipAddress, vendorId]
    );
  }

  await recordAuditLog({
    actorId: vendorId,
    actorRole: 'vendor',
    action: 'VENDOR_AGREEMENT_SIGNED',
    targetType: 'vendor',
    targetId: vendorId,
    ipAddress,
    metadata: { agreementVersion: versionToSign, documentHash: docHash },
  });

  return {
    agreementId: agrId,
    vendorId,
    agreementVersion: versionToSign,
    documentHash: docHash,
    ipAddress,
    signedAt: signedAt.toISOString(),
  };
}

// ============================================================================
// Submit for Review & Verifier Approval/Rejection (FR-ONB-02, FR-ONB-06)
// ============================================================================
async function submitVendorForReview(vendorId, actor = {}) {
  const vendor = await getVendorById(vendorId);
  if (!vendor) {
    const err = new Error('Vendor not found');
    err.status = 404;
    throw err;
  }

  const kyc = await getKycStatus(vendorId);
  if (!kyc.agreement.isCurrentVersionSigned) {
    const err = new Error(`Vendor must sign current agreement version (${kyc.agreement.requiredVersion}) before submitting for review (FR-ONB-04)`);
    err.status = 400;
    err.code = 'AGREEMENT_REQUIRED';
    throw err;
  }

  if (!kyc.digilocker.verified && !kyc.pan.verified) {
    const err = new Error('Vendor must complete DigiLocker or PAN identity verification before submitting for review (FR-ONB-03)');
    err.status = 400;
    err.code = 'KYC_IDENTITY_REQUIRED';
    throw err;
  }

  if (!kyc.bank.verified) {
    const err = new Error('Vendor must complete Bank Penny-Drop verification before submitting for review (FR-ONB-03)');
    err.status = 400;
    err.code = 'KYC_BANK_REQUIRED';
    throw err;
  }

  const prevStatus = vendor.kycStatus;
  if (!db.isPgActive()) {
    const row = inMemoryStore.vendors.find((v) => v.id === vendorId);
    row.kyc_status = 'SUBMITTED';
    row.rejection_reason = null;
    row.updated_at = new Date();
  } else {
    await db.query(
      `UPDATE vendors SET kyc_status = 'SUBMITTED', rejection_reason = NULL, updated_at = NOW() WHERE id = $1`,
      [vendorId]
    );
  }

  await recordStatusHistory(vendorId, prevStatus, 'SUBMITTED', 'Submitted by vendor for verification', actor.userId || vendor.userId, 'vendor');
  await enqueueOutboxEvent('vendor.onboarding.submitted', { vendorId, submittedAt: new Date().toISOString() });

  return getVendorById(vendorId);
}

async function verifyVendorOnboarding(vendorId, { status, reason, notes }, actor = {}) {
  const targetStatus = String(status || '').toUpperCase();
  if (!VALID_KYC_STATUSES.includes(targetStatus)) {
    const err = new Error(`Invalid onboarding status. Must be one of: ${VALID_KYC_STATUSES.join(', ')}`);
    err.status = 400;
    throw err;
  }

  if ((targetStatus === 'REJECTED' || targetStatus === 'SUSPENDED') && (!reason || !String(reason).trim())) {
    const err = new Error(`A mandatory reason is required when setting vendor status to ${targetStatus} (FR-ONB-06)`);
    err.status = 400;
    err.code = 'REASON_REQUIRED';
    throw err;
  }

  const vendor = await getVendorById(vendorId);
  if (!vendor) {
    const err = new Error('Vendor not found');
    err.status = 404;
    throw err;
  }

  if (targetStatus === 'APPROVED') {
    const kyc = await getKycStatus(vendorId);
    if (!kyc.agreement.isCurrentVersionSigned) {
      const err = new Error(`Cannot approve vendor: current agreement (${kyc.agreement.requiredVersion}) is not signed`);
      err.status = 400;
      err.code = 'AGREEMENT_UNSIGNED';
      throw err;
    }
    if ((!kyc.digilocker.verified && !kyc.pan.verified) || !kyc.bank.verified) {
      const err = new Error('Cannot approve vendor: identity KYC and bank penny-drop verification must be completed first');
      err.status = 400;
      err.code = 'KYC_INCOMPLETE';
      throw err;
    }
  }

  const prevStatus = vendor.kycStatus;
  const isNowVerified = targetStatus === 'APPROVED';

  if (!db.isPgActive()) {
    const row = inMemoryStore.vendors.find((v) => v.id === vendorId);
    row.kyc_status = targetStatus;
    row.verified = isNowVerified;
    row.rejection_reason = targetStatus === 'REJECTED' || targetStatus === 'SUSPENDED' ? reason : null;
    if (targetStatus === 'APPROVED') row.is_demo = false;
    row.updated_at = new Date();

    const kycRec = await ensureKycRecord(vendorId);
    kycRec.verification_notes = notes || reason || null;
    kycRec.verified_by = actor.userId || 'verifier';
    kycRec.verified_at = new Date();
  } else {
    await db.query(
      `UPDATE vendors
       SET kyc_status = $1,
           verified = $2,
           rejection_reason = $3,
           updated_at = NOW()
       WHERE id = $4`,
      [targetStatus, isNowVerified, targetStatus === 'REJECTED' || targetStatus === 'SUSPENDED' ? reason : null, vendorId]
    );
    await db.query(
      `UPDATE vendor_kyc_records
       SET verification_notes = $1, verified_by = $2, verified_at = NOW(), updated_at = NOW()
       WHERE vendor_id = $3`,
      [notes || reason || null, actor.userId || 'verifier', vendorId]
    );
  }

  await recordStatusHistory(
    vendorId,
    prevStatus,
    targetStatus,
    reason || notes || `Status updated to ${targetStatus}`,
    actor.userId || 'verifier',
    actor.role || 'verifier'
  );

  await recordAuditLog({
    actorId: actor.userId || 'verifier',
    actorRole: actor.role || 'verifier',
    action: `VENDOR_STATUS_${targetStatus}`,
    targetType: 'vendor',
    targetId: vendorId,
    reason: reason || notes || null,
    metadata: { fromStatus: prevStatus, toStatus: targetStatus },
  });

  await enqueueOutboxEvent(`vendor.status.${targetStatus.toLowerCase()}`, {
    vendorId,
    fromStatus: prevStatus,
    toStatus: targetStatus,
    reason: reason || null,
    timestamp: new Date().toISOString(),
  });

  return getVendorById(vendorId);
}

async function getVendorStatusHistory(vendorId) {
  if (!db.isPgActive()) {
    return inMemoryStore.vendorStatusHistory
      .filter((h) => h.vendor_id === vendorId)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map((h) => ({
        id: h.id,
        vendorId: h.vendor_id,
        fromStatus: h.from_status,
        toStatus: h.to_status,
        reason: h.reason,
        changedBy: h.changed_by,
        changedByRole: h.changed_by_role,
        createdAt: h.created_at,
      }));
  }

  const res = await db.query(
    `SELECT * FROM vendor_status_history WHERE vendor_id = $1 ORDER BY created_at ASC`,
    [vendorId]
  );
  return res.rows.map((h) => ({
    id: h.id,
    vendorId: h.vendor_id,
    fromStatus: h.from_status,
    toStatus: h.to_status,
    reason: h.reason,
    changedBy: h.changed_by,
    changedByRole: h.changed_by_role,
    createdAt: h.created_at,
  }));
}

// ============================================================================
// Off-Platform Leakage Enforcement Ladder (FR-ADM-04)
// 1st violation -> WARNING, 2nd -> SUSPENSION, 3rd -> TERMINATION
// ============================================================================
async function recordVendorViolation(vendorId, { violationType = 'OFF_PLATFORM_LEAKAGE', reason, bookingId }, actor = {}) {
  if (!reason || !String(reason).trim()) {
    const err = new Error('Violation reason is mandatory');
    err.status = 400;
    throw err;
  }

  const vendor = await getVendorById(vendorId);
  if (!vendor) {
    const err = new Error('Vendor not found');
    err.status = 404;
    throw err;
  }

  const nextCount = Number(vendor.violationCount || 0) + 1;
  let actionTaken = 'WARNING';
  if (nextCount === 2) actionTaken = 'SUSPENSION';
  if (nextCount >= 3) actionTaken = 'TERMINATION';

  const violationId = `vio_${crypto.randomBytes(6).toString('hex')}`;

  if (!db.isPgActive()) {
    const row = inMemoryStore.vendors.find((v) => v.id === vendorId);
    row.violation_count = nextCount;
    if (actionTaken === 'SUSPENSION' || actionTaken === 'TERMINATION') {
      row.verified = false;
      row.kyc_status = 'SUSPENDED';
      row.rejection_reason = `${actionTaken}: ${reason}`;
    }
    inMemoryStore.vendorViolations.push({
      id: violationId,
      vendor_id: vendorId,
      violation_type: violationType,
      action_taken: actionTaken,
      reason,
      booking_id: bookingId || null,
      recorded_by: actor.userId || 'admin',
      created_at: new Date(),
    });
  } else {
    await db.query(
      `INSERT INTO vendor_violations (id, vendor_id, violation_type, action_taken, reason, booking_id, recorded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [violationId, vendorId, violationType, actionTaken, reason, bookingId || null, actor.userId || 'admin']
    );
    if (actionTaken === 'SUSPENSION' || actionTaken === 'TERMINATION') {
      await db.query(
        `UPDATE vendors SET violation_count = $1, verified = FALSE, kyc_status = 'SUSPENDED', rejection_reason = $2, updated_at = NOW() WHERE id = $3`,
        [nextCount, `${actionTaken}: ${reason}`, vendorId]
      );
    } else {
      await db.query(`UPDATE vendors SET violation_count = $1, updated_at = NOW() WHERE id = $2`, [nextCount, vendorId]);
    }
  }

  await recordAuditLog({
    actorId: actor.userId || 'admin',
    actorRole: actor.role || 'superAdmin',
    action: `VENDOR_VIOLATION_${actionTaken}`,
    targetType: 'vendor',
    targetId: vendorId,
    reason,
    metadata: { violationCount: nextCount, violationType, bookingId },
  });

  return {
    violationId,
    vendorId,
    violationCount: nextCount,
    actionTaken,
    reason,
    vendorStatus: actionTaken === 'WARNING' ? vendor.kycStatus : 'SUSPENDED',
  };
}

// ============================================================================
// Customer Search & Discovery (FR-SRCH-01..06, FR-VEN-01, FR-VEN-08)
// ============================================================================
// City coordinate lookup table for when location name is passed or for computing vendor coordinates
const CITY_COORDS = {
  mumbai: { lat: 19.076, lng: 72.8777 },
  delhi: { lat: 28.6139, lng: 77.209 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  hyderabad: { lat: 17.385, lng: 78.4867 },
  ahmedabad: { lat: 23.0225, lng: 72.5714 },
  surat: { lat: 21.1702, lng: 72.8311 },
  pune: { lat: 18.5204, lng: 73.8567 },
  jaipur: { lat: 26.9124, lng: 75.7873 },
  lucknow: { lat: 26.8467, lng: 80.9462 },
  kolkata: { lat: 22.5726, lng: 88.3639 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  indore: { lat: 22.7196, lng: 75.8577 },
  vadodara: { lat: 22.3072, lng: 73.1812 },
  rajkot: { lat: 22.3039, lng: 70.8022 },
  udaipur: { lat: 24.5854, lng: 73.7125 },
  chandigarh: { lat: 30.7333, lng: 76.7794 },
  bhopal: { lat: 23.2599, lng: 77.4126 },
  nagpur: { lat: 21.1458, lng: 79.0882 },
  kochi: { lat: 9.9312, lng: 76.2673 },
  goa: { lat: 15.2993, lng: 74.124 },
};

async function advancedSearchVendors(filters = {}) {
  const {
    q,
    name,
    category,
    categoryId,
    location,
    lat,
    lng,
    radiusKm,
    date,
    startDate,
    endDate,
    slotName = 'ALL_DAY',
    requiredQty = 1,
    guestCount,
    minRating,
    minPricePaise,
    maxPricePaise,
    minPrice, // INR convenience
    maxPrice, // INR convenience
    hasDiscount,
    verified,
    includeDemo = false,
    sortBy = 'relevance',
    page = 1,
    limit = 10,
    publicView = false,
  } = filters;

  const searchQuery = String(q || name || '').trim().toLowerCase();
  const categoryFilter = String(categoryId || category || '').trim().toLowerCase();
  const locationFilter = String(location || '').trim().toLowerCase();
  const checkStart = startDate || date || null;
  const checkEnd = endDate || checkStart || null;
  const minPaise = minPricePaise !== undefined
    ? BigInt(minPricePaise)
    : minPrice !== undefined && minPrice !== ''
      ? BigInt(Math.round(Number(minPrice) * 100))
      : null;
  const maxPaise = maxPricePaise !== undefined
    ? BigInt(maxPricePaise)
    : maxPrice !== undefined && maxPrice !== ''
      ? BigInt(Math.round(Number(maxPrice) * 100))
      : null;

  const requiredAgreementVersion = String(await getConfigValue('CURRENT_VENDOR_AGREEMENT_VERSION', 'v1.0'));

  // Resolve category filter to any matching category ID/slug/name or child categories
  let matchingCategoryIds = new Set();
  if (categoryFilter) {
    const resolvedCat = await categoriesRepo.resolveCategoryBySlugOrId(categoryFilter);
    if (resolvedCat) {
      matchingCategoryIds.add(resolvedCat.id.toLowerCase());
      matchingCategoryIds.add(resolvedCat.slug.toLowerCase());
      matchingCategoryIds.add(resolvedCat.name.toLowerCase());
      // If parent category, also include all child categories
      for (const c of inMemoryStore.categories) {
        if (c.parent_id === resolvedCat.id) {
          matchingCategoryIds.add(c.id.toLowerCase());
          matchingCategoryIds.add(c.slug.toLowerCase());
          matchingCategoryIds.add(c.name.toLowerCase());
        }
      }
    } else {
      matchingCategoryIds.add(categoryFilter);
    }
  }

  // Load candidate vendors
  let allVendors = [];
  if (!db.isPgActive()) {
    allVendors = inMemoryStore.vendors.map((v) => mapVendorRow(v));
  } else {
    const res = await db.query(`SELECT * FROM vendors ORDER BY created_at DESC`);
    allVendors = res.rows.map((v) => mapVendorRow(v));
  }

  // Resolve customer coordinates if lat/lng provided or inferred from location city
  let customerLat = lat !== undefined && lat !== '' && lat !== null ? Number(lat) : null;
  let customerLng = lng !== undefined && lng !== '' && lng !== null ? Number(lng) : null;
  if ((customerLat === null || customerLng === null) && locationFilter && CITY_COORDS[locationFilter]) {
    customerLat = CITY_COORDS[locationFilter].lat;
    customerLng = CITY_COORDS[locationFilter].lng;
  }

  const enrichedResults = [];

  for (const vendor of allVendors) {
    // 1. Demo isolation rule: Demo vendors are excluded from live search unless includeDemo=true
    const wantDemo = includeDemo === true || includeDemo === 'true';
    if (vendor.isDemo && !wantDemo) continue;

    // 2. Verification & Agreement lock check
    if (verified !== undefined && verified !== null && verified !== '') {
      const wantVerified = verified === 'true' || verified === true;
      if (vendor.verified !== wantVerified) continue;
    } else if (!wantDemo) {
      // By default, live search only shows verified vendors
      if (!vendor.verified) continue;
    }

    // Enforce current agreement version if vendor has agreement tracking enabled
    if (vendor.verified && vendor.agreementVersion && vendor.agreementVersion !== requiredAgreementVersion) {
      continue;
    }

    // 3. Load vendor's packages and active discounts
    const allVendorPackages = await packagesRepo.getVendorPackages(vendor.id);
    const vendorDiscounts = await packagesRepo.getVendorDiscounts(vendor.id, { activeOnly: true });

    // 4. Category match check (vendor primary category, vendor_categories, or any package category)
    if (categoryFilter) {
      const vPrimary = String(vendor.category || '').toLowerCase();
      const vCats = (vendor.categories || []).flatMap((c) => [
        String(c.categoryId || '').toLowerCase(),
        String(c.slug || '').toLowerCase(),
        String(c.name || '').toLowerCase(),
      ]);
      const pkgCats = allVendorPackages.map((p) => String(p.categoryId || '').toLowerCase());

      const matched =
        matchingCategoryIds.has(vPrimary) ||
        vPrimary.includes(categoryFilter) ||
        vCats.some((c) => matchingCategoryIds.has(c) || c.includes(categoryFilter)) ||
        pkgCats.some((c) => matchingCategoryIds.has(c) || c.includes(categoryFilter));

      if (!matched) continue;
    }

    // 5. Partial name / text search check (FR-SRCH-01)
    if (searchQuery) {
      const haystacks = [
        vendor.businessName,
        vendor.description,
        vendor.category,
        vendor.location,
        ...(vendor.categories || []).map((c) => c.name),
        ...allVendorPackages.map((p) => `${p.name} ${p.description}`),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (!haystacks.includes(searchQuery)) continue;
    }

    // 6. Location & Service Radius Eligibility (FR-VEN-08, FR-SRCH-02)
    let distanceKm = null;
    if (customerLat !== null && customerLng !== null && vendor.latitude !== null && vendor.longitude !== null) {
      distanceKm = calculateDistanceKm(customerLat, customerLng, vendor.latitude, vendor.longitude);
    }

    if (locationFilter) {
      const locTextMatch =
        String(vendor.location || '').toLowerCase().includes(locationFilter) ||
        String(vendor.address || '').toLowerCase().includes(locationFilter) ||
        (vendor.serviceAreas || []).some((a) => String(a).toLowerCase().includes(locationFilter));

      const radiusMatch = distanceKm !== null && distanceKm <= Number(vendor.serviceRadiusKm || 25);

      if (!locTextMatch && !radiusMatch) continue;
    }

    if (lat !== undefined && lng !== undefined && lat !== '' && lng !== '' && distanceKm !== null) {
      const maxSearchRadius = radiusKm !== undefined && radiusKm !== '' ? Number(radiusKm) : Number(vendor.serviceRadiusKm || 50);
      // Vendor must be within customer search radius AND customer venue must be within vendor's serviceRadiusKm (FR-VEN-08)
      const explicitAreaMatch =
        locationFilter &&
        (vendor.serviceAreas || []).some((a) => String(a).toLowerCase().includes(locationFilter));

      if (!explicitAreaMatch && (distanceKm > maxSearchRadius || distanceKm > Number(vendor.serviceRadiusKm || 50))) {
        continue;
      }
    }

    // 7. Rating filter (FR-SRCH-02)
    if (minRating !== undefined && minRating !== '' && minRating !== null) {
      if ((vendor.rating || 0) < Number(minRating)) continue;
    }

    // 8. Evaluate packages for date/capacity, price range, discount, and guestCount
    const matchingPackages = [];
    let vendorAvailableOnDate = true;

    if (checkStart) {
      const vCap = await availabilityRepo.checkPackageCapacityForRange({
        vendorId: vendor.id,
        packageId: null,
        startDate: checkStart,
        endDate: checkEnd,
        slotName,
        requiredQty,
      });
      if (!vCap.available) {
        vendorAvailableOnDate = false;
      }
    }

    for (const pkg of allVendorPackages) {
      // Guest count filter
      if (guestCount !== undefined && guestCount !== '' && guestCount !== null) {
        const g = Number(guestCount);
        if (pkg.minGuests && g < pkg.minGuests) continue;
        if (pkg.maxGuests && g > pkg.maxGuests) continue;
      }

      // Compute applicable discount for this package
      const applicableDiscount = vendorDiscounts.find(
        (d) => !d.packageId || d.packageId === pkg.id
      );

      const basePaise = toPaiseBigInt(pkg.basePricePaise ?? pkg.pricePaise ?? 0);
      const pricing = calculateDiscountedPrice(basePaise, applicableDiscount);
      const effectivePaise = pricing.finalPricePaise;

      if (minPaise !== null && effectivePaise < minPaise) continue;
      if (maxPaise !== null && effectivePaise > maxPaise) continue;
      if ((hasDiscount === true || hasDiscount === 'true') && pricing.discountPaise <= 0n) continue;

      let capacityInfo = { available: vendorAvailableOnDate, availableUnits: pkg.totalCapacityUnits || 1 };
      if (checkStart) {
        const capCheck = await availabilityRepo.checkPackageCapacityForRange({
          vendorId: vendor.id,
          packageId: pkg.id,
          startDate: checkStart,
          endDate: checkEnd,
          slotName,
          requiredQty,
        });
        if (!capCheck.available) continue;
        const minRem = capCheck.dates.reduce(
          (acc, d) => Math.min(acc, Number(d.availableUnits ?? 1)),
          pkg.totalCapacityUnits || 1
        );
        capacityInfo = {
          available: true,
          availableUnits: minRem,
          dates: capCheck.dates,
        };
      }

      matchingPackages.push({
        ...pkg,
        originalPricePaise: Number(pricing.originalPricePaise),
        discountPaise: Number(pricing.discountPaise),
        effectivePricePaise: Number(pricing.finalPricePaise),
        effectivePriceInr: Number(pricing.finalPricePaise) / 100,
        appliedDiscount: pricing.appliedDiscount,
        availability: capacityInfo,
      });
    }

    // If package-specific filters or date availability were requested, vendor must have at least 1 matching package (or if vendor has 0 packages total, pass only when no price/discount filter was set and vendor date isn't blocked)
    const hasPackageFilters =
      minPaise !== null ||
      maxPaise !== null ||
      hasDiscount === true ||
      hasDiscount === 'true' ||
      (guestCount !== undefined && guestCount !== '' && guestCount !== null);

    if (allVendorPackages.length > 0 && matchingPackages.length === 0) {
      if (hasPackageFilters || checkStart) continue;
    } else if (allVendorPackages.length === 0) {
      if (hasPackageFilters) continue;
      if (checkStart && !vendorAvailableOnDate) continue;
    }

    const lowestPricePaise =
      matchingPackages.length > 0
        ? Math.min(...matchingPackages.map((p) => p.effectivePricePaise))
        : null;

    const hasActiveDiscount = matchingPackages.some((p) => p.discountPaise > 0) || vendorDiscounts.length > 0;

    const baseVendorData = publicView ? redactVendorForPublic(vendor) : vendor;
    enrichedResults.push({
      ...baseVendorData,
      distanceKm,
      startingPricePaise: lowestPricePaise,
      startingPriceInr: lowestPricePaise !== null ? lowestPricePaise / 100 : null,
      hasActiveDiscount,
      matchingPackages,
    });
  }

  // 9. Sorting (FR-SRCH-03)
  enrichedResults.sort((a, b) => {
    if (sortBy === 'price_asc') {
      return (a.startingPricePaise ?? Number.MAX_SAFE_INTEGER) - (b.startingPricePaise ?? Number.MAX_SAFE_INTEGER);
    }
    if (sortBy === 'price_desc') {
      return (b.startingPricePaise ?? 0) - (a.startingPricePaise ?? 0);
    }
    if (sortBy === 'rating_desc') {
      return (b.rating ?? 0) - (a.rating ?? 0);
    }
    if (sortBy === 'popularity') {
      return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
    }
    if (sortBy === 'distance_asc') {
      return (a.distanceKm ?? Number.MAX_SAFE_INTEGER) - (b.distanceKm ?? Number.MAX_SAFE_INTEGER);
    }
    // Default 'relevance' / featured-first with rating & review tie-breaker
    if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
    if ((b.rating ?? 0) !== (a.rating ?? 0)) return (b.rating ?? 0) - (a.rating ?? 0);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const totalItems = enrichedResults.length;
  const totalPages = Math.ceil(totalItems / limitNum) || 1;
  const offset = (pageNum - 1) * limitNum;
  const paginatedItems = enrichedResults.slice(offset, offset + limitNum);

  return {
    items: paginatedItems,
    page: pageNum,
    limit: limitNum,
    totalPages,
    totalItems,
  };
}

// Keep legacy searchVendors signature working via advancedSearchVendors
async function searchVendors(params = {}) {
  return advancedSearchVendors(params);
}

// ============================================================================
// Event-Planner Checklist Matching (FR-PLAN-02, FR-PLAN-03)
// ============================================================================
async function matchVendorsForPlannerItems({ items = [], date, location, lat, lng, guestCount }) {
  const results = [];
  for (const rawItem of items) {
    const label = typeof rawItem === 'string' ? rawItem : rawItem?.name || rawItem?.category || '';
    if (!label) continue;

    const matchedCat = await categoriesRepo.resolveCategoryBySlugOrId(label);
    const searchRes = await advancedSearchVendors({
      category: matchedCat ? matchedCat.slug : label,
      q: matchedCat ? undefined : label,
      location,
      lat,
      lng,
      date,
      guestCount,
      limit: 5,
      publicView: true,
    });

    results.push({
      checklistItem: label,
      matchedCategory: matchedCat || null,
      availableVendorsCount: searchRes.totalItems,
      recommendedVendors: searchRes.items,
    });
  }
  return results;
}

// ============================================================================
// Notify Me Requests (FR-SRCH-05, FR-NOT-02)
// ============================================================================
async function createNotifyRequest({ userId, vendorId, packageId = null, requestedDate, slotName = 'ALL_DAY', requiredQty = 1 }) {
  if (!userId || !vendorId || !requestedDate) {
    const err = new Error('userId, vendorId, and requestedDate are required');
    err.status = 400;
    throw err;
  }

  const dateNorm = String(requestedDate).split('T')[0];
  const id = `not_${crypto.randomBytes(6).toString('hex')}`;

  if (!db.isPgActive()) {
    const existing = inMemoryStore.notifyRequests.find(
      (r) =>
        r.user_id === userId &&
        r.vendor_id === vendorId &&
        r.package_id === packageId &&
        String(r.requested_date).split('T')[0] === dateNorm &&
        r.status === 'PENDING'
    );
    if (existing) return existing;

    const row = {
      id,
      user_id: userId,
      vendor_id: vendorId,
      package_id: packageId,
      requested_date: dateNorm,
      slot_name: slotName,
      required_qty: Number(requiredQty || 1),
      status: 'PENDING',
      notified_at: null,
      created_at: new Date(),
    };
    inMemoryStore.notifyRequests.push(row);
    return row;
  }

  const res = await db.query(
    `INSERT INTO notify_requests (id, user_id, vendor_id, package_id, requested_date, slot_name, required_qty, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
     RETURNING *`,
    [id, userId, vendorId, packageId, dateNorm, slotName, Number(requiredQty || 1)]
  );
  return res.rows[0];
}

async function listNotifyRequests({ userId, vendorId } = {}) {
  if (!db.isPgActive()) {
    return inMemoryStore.notifyRequests.filter((r) => {
      if (userId && r.user_id !== userId) return false;
      if (vendorId && r.vendor_id !== vendorId) return false;
      return true;
    });
  }
  const conditions = [];
  const params = [];
  let idx = 1;
  if (userId) {
    conditions.push(`user_id = $${idx++}`);
    params.push(userId);
  }
  if (vendorId) {
    conditions.push(`vendor_id = $${idx++}`);
    params.push(vendorId);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const res = await db.query(`SELECT * FROM notify_requests ${where} ORDER BY created_at DESC`, params);
  return res.rows;
}

// ============================================================================
// Vendor Wallet & Lead Alerts (FR-WAL-01..04)
// ============================================================================
async function ensureVendorWallet(vendorId) {
  if (!db.isPgActive()) {
    let w = inMemoryStore.vendorWallets.find((x) => x.vendor_id === vendorId);
    if (!w) {
      w = {
        vendor_id: vendorId,
        balance_paise: 0n,
        status: 'ACTIVE',
        updated_at: new Date(),
      };
      inMemoryStore.vendorWallets.push(w);
    }
    return w;
  }

  await db.query(
    `INSERT INTO vendor_wallets (vendor_id, balance_paise, status) VALUES ($1, 0, 'ACTIVE') ON CONFLICT (vendor_id) DO NOTHING`,
    [vendorId]
  );
  const res = await db.query(`SELECT * FROM vendor_wallets WHERE vendor_id = $1`, [vendorId]);
  return res.rows[0];
}

async function getVendorWallet(vendorId) {
  const wallet = await ensureVendorWallet(vendorId);
  const minBalancePaise = BigInt(await getConfigValue('MIN_WALLET_BALANCE_PAISE', 50000));
  const leadChargePaise = BigInt(await getConfigValue('LEAD_CHARGE_PAISE', 5000));
  const balancePaise = BigInt(wallet.balance_paise ?? 0);

  let transactions = [];
  if (!db.isPgActive()) {
    transactions = inMemoryStore.walletTransactions
      .filter((t) => t.vendor_id === vendorId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } else {
    const txRes = await db.query(
      `SELECT * FROM wallet_transactions WHERE vendor_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [vendorId]
    );
    transactions = txRes.rows;
  }

  const isLowBalance = balancePaise < minBalancePaise;
  const canAcceptPaidLeads = balancePaise >= leadChargePaise;

  return {
    vendorId,
    balancePaise: Number(balancePaise),
    balanceInr: Number(balancePaise) / 100,
    minWalletBalancePaise: Number(minBalancePaise),
    leadChargePaise: Number(leadChargePaise),
    status: isLowBalance ? 'LOW_BALANCE_WARNING' : 'ACTIVE',
    isLowBalance,
    canAcceptPaidLeads,
    alertMessage: isLowBalance
      ? `Wallet balance (₹${(Number(balancePaise) / 100).toFixed(2)}) is below minimum recommended threshold (₹${(Number(minBalancePaise) / 100).toFixed(2)}). Top up to avoid missing paid leads.`
      : null,
    transactions: transactions.map((t) => ({
      id: t.id,
      vendorId: t.vendor_id,
      txnType: t.txn_type,
      amountPaise: Number(t.amount_paise),
      amountInr: Number(t.amount_paise) / 100,
      balanceAfterPaise: Number(t.balance_after_paise),
      referenceId: t.reference_id,
      description: t.description,
      createdAt: t.created_at,
    })),
  };
}

async function topupVendorWallet(vendorId, { amountPaise, amountInr, paymentReference }) {
  const addPaise = amountPaise !== undefined
    ? toPaiseBigInt(amountPaise)
    : toPaiseBigInt(Math.round(Number(amountInr || 0) * 100));

  if (addPaise <= 0n) {
    const err = new Error('Top-up amount must be greater than 0 paise');
    err.status = 400;
    throw err;
  }

  const wallet = await ensureVendorWallet(vendorId);
  const newBalance = BigInt(wallet.balance_paise ?? 0) + addPaise;
  const minBalancePaise = BigInt(await getConfigValue('MIN_WALLET_BALANCE_PAISE', 50000));
  const newStatus = newBalance < minBalancePaise ? 'LOW_BALANCE' : 'ACTIVE';
  const txId = `wtx_${crypto.randomBytes(6).toString('hex')}`;

  if (!db.isPgActive()) {
    wallet.balance_paise = newBalance;
    wallet.status = newStatus;
    wallet.updated_at = new Date();
    inMemoryStore.walletTransactions.push({
      id: txId,
      vendor_id: vendorId,
      txn_type: 'CREDIT_TOPUP',
      amount_paise: addPaise,
      balance_after_paise: newBalance,
      reference_id: paymentReference || `topup_${Date.now()}`,
      description: 'Vendor wallet top-up',
      created_at: new Date(),
    });
  } else {
    await db.query(
      `UPDATE vendor_wallets SET balance_paise = $1, status = $2, updated_at = NOW() WHERE vendor_id = $3`,
      [newBalance.toString(), newStatus, vendorId]
    );
    await db.query(
      `INSERT INTO wallet_transactions (id, vendor_id, txn_type, amount_paise, balance_after_paise, reference_id, description)
       VALUES ($1, $2, 'CREDIT_TOPUP', $3, $4, $5, 'Vendor wallet top-up')`,
      [txId, vendorId, addPaise.toString(), newBalance.toString(), paymentReference || `topup_${Date.now()}`]
    );
  }

  return getVendorWallet(vendorId);
}

// ============================================================================
// Rating & Internal Summary Helpers
// ============================================================================
async function updateRating(id, rating, reviewCount) {
  if (!db.isPgActive()) {
    const row = inMemoryStore.vendors.find((v) => v.id === id);
    if (!row) return null;
    row.rating = parseFloat(rating);
    if (reviewCount !== undefined) row.review_count = Number(reviewCount);
    else row.review_count = Number(row.review_count || 0) + 1;
    row.updated_at = new Date();
    return { id: row.id, rating: row.rating, reviewCount: row.review_count };
  }

  const query = `
    UPDATE vendors
    SET rating = $1,
        review_count = COALESCE($3, review_count + 1),
        updated_at = NOW()
    WHERE id = $2
    RETURNING id, rating, review_count;
  `;
  const result = await db.query(query, [rating, id, reviewCount !== undefined ? Number(reviewCount) : null]);
  if (result.rows.length === 0) return null;
  return {
    id: result.rows[0].id,
    rating: parseFloat(result.rows[0].rating),
    reviewCount: Number(result.rows[0].review_count),
  };
}

async function getVendorSummary(id) {
  const vendor = await getVendorById(id);
  if (!vendor) return null;
  return {
    id: vendor.id,
    businessName: vendor.businessName,
    verified: vendor.verified,
    kycStatus: vendor.kycStatus,
    agreementVersion: vendor.agreementVersion,
    serviceRadiusKm: vendor.serviceRadiusKm,
  };
}

// Full vendor profile detail for customer or vendor owner
async function getVendorFullDetail(vendorId, { publicView = true } = {}) {
  const vendor = await getVendorById(vendorId, { publicView });
  if (!vendor) return null;

  const packages = await packagesRepo.getVendorPackages(vendorId);
  const discounts = await packagesRepo.getVendorDiscounts(vendorId, { activeOnly: publicView });
  const media = await mediaRepo.getVendorMedia(vendorId, { publicOnly: publicView });
  const blockedDates = await availabilityRepo.getVendorBlockedDates(vendorId);

  const enrichedPackages = packages.map((pkg) => {
    const disc = discounts.find((d) => !d.packageId || d.packageId === pkg.id);
    const pricing = calculateDiscountedPrice(pkg.basePricePaise, disc);
    return {
      ...pkg,
      originalPricePaise: Number(pricing.originalPricePaise),
      discountPaise: Number(pricing.discountPaise),
      effectivePricePaise: Number(pricing.finalPricePaise),
      effectivePriceInr: Number(pricing.finalPricePaise) / 100,
      appliedDiscount: pricing.appliedDiscount,
    };
  });

  return {
    ...vendor,
    packages: enrichedPackages,
    discounts,
    media,
    blockedDates,
  };
}

module.exports = {
  createVendor,
  getVendorById,
  getVendorByUserId,
  getVendorsByIds,
  getVendorFullDetail,
  searchVendors,
  advancedSearchVendors,
  updateVendor,
  updateRating,
  getVendorSummary,
  getKycStatus,
  startDigiLockerKyc,
  completeDigiLockerCallback,
  verifyPanKyc,
  verifyBankPennyDrop,
  signVendorAgreement,
  submitVendorForReview,
  verifyVendorOnboarding,
  getVendorStatusHistory,
  recordVendorViolation,
  matchVendorsForPlannerItems,
  createNotifyRequest,
  listNotifyRequests,
  getVendorWallet,
  topupVendorWallet,
};
