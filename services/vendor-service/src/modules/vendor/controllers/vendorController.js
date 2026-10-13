const vendorRepo = require('../repository/vendorRepository');
const categoriesRepo = require('../repository/categoriesRepository');
const mediaRepo = require('../repository/mediaRepository');
const configAuditRepo = require('../repository/configAuditRepository');

function resolveActor(req) {
  return {
    userId: req.user?.userId || req.headers['x-user-id'] || req.body?.actorId || 'anonymous',
    role: req.user?.role || req.headers['x-user-role'] || 'user',
    ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
    userAgent: req.headers['user-agent'] || '',
  };
}

async function resolveTargetVendorId(req) {
  if (req.params.id && req.params.id !== 'me') return req.params.id;
  if (req.params.vendorId && req.params.vendorId !== 'me') return req.params.vendorId;
  if (req.body?.vendorId) return req.body.vendorId;
  if (req.query?.vendorId) return req.query.vendorId;
  const userId = req.user?.userId || req.headers['x-user-id'];
  if (userId) {
    const v = await vendorRepo.getVendorByUserId(userId);
    if (v) return v.id;
  }
  return null;
}

// ============================================================================
// Vendor Profile & Onboarding
// ============================================================================
async function createVendor(req, res) {
  try {
    const actor = resolveActor(req);
    const userId = req.body.userId || (actor.userId !== 'anonymous' ? actor.userId : null);
    const { businessName, category, categories } = req.body;
    const primaryCategory = category || (Array.isArray(categories) && categories[0]);

    if (!userId || !businessName || !primaryCategory) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        message: 'userId, businessName, and category are required fields.',
      });
    }

    const existingVendor = await vendorRepo.getVendorByUserId(userId);
    if (existingVendor) {
      return res.status(409).json({
        error: 'Conflict',
        code: 'CONFLICT',
        message: 'A vendor profile already exists for this userId.',
        vendor: existingVendor,
      });
    }

    const isOnboardingEndpoint = req.originalUrl.includes('/onboarding');
    const vendor = await vendorRepo.createVendor({
      ...req.body,
      userId,
      category: primaryCategory,
      onboardingMode: req.body.onboardingMode !== undefined ? Boolean(req.body.onboardingMode) : isOnboardingEndpoint,
    });

    return res.status(201).json(vendor);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      error: error.code || (status === 400 ? 'Validation failed' : 'Internal Server Error'),
      code: error.code || 'INTERNAL_ERROR',
      message: error.message,
    });
  }
}

async function getMyVendorProfile(req, res) {
  try {
    const userId = req.user?.userId || req.headers['x-user-id'] || req.query.userId;
    if (!userId) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication or X-User-Id header is required',
      });
    }

    const vendor = await vendorRepo.getVendorByUserId(userId);
    if (!vendor) {
      return res.status(404).json({
        error: 'Not Found',
        message: `No vendor profile found for user ${userId}`,
      });
    }

    const kyc = await vendorRepo.getKycStatus(vendor.id);
    const wallet = await vendorRepo.getVendorWallet(vendor.id);
    return res.status(200).json({
      ...vendor,
      kyc,
      wallet,
    });
  } catch (error) {
    return res.status(error.status || 500).json({ error: 'Internal Server Error', message: error.message });
  }
}

async function getVendorById(req, res) {
  try {
    const { id } = req.params;
    if (id === 'me') return getMyVendorProfile(req, res);

    const includeFullDetail = req.query.detail === 'true' || req.query.full === 'true';
    const isOwnerOrAdmin =
      req.user &&
      (['superAdmin', 'verifier', 'contentModerator', 'financeAdmin', 'supportAgent', 'admin'].includes(req.user.role) ||
        req.user.vendorId === id);

    const vendor = includeFullDetail
      ? await vendorRepo.getVendorFullDetail(id, { publicView: !isOwnerOrAdmin })
      : await vendorRepo.getVendorById(id, { publicView: !isOwnerOrAdmin });

    if (!vendor) {
      return res.status(404).json({ error: 'Not Found', message: `Vendor with id ${id} not found.` });
    }

    return res.status(200).json(vendor);
  } catch (error) {
    return res.status(error.status || 500).json({ error: 'Internal Server Error', message: error.message });
  }
}

async function searchVendors(req, res) {
  try {
    // Support batch ID lookup used by event-booking-service: GET /vendors?ids=id1,id2
    if (req.query.ids) {
      const ids = String(req.query.ids)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const items = await vendorRepo.getVendorsByIds(ids, { publicView: true });
      return res.status(200).json({ data: items, items });
    }

    const isOwnerOrAdmin =
      req.user &&
      ['superAdmin', 'verifier', 'contentModerator', 'financeAdmin', 'supportAgent', 'admin'].includes(req.user.role);

    const result = await vendorRepo.advancedSearchVendors({
      ...req.query,
      publicView: !isOwnerOrAdmin,
    });

    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({ error: 'Internal Server Error', message: error.message });
  }
}

