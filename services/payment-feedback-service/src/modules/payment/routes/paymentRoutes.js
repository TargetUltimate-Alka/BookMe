const express = require('express');
const paymentController = require('../controllers/paymentController');
const { authMiddleware } = require('../../../shared/middleware/authMiddleware');
const { validate } = require('../../../shared/middleware/validate');

const router = express.Router();

// POST /api/payments - Initiate payment
router.post(
  '/',
  authMiddleware,
  validate(['bookingId', 'amount']),
  paymentController.initiatePayment
);

// POST /api/payments/:id/authenticate - 2FA / 3DS / OTP verification
router.post(
  '/:id/authenticate',
  authMiddleware,
  paymentController.authenticatePayment
);

// POST /api/payments/:id/verify - alias for authenticate
router.post(
  '/:id/verify',
  authMiddleware,
  paymentController.authenticatePayment
);

// POST /api/payments/:id/webhook - Gateway webhook
router.post(
  '/:id/webhook',
  paymentController.handleWebhook
);

// GET /api/payments/booking/:bookingId - Fetch payments for a booking
router.get(
  '/booking/:bookingId',
  authMiddleware,
  paymentController.getPaymentsByBooking
);

// GET /api/payments/:id - Fetch single payment
router.get(
  '/:id',
  authMiddleware,
  paymentController.getPaymentById
);

module.exports = router;
