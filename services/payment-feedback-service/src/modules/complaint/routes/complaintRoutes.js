const express = require('express');
const complaintController = require('../controllers/complaintController');
const { authMiddleware, requireRole } = require('../../../shared/middleware/authMiddleware');
const { validate } = require('../../../shared/middleware/validate');

const router = express.Router();

// POST /api/complaints
router.post(
  '/',
  authMiddleware,
  validate(['bookingId', 'subject', 'description']),
  complaintController.createComplaint
);

// GET /api/complaints?status=open
router.get(
  '/',
  authMiddleware,
  complaintController.getComplaints
);

// GET /api/complaints/:id
router.get(
  '/:id',
  authMiddleware,
  complaintController.getComplaintById
);

// PATCH /api/complaints/:id/status
router.patch(
  '/:id/status',
  authMiddleware,
  requireRole(['admin', 'customer']),
  complaintController.updateComplaintStatus
);

module.exports = router;