async function updateVendor(req, res) {
  try {
    const id = await resolveTargetVendorId(req);
    if (!id) {
      return res.status(404).json({ error: 'Not Found', message: 'Vendor not found.' });
    }

    const existing = await vendorRepo.getVendorById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Not Found', message: `Vendor with id ${id} not found.` });
    }

    const updated = await vendorRepo.updateVendor(id, req.body);
    return res.status(200).json(updated);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      error: error.code || 'Validation failed',
      code: error.code || 'INTERNAL_ERROR',
      message: error.message,
    });
  }
}

// ============================================================================
// KYC, E-Sign Agreement, Submit & Verifier Actions (FR-ONB-03, FR-ONB-04, FR-ONB-06)
// ============================================================================
async function getKycStatus(req, res) {
  try {
    const vendorId = await resolveTargetVendorId(req);
    if (!vendorId) {
      return res.status(404).json({ error: 'Not Found', message: 'Vendor not found' });
    }
    const status = await vendorRepo.getKycStatus(vendorId);
    if (!status) {
      return res.status(404).json({ error: 'Not Found', message: 'Vendor not found' });
    }
    return res.status(200).json(status);
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.code || 'ERROR', message: error.message });
  }
}

async function startDigiLockerKyc(req, res) {
  try {
    const vendorId = await resolveTargetVendorId(req);
    if (!vendorId) return res.status(404).json({ error: 'Not Found', message: 'Vendor not found' });

    const session = await vendorRepo.startDigiLockerKyc(vendorId, {
      redirectUri: req.body?.redirectUri,
    });
    return res.status(200).json(session);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: error.code || 'UPSTREAM_GATEWAY_ERROR',
      message: error.message,
    });
  }
}

async function completeDigiLockerCallback(req, res) {
  try {
    const vendorId = await resolveTargetVendorId(req);
    if (!vendorId) return res.status(404).json({ error: 'Not Found', message: 'Vendor not found' });

    const status = await vendorRepo.completeDigiLockerCallback(vendorId, {
      ...req.query,
      ...req.body,
    });
    return res.status(200).json(status);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: error.code || 'VALIDATION_ERROR',
      code: error.code || 'VALIDATION_ERROR',
      message: error.message,
    });
  }
}

async function verifyPanKyc(req, res) {
  try {
    const vendorId = await resolveTargetVendorId(req);
    if (!vendorId) return res.status(404).json({ error: 'Not Found', message: 'Vendor not found' });

    const status = await vendorRepo.verifyPanKyc(vendorId, req.body);
    return res.status(200).json(status);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: error.code || 'VALIDATION_ERROR',
      code: error.code || 'VALIDATION_ERROR',
      message: error.message,
    });
  }
}

async function verifyBankPennyDrop(req, res) {
  try {
    const vendorId = await resolveTargetVendorId(req);
    if (!vendorId) return res.status(404).json({ error: 'Not Found', message: 'Vendor not found' });

    const status = await vendorRepo.verifyBankPennyDrop(vendorId, req.body);
    return res.status(200).json(status);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: error.code || 'VALIDATION_ERROR',
      code: error.code || 'VALIDATION_ERROR',
      message: error.message,
    });
  }
}

async function signVendorAgreement(req, res) {
  try {
    const vendorId = await resolveTargetVendorId(req);
    if (!vendorId) return res.status(404).json({ error: 'Not Found', message: 'Vendor not found' });

    const actor = resolveActor(req);
    const result = await vendorRepo.signVendorAgreement(vendorId, {
      agreementVersion: req.body?.agreementVersion,
      accepted: req.body?.accepted !== false,
      ipAddress: req.body?.ipAddress || actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: error.code || 'VALIDATION_ERROR',
      message: error.message,
    });
  }
}

async function submitVendorForReview(req, res) {
  try {
    const vendorId = await resolveTargetVendorId(req);
    if (!vendorId) return res.status(404).json({ error: 'Not Found', message: 'Vendor not found' });

    const actor = resolveActor(req);
    const updated = await vendorRepo.submitVendorForReview(vendorId, actor);
    return res.status(200).json(updated);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: error.code || 'VALIDATION_ERROR',
      code: error.code || 'VALIDATION_ERROR',
      message: error.message,
    });
  }
}

