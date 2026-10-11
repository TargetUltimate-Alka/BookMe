const express = require('express');
const paymentController = require('../controllers/paymentController');
const { authMiddleware, requireRole } = require('../../../shared/middleware/authMiddleware');
const { validate } = require('../../../shared/middleware/validate');

const router = express.Router();

// POST /api/payouts - Trigger vendor payout
router.post(
  '/',
  authMiddleware,
  validate(['vendorId', 'bookingId', 'amount']),
  paymentController.createPayout
);

// GET /api/payouts/:vendorId - List payouts for vendor
router.get(
  '/:vendorId',
  authMiddleware,
  paymentController.getPayoutsByVendor
);

module.exports = router;
