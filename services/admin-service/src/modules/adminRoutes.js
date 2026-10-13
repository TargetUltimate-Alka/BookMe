const express = require('express');
const router = express.Router();
const adminController = require('./adminController');
const { requireRole } = require('../shared/middleware/authMiddleware');

// --- Users & Roles (FR-ADM-01) ---
router.get('/users', requireRole('superAdmin'), adminController.listUsers);
router.patch('/users/:id/roles', requireRole('superAdmin'), adminController.updateUserRoles);

// --- Immutable Audit Trail (FR-ADM-02) ---
router.get(
  '/audit-logs',
  requireRole('superAdmin', 'supportAgent', 'financeAdmin', 'verifier'),
  adminController.queryAuditLogs
);
router.post(
  '/audit-logs',
  requireRole('superAdmin', 'supportAgent', 'financeAdmin', 'verifier'),
  adminController.createAuditLog
);

// --- Dynamic Config Editor (FR-ADM-03) ---
router.get(
  '/configs',
  requireRole('superAdmin', 'financeAdmin'),
  adminController.listConfigs
);
router.patch('/configs/:key', requireRole('superAdmin'), adminController.updateConfig);
router.get('/configs/:key/history', requireRole('superAdmin'), adminController.getConfigHistory);

// --- Vendor Enforcement Ladder (FR-ADM-04) ---
router.post(
  '/vendors/:id/enforcement',
  requireRole('superAdmin', 'supportAgent'),
  adminController.applyVendorEnforcement
);
router.get(
  '/vendors/:id/enforcements',
  requireRole('superAdmin', 'supportAgent', 'verifier'),
  adminController.getVendorEnforcements
);

// --- Unified Moderation Queue (FR-VEN-02, FR-REV-04) ---
router.get(
  '/moderation/queue',
  requireRole('contentModerator', 'superAdmin', 'verifier'),
  adminController.getModerationQueue
);
router.post(
  '/moderation/:id/action',
  requireRole('contentModerator', 'superAdmin'),
  adminController.moderateItem
);

module.exports = router;
