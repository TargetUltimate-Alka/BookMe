const express = require('express');
const bookingController = require('./controllers/bookingController');
const adminBookingController = require('./controllers/adminBookingController');
const requireRole = require('../../shared/middleware/requireRole');
const internalAuth = require('../../shared/middleware/internalAuth');
const idempotencyMiddleware = require('../../shared/middleware/idempotency');
const { validate } = require('../../shared/middleware/validate');
const {
  createBookingSchema,
  rejectBookingSchema,
  cancelBookingSchema,
  counterOfferSchema,
  deliveryChoiceSchema,
  checkInSchema,
  disputeSchema,
} = require('./validators/bookingValidators');

const bookingRouter = express.Router();
const adminRouter = express.Router();
const internalRouter = express.Router();

// ==========================================
// 1. Booking Routes (/bookings)
// ==========================================

// Create booking request (Customer) - FR-BKG-01, FR-BKG-06
bookingRouter.post(
  '/',
  idempotencyMiddleware(false),
  requireRole('customer'),
  validate(createBookingSchema, 'body'),
  bookingController.createBooking
);

// Calculate Rush Quote preview (FR-BKG-06 - GET per OpenAPI booking.yaml, POST for legacy)
bookingRouter.get(
  '/quote/rush',
  bookingController.calculateRushQuote
);
bookingRouter.post(
  '/rush-quote',
  bookingController.calculateRushQuote
);

// List user bookings (Customer, Vendor, Admin) - FR-BKG-01
bookingRouter.get(
  '/',
  requireRole(['customer', 'vendor', 'superadmin', 'admin', 'supportagent']),
  bookingController.listBookings
);

// List vendor requests (Legacy alias)
bookingRouter.get(
  '/vendor',
  requireRole('vendor'),
  bookingController.listVendorBookings
);

// Preview cancellation charges (Customer or Vendor) - FR-CAN-01
bookingRouter.get(
  '/:id/cancellation-preview',
  requireRole(['customer', 'vendor', 'superadmin', 'admin', 'supportagent']),
  bookingController.previewCancellationCharges
);
bookingRouter.get(
  '/:id/cancellation-quote',
  requireRole(['customer', 'vendor', 'superadmin', 'admin', 'supportagent']),
  bookingController.previewCancellationCharges
);

// Booking audit timeline (FR-BKG-03)
bookingRouter.get(
  '/:id/timeline',
  requireRole(['customer', 'vendor', 'superadmin', 'admin', 'supportagent']),
  bookingController.getBookingTimeline
);

// Accept booking (Vendor) - FR-BKG-02
bookingRouter.patch(
  '/:id/accept',
  requireRole(['vendor', 'admin', 'superadmin']),
  bookingController.acceptBooking
);

// Reject booking (Vendor) - FR-BKG-02, FR-BKG-09
bookingRouter.patch(
  '/:id/reject',
  requireRole(['vendor', 'admin', 'superadmin']),
  validate(rejectBookingSchema, 'body'),
  bookingController.rejectBooking
);

// Submit structured counter-offer (Customer or Vendor) - FR-BKG-03
bookingRouter.post(
  '/:id/counter',
  requireRole(['customer', 'vendor']),
  validate(counterOfferSchema, 'body'),
  bookingController.submitCounterOffer
);

// Accept counter-offer (Opposing party) - FR-BKG-03
bookingRouter.patch(
  '/:id/counter/:counterId/accept',
  requireRole(['customer', 'vendor']),
  bookingController.acceptCounterOffer
);

// Delivery or pickup choice (Customer) - FR-BKG-05 (PATCH /delivery per OpenAPI, /delivery-choice alias)
bookingRouter.patch(
  '/:id/delivery',
  requireRole(['customer', 'admin', 'superadmin']),
  validate(deliveryChoiceSchema, 'body'),
  bookingController.selectDeliveryChoice
);
bookingRouter.patch(
  '/:id/delivery-choice',
  requireRole(['customer', 'admin', 'superadmin']),
  validate(deliveryChoiceSchema, 'body'),
  bookingController.selectDeliveryChoice
);

// Vendor GPS Check-in (Vendor) - FR-BKG-07
bookingRouter.post(
  '/:id/check-in',
  requireRole(['vendor', 'admin', 'superadmin']),
  validate(checkInSchema, 'body'),
  bookingController.vendorCheckIn
);

// Confirm completion (Customer or Admin) - FR-BKG-08 (POST /confirm-completion per OpenAPI, /complete alias)
bookingRouter.post(
  '/:id/confirm-completion',
  requireRole(['customer', 'vendor', 'admin', 'superadmin']),
  bookingController.confirmBookingCompletion
);
bookingRouter.post(
  '/:id/complete',
  requireRole(['customer', 'vendor', 'admin', 'superadmin']),
  bookingController.confirmBookingCompletion
);
bookingRouter.patch(
  '/:id/complete',
  requireRole(['customer', 'vendor', 'admin', 'superadmin']),
  bookingController.confirmBookingCompletion
);

// Cancel booking (Customer, Vendor, Admin) - FR-CAN-01..03
bookingRouter.post(
  '/:id/cancel',
  requireRole(['customer', 'vendor', 'admin', 'superadmin']),
  validate(cancelBookingSchema, 'body'),
  bookingController.cancelBooking
);

bookingRouter.patch(
  '/:id/cancel',
  requireRole(['customer', 'vendor', 'admin', 'superadmin']),
  validate(cancelBookingSchema, 'body'),
  bookingController.cancelBooking
);

// Raise booking dispute (Customer, Vendor) - FR-PAY-06
bookingRouter.post(
  '/:id/dispute',
  requireRole(['customer', 'vendor', 'admin', 'superadmin']),
  validate(disputeSchema, 'body'),
  bookingController.raiseBookingDispute
);

// Get single booking
bookingRouter.get(
  '/:id',
  requireRole(['customer', 'vendor', 'admin', 'superadmin', 'supportagent']),
  bookingController.getBookingById
);

// ==========================================
// 2. Admin Routes (/admin) - Preserved for existing tests
// ==========================================

adminRouter.get(
  '/bookings',
  requireRole(['admin', 'superadmin']),
  adminBookingController.listAllBookings
);

adminRouter.get(
  '/bookings/:id',
  requireRole(['admin', 'superadmin']),
  adminBookingController.getAdminBookingDetails
);

adminRouter.get(
  '/stats',
  requireRole(['admin', 'superadmin']),
  adminBookingController.getStats
);

// ==========================================
// 3. Internal Routes (/internal) - Microservice-to-microservice
// ==========================================

internalRouter.get(
  '/bookings/:id',
  internalAuth,
  bookingController.getInternalBooking
);

internalRouter.patch(
  '/bookings/:id/confirm-deposit',
  internalAuth,
  bookingController.internalConfirmDeposit
);

internalRouter.patch(
  '/bookings/:id/confirm',
  internalAuth,
  bookingController.internalConfirmDeposit
);

module.exports = {
  bookingRouter,
  adminRouter,
  internalRouter,
};
