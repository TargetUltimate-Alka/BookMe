/**
 * Booking routes
 * Status: Implements all HTTP methods with proper status codes and error handling
 */

const express = require('express');
const { validateRequest, schemas } = require('../../shared/middleware/validation');
const { setCacheControl, handleETag } = require('../../shared/middleware/cache');
const { apiLimiter, bookingLimiter } = require('../../shared/middleware/rateLimit');
const Booking = require('../../shared/models/Booking');
const Event = require('../../shared/models/Event');

const router = express.Router();

// Apply rate limiting
router.use(apiLimiter);
router.post('/', bookingLimiter);

// Apply ETag handling to all GET requests
router.get('*', handleETag);

// Helper to get DB and models from app context
const getModels = (req) => {
  const db = req.app.locals.db;
  return {
    bookingModel: new Booking(db),
    eventModel: new Event(db),
  };
};

/**
 * POST /api/bookings
 * Create a new booking
 * Status: 201 Created, 409 Conflict (vendor unavailable), 404 Not Found, 400 Bad Request
 * Note: In production, would call vendor-service to check availability
 */
router.post(
  '/',
  validateRequest(schemas.bookingCreateSchema),
  async (req, res, next) => {
    try {
      const customerId = req.user?.id;
      if (!customerId) {
        const err = new Error('User not authenticated');
        err.status = 401;
        return next(err);
      }

      const { bookingModel, eventModel } = getModels(req);
      const { eventId, vendorId, packageId, date } = req.body;

      // Verify event exists and belongs to user
      const event = await eventModel.getEventById(eventId, customerId);
      if (!event) {
        const err = new Error('Event not found');
        err.status = 404;
        err.details = [{ field: 'eventId', issue: 'Event does not exist' }];
        return next(err);
      }

      // TODO: Call vendor-service to get vendor details and check availability
      // For now, use placeholder data
      // const vendorAvailability = await checkVendorAvailability(vendorId, date);
      // if (!vendorAvailability) {
      //   const err = new Error('Vendor not available on this date');
      //   err.status = 409;
      //   err.details = [{ field: 'vendor', issue: 'Not available on requested date' }];
      //   return next(err);
      // }

      // Mock vendor data (in production, fetch from vendor-service)
      const vendorNameSnapshot = 'Sunset Catering'; // TODO: fetch from vendor-service
      const priceSnapshot = 120000; // TODO: fetch from vendor-service

      const booking = await bookingModel.createBooking(eventId, {
        vendorId,
        packageId,
        date,
        vendorNameSnapshot,
        priceSnapshot,
      });

      res.status(201).json(booking);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/bookings/:id
 * Get a specific booking
 * Status: 200 OK, 404 Not Found
 */
router.get(
  '/:id',
  setCacheControl({ maxAge: 60, isPrivate: true }),
  async (req, res, next) => {
    try {
      const { bookingModel } = getModels(req);
      const booking = await bookingModel.getBookingById(req.params.id);

      if (!booking) {
        const err = new Error('Booking not found');
        err.status = 404;
        err.details = [{ id: req.params.id }];
        return next(err);
      }

      res.status(200).json(booking);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/events/:eventId/bookings
 * Get all bookings for an event
 * Status: 200 OK, 404 Not Found
 * Note: This endpoint allows cursor pagination via ?cursor parameter
 */
router.get(
  '/events/:eventId/bookings',
  setCacheControl({ maxAge: 60, isPrivate: true }),
  async (req, res, next) => {
    try {
      const customerId = req.user?.id;
      if (!customerId) {
        const err = new Error('User not authenticated');
        err.status = 401;
        return next(err);
      }

      const { bookingModel, eventModel } = getModels(req);

      // Verify event exists and belongs to user
      const event = await eventModel.getEventById(req.params.eventId, customerId);
      if (!event) {
        const err = new Error('Event not found');
        err.status = 404;
        return next(err);
      }

      const bookings = await bookingModel.getBookingsByEvent(req.params.eventId);

      // Apply cursor pagination
      const limit = parseInt(req.query.limit, 10) || 10;
      const cursor = req.query.cursor || null;

      let paginatedBookings = bookings;
      let nextCursor = null;

      if (cursor) {
        const cursorIndex = bookings.findIndex((b) => b.id === cursor);
        if (cursorIndex !== -1) {
          paginatedBookings = bookings.slice(cursorIndex + 1);
        }
      }

      const hasMore = paginatedBookings.length > limit;
      paginatedBookings = paginatedBookings.slice(0, limit);

      if (hasMore && paginatedBookings.length > 0) {
        nextCursor = paginatedBookings[paginatedBookings.length - 1].id;
      }

      res.status(200).json({
        items: paginatedBookings,
        next: nextCursor,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/bookings/:id/status
 * Update booking status
 * Status: 200 OK, 400 Bad Request (invalid transition), 404 Not Found
 * Transition rules: pending → confirmed → completed, or → cancelled
 */
router.patch(
  '/:id/status',
  validateRequest(schemas.bookingStatusUpdateSchema),
  async (req, res, next) => {
    try {
      const { bookingModel } = getModels(req);

      try {
        const booking = await bookingModel.updateBookingStatus(req.params.id, req.body.status);

        if (!booking) {
          const err = new Error('Booking not found');
          err.status = 404;
          return next(err);
        }

        // TODO: When status moves to 'confirmed', call vendor-service to block availability
        // TODO: Notify payment service if status moves to confirmed

        res.status(200).json(booking);
      } catch (err) {
        if (err.status) {
          // Error already has status code
          return next(err);
        }
        throw err;
      }
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