async function verifyVendorOnboarding(req, res) {
  try {
    const vendorId = req.params.id || req.params.vendorId;
    const actor = resolveActor(req);
    const updated = await vendorRepo.verifyVendorOnboarding(vendorId, req.body, actor);
    return res.status(200).json(updated);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: error.code || 'VALIDATION_ERROR',
      code: error.code || 'VALIDATION_ERROR',
      message: error.message,
    });
  }
}

async function getVendorStatusHistory(req, res) {
  try {
    const vendorId = await resolveTargetVendorId(req);
    if (!vendorId) return res.status(404).json({ error: 'Not Found', message: 'Vendor not found' });
    const history = await vendorRepo.getVendorStatusHistory(vendorId);
    return res.status(200).json({ vendorId, items: history });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

async function recordVendorViolation(req, res) {
  try {
    const vendorId = req.params.id || req.params.vendorId;
    const actor = resolveActor(req);
    const result = await vendorRepo.recordVendorViolation(vendorId, req.body, actor);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: error.code || 'VALIDATION_ERROR',
      message: error.message,
    });
  }
}

// ============================================================================
// Categories Hierarchy (60 SRS Service Types across 8 Domains)
// ============================================================================
async function getCategories(req, res) {
  try {
    if (req.query.flat === 'true') {
      const items = await categoriesRepo.getAllCategories({ activeOnly: req.query.activeOnly !== 'false' });
      return res.status(200).json({ items, total: items.length });
    }
    const hierarchy = await categoriesRepo.getCategoriesHierarchy();
    return res.status(200).json(hierarchy);
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

// ============================================================================
// Media Upload, Validation, Duplicate Hash Check & Moderation (FR-VEN-02)
// ============================================================================
async function presignMediaUpload(req, res) {
  try {
    const vendorId = await resolveTargetVendorId(req);
    if (!vendorId) {
      return res.status(400).json({ error: 'Validation failed', message: 'vendorId is required' });
    }
    const result = await mediaRepo.createPresignedMediaUpload(vendorId, req.body);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 400).json({
      error: error.code || 'MEDIA_VALIDATION_ERROR',
      code: error.code || 'MEDIA_VALIDATION_ERROR',
      message: error.message,
    });
  }
}

async function registerMedia(req, res) {
  try {
    const vendorId = await resolveTargetVendorId(req);
    if (!vendorId) {
      return res.status(400).json({ error: 'Validation failed', message: 'vendorId is required' });
    }
    const created = await mediaRepo.registerVendorMedia(vendorId, req.body);
    return res.status(201).json(created);
  } catch (error) {
    return res.status(error.status || 400).json({
      error: error.code || 'MEDIA_VALIDATION_ERROR',
      code: error.code || 'MEDIA_VALIDATION_ERROR',
      message: error.message,
    });
  }
}

async function getVendorMedia(req, res) {
  try {
    const vendorId = await resolveTargetVendorId(req);
    if (!vendorId) {
      return res.status(400).json({ error: 'Validation failed', message: 'vendorId is required' });
    }
    const items = await mediaRepo.getVendorMedia(vendorId, {
      packageId: req.query.packageId,
      publicOnly: req.query.publicOnly === 'true',
    });
    const eligibility = await mediaRepo.checkPackagePublishMediaEligibility(vendorId, req.query.packageId);
    return res.status(200).json({
      vendorId,
      items,
      publishEligibility: eligibility,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

async function deleteMedia(req, res) {
  try {
    const vendorId = await resolveTargetVendorId(req);
    const { mediaId } = req.params;
    const deleted = await mediaRepo.deleteVendorMedia(mediaId, vendorId);
    if (!deleted) return res.status(404).json({ error: 'Not Found', message: 'Media item not found' });
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

async function listModerationQueue(req, res) {
  try {
    const status = req.query.status || 'PENDING';
    const items = await mediaRepo.listModerationQueue(status);
    return res.status(200).json({ status, items, total: items.length });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

async function moderateMedia(req, res) {
  try {
    const { mediaId } = req.params;
    const actor = resolveActor(req);
    const updated = await mediaRepo.moderateMediaItem(mediaId, {
      status: req.body.status,
      rejectionReason: req.body.rejectionReason || req.body.reason,
      actorId: actor.userId,
      actorRole: actor.role,
    });
    return res.status(200).json(updated);
  } catch (error) {
    return res.status(error.status || 400).json({
      error: error.code || 'VALIDATION_ERROR',
      message: error.message,
    });
  }
}

// ============================================================================
// Wallet & Lead Alerts (FR-WAL-01..04)
// ============================================================================
async function getVendorWallet(req, res) {
  try {
    const vendorId = await resolveTargetVendorId(req);
    if (!vendorId) return res.status(404).json({ error: 'Not Found', message: 'Vendor not found' });
    const wallet = await vendorRepo.getVendorWallet(vendorId);
    return res.status(200).json(wallet);
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

async function topupVendorWallet(req, res) {
  try {
    const vendorId = await resolveTargetVendorId(req);
    if (!vendorId) return res.status(404).json({ error: 'Not Found', message: 'Vendor not found' });
    const wallet = await vendorRepo.topupVendorWallet(vendorId, req.body);
    return res.status(200).json(wallet);
  } catch (error) {
    return res.status(error.status || 400).json({
      error: 'Validation failed',
      message: error.message,
    });
  }
}

// ============================================================================
// Notify Me & Event-Planner Checklist Matching (FR-SRCH-05, FR-PLAN-02..03)
// ============================================================================
async function createNotifyRequest(req, res) {
  try {
    const actor = resolveActor(req);
    const userId = req.body.userId || (actor.userId !== 'anonymous' ? actor.userId : null);
    const created = await vendorRepo.createNotifyRequest({
      ...req.body,
      userId,
    });
    return res.status(201).json(created);
  } catch (error) {
    return res.status(error.status || 400).json({
      error: 'Validation failed',
      message: error.message,
    });
  }
}

async function listNotifyRequests(req, res) {
  try {
    const items = await vendorRepo.listNotifyRequests({
      userId: req.query.userId,
      vendorId: req.query.vendorId,
    });
    return res.status(200).json({ items, total: items.length });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

async function matchPlannerItems(req, res) {
  try {
    const items = req.body.items || (req.query.items ? String(req.query.items).split(',') : []);
    const matches = await vendorRepo.matchVendorsForPlannerItems({
      items,
      date: req.body.date || req.query.date,
      location: req.body.location || req.query.location,
      lat: req.body.lat || req.query.lat,
      lng: req.body.lng || req.query.lng,
      guestCount: req.body.guestCount || req.query.guestCount,
    });
    return res.status(200).json({ matches });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

// ============================================================================
// Admin Dynamic CONFIG & Audit Logs (SRS §2.3, FR-ADM-01..06, NFR-SEC-06)
// ============================================================================
async function getAllConfigs(req, res) {
  try {
    const items = await configAuditRepo.getAllConfigs();
    return res.status(200).json({ items, total: items.length });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

async function updateConfig(req, res) {
  try {
    const { key } = req.params;
    const { value, reason } = req.body;
    if (value === undefined) {
      return res.status(400).json({ error: 'Validation failed', message: 'value is required' });
    }
    const actor = resolveActor(req);
    const updated = await configAuditRepo.updateConfig(key, {
      value,
      reason,
      actorId: actor.userId,
      actorRole: actor.role,
    });
    return res.status(200).json(updated);
  } catch (error) {
    return res.status(error.status || 400).json({ error: 'Validation failed', message: error.message });
  }
}

async function getConfigHistory(req, res) {
  try {
    const items = await configAuditRepo.getConfigHistory(req.query.key);
    return res.status(200).json({ items });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

async function getAuditLogs(req, res) {
  try {
    const items = await configAuditRepo.getAuditLogs({
      targetId: req.query.targetId,
      action: req.query.action,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 100,
    });
    return res.status(200).json({ items, total: items.length });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

// ============================================================================
// Internal Endpoints
// ============================================================================
async function updateRating(req, res) {
  try {
    const { id } = req.params;
    const { rating, reviewCount } = req.body;

    if (rating === undefined || typeof rating !== 'number') {
      return res.status(400).json({ error: 'Bad Request', message: 'Valid rating number is required.' });
    }

    const updated = await vendorRepo.updateRating(id, rating, reviewCount);
    if (!updated) {
      return res.status(404).json({ error: 'Not Found', message: `Vendor with id ${id} not found.` });
    }

    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

async function getVendorSummary(req, res) {
  try {
    const { id } = req.params;
    const summary = await vendorRepo.getVendorSummary(id);

    if (!summary) {
      return res.status(404).json({ error: 'Not Found', message: `Vendor with id ${id} not found.` });
    }

    return res.status(200).json(summary);
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

module.exports = {
  createVendor,
  getMyVendorProfile,
  getVendorById,
  searchVendors,
  updateVendor,
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
  getCategories,
  presignMediaUpload,
  registerMedia,
  getVendorMedia,
  deleteMedia,
  listModerationQueue,
  moderateMedia,
  getVendorWallet,
  topupVendorWallet,
  createNotifyRequest,
  listNotifyRequests,
  matchPlannerItems,
  getAllConfigs,
  updateConfig,
  getConfigHistory,
  getAuditLogs,
  updateRating,
  getVendorSummary,
};
