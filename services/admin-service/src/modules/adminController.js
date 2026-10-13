const store = require('../shared/inMemoryStore');

// --- Users & Roles (FR-ADM-01) ---
function listUsers(req, res) {
  const { role, limit, cursor } = req.query;
  const result = store.getAllUsers({ role, limit: parseInt(limit, 10) || 50, cursor });
  res.status(200).json(result);
}

function updateUserRoles(req, res) {
  const { id } = req.params;
  const { roles } = req.body;

  if (!Array.isArray(roles) || roles.length === 0) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Roles array is required and must not be empty',
    });
  }

  const updatedUser = store.updateUserRoles(id, roles, req.user ? req.user.id : 'system');
  if (!updatedUser) {
    return res.status(404).json({
      code: 'USER_NOT_FOUND',
      message: `User with id ${id} not found`,
    });
  }

  res.status(200).json(updatedUser);
}

// --- Audit Trail (FR-ADM-02) ---
function queryAuditLogs(req, res) {
  const { entity, actorId, limit, cursor } = req.query;
  const result = store.queryAuditLogs({
    entity,
    actorId,
    limit: parseInt(limit, 10) || 50,
    cursor,
  });
  res.status(200).json(result);
}

function createAuditLog(req, res) {
  const { action, entity, entityId, beforeState, afterState } = req.body;
  if (!action || !entity) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Action and Entity are required fields',
    });
  }

  const entry = store.addAuditLog({
    actorId: req.user ? req.user.id : 'system',
    action,
    entity,
    entityId,
    beforeState,
    afterState,
  });

  res.status(201).json(entry);
}

// --- Config Editor (FR-ADM-03) ---
function listConfigs(req, res) {
  const configs = store.getAllConfigs();
  res.status(200).json(configs);
}

function updateConfig(req, res) {
  const { key } = req.params;
  const { value, changeReason } = req.body;

  if (value === undefined || value === null) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Value is required',
    });
  }

  if (!changeReason) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'changeReason is required for audit traceability',
    });
  }

  const actorId = req.user ? req.user.id : 'system';
  const { config } = store.updateConfig(key, value, changeReason, actorId);
  res.status(200).json(config);
}

function getConfigHistory(req, res) {
  const { key } = req.params;
  const history = store.getConfigHistory(key);
  res.status(200).json(history);
}

// --- Vendor Enforcement Ladder (FR-ADM-04) ---
function applyVendorEnforcement(req, res) {
  const { id } = req.params;
  const { action, reason, caseNotes } = req.body;

  if (!action || !reason) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'action and reason are mandatory fields',
    });
  }

  try {
    const actorId = req.user ? req.user.id : 'system';
    const record = store.applyVendorEnforcement({
      vendorId: id,
      action,
      reason,
      caseNotes,
      appliedBy: actorId,
    });
    res.status(200).json(record);
  } catch (err) {
    res.status(400).json({
      code: 'INVALID_ENFORCEMENT_ACTION',
      message: err.message,
    });
  }
}

function getVendorEnforcements(req, res) {
  const { id } = req.params;
  const list = store.getVendorEnforcements(id);
  res.status(200).json(list);
}

// --- Moderation Queue (FR-VEN-02, FR-REV-04) ---
function getModerationQueue(req, res) {
  const { type, limit, cursor } = req.query;
  const result = store.getModerationQueue({
    type,
    limit: parseInt(limit, 10) || 50,
    cursor,
  });
  res.status(200).json(result);
}

function moderateItem(req, res) {
  const { id } = req.params;
  const { decision, reason } = req.body;

  if (!['APPROVED', 'REJECTED'].includes(decision) || !reason) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'decision must be APPROVED or REJECTED, and reason is required',
    });
  }

  const actorId = req.user ? req.user.id : 'system';
  const updated = store.moderateItem({ id, decision, reason, moderatorId: actorId });

  if (!updated) {
    return res.status(404).json({
      code: 'ITEM_NOT_FOUND',
      message: `Moderation item with id ${id} not found`,
    });
  }

  res.status(200).json(updated);
}

module.exports = {
  listUsers,
  updateUserRoles,
  queryAuditLogs,
  createAuditLog,
  listConfigs,
  updateConfig,
  getConfigHistory,
  applyVendorEnforcement,
  getVendorEnforcements,
  getModerationQueue,
  moderateItem,
};
