const express = require('express');
const bookingController = require('./controllers/bookingController');
const adminBookingController = require('./controllers/adminBookingController');
const requireRole = require('../../shared/middleware/requireRole');
const internalAuth = require('../../shared/middleware/internalAuth');
const { validate } = require('../../shared/middleware/validate');
const {
  createBookingSchema,
  rejectBookingSchema,
  cancelBookingSchema,
} = require('./validators/bookingValidators');

const bookingRouter = express.Router();
const adminRouter = express.Router();
const internalRouter = express.Router();

// ==========================================
// 1. Booking Routes (/bookings)
// ==========================================

// Create booking (Customer)
bookingRouter.post(
  '/',
  requireRole('customer'),
  validate(createBookingSchema, 'body'),
  bookingController.createBooking
);

// List customer bookings
bookingRouter.get(
  '/',
  requireRole('customer'),
  bookingController.listCustomerBookings
);

// List vendor requests (Placed before /:id)
bookingRouter.get(
  '/vendor',
  requireRole('vendor'),
  bookingController.listVendorBookings
);

// Accept booking (Vendor)
bookingRouter.patch(
  '/:id/accept',
  requireRole(['vendor', 'admin']),
  bookingController.acceptBooking
);

// Reject booking (Vendor)
bookingRouter.patch(
  '/:id/reject',
  requireRole(['vendor', 'admin']),
  validate(rejectBookingSchema, 'body'),
  bookingController.rejectBooking
);

// Cancel booking (Customer, Vendor, Admin)
bookingRouter.patch(
  '/:id/cancel',
  requireRole(['customer', 'vendor', 'admin']),
  validate(cancelBookingSchema, 'body'),
  bookingController.cancelBooking
);

// Complete booking (Vendor)
bookingRouter.patch(
  '/:id/complete',
  requireRole(['vendor', 'admin']),
  bookingController.completeBooking
);

// Get single booking
bookingRouter.get(
  '/:id',
  requireRole(['customer', 'vendor', 'admin']),
  bookingController.getBookingById
);

// ==========================================
// 2. Admin Routes (/admin)
// ==========================================

adminRouter.get(
  '/bookings',
  requireRole('admin'),
  adminBookingController.listAllBookings
);

adminRouter.get(
  '/bookings/:id',
  requireRole('admin'),
  adminBookingController.getAdminBookingDetails
);

adminRouter.get(
  '/stats',
  requireRole('admin'),
  adminBookingController.getStats
);

// ==========================================
// 3. Internal Routes (/internal)
// ==========================================

internalRouter.get(
  '/bookings/:id',
  internalAuth,
  bookingController.getInternalBooking
);

internalRouter.patch(
  '/bookings/:id/confirm',
  internalAuth,
  bookingController.confirmBookingPayment
);

module.exports = {
  bookingRouter,
  adminRouter,
  internalRouter,
};
