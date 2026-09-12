/**
 * Event routes
 * Status: Implements all HTTP methods with proper status codes and error handling
 */

const express = require('express');
const { validateRequest, schemas } = require('../../shared/middleware/validation');
const { setCacheControl, handleETag } = require('../../shared/middleware/cache');
const { apiLimiter } = require('../../shared/middleware/rateLimit');
const Event = require('../../shared/models/Event');
const ChecklistItem = require('../../shared/models/ChecklistItem');

const router = express.Router();

// Apply rate limiting to all event routes
router.use(apiLimiter);

// Apply ETag handling to all GET requests
router.get('*', handleETag);

// Helper to get DB and models from app context
const getModels = (req) => {
  const db = req.app.locals.db;
  return {
    eventModel: new Event(db),
    checklistModel: new ChecklistItem(db),
  };
};

/**
 * POST /api/events
 * Create a new event
 * Status: 201 Created
 */
router.post(
  '/',
  validateRequest(schemas.eventCreateSchema),
  async (req, res, next) => {
    try {
      const customerId = req.user?.id;
      if (!customerId) {
        const err = new Error('User not authenticated');
        err.status = 401;
        return next(err);
      }

      const { eventModel } = getModels(req);
      const event = await eventModel.createEvent(customerId, req.body);

      res.status(201).json(event);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/events
 * List all events for logged-in customer
 * Status: 200 OK with Cache-Control
 */
router.get(
  '/',
  setCacheControl({ maxAge: 60, isPrivate: true }),
  async (req, res, next) => {
    try {
      const customerId = req.user?.id;
      if (!customerId) {
        const err = new Error('User not authenticated');
        err.status = 401;
        return next(err);
      }

      const { eventModel } = getModels(req);
      const events = await eventModel.getEventsByCustomer(customerId);

      res.status(200).json(events);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/events/:id
 * Get a specific event
 * Status: 200 OK, 404 Not Found, 401 Unauthorized
 */
router.get(
  '/:id',
  setCacheControl({ maxAge: 60, isPrivate: true }),
  async (req, res, next) => {
    try {
      const customerId = req.user?.id;
      if (!customerId) {
        const err = new Error('User not authenticated');
        err.status = 401;
        return next(err);
      }

      const { eventModel } = getModels(req);
      const event = await eventModel.getEventById(req.params.id, customerId);

      if (!event) {
        const err = new Error('Event not found');
        err.status = 404;
        err.details = [{ id: req.params.id }];
        return next(err);
      }

      res.status(200).json(event);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/events/:id
 * Update an event
 * Status: 200 OK, 404 Not Found, 400 Bad Request, 401 Unauthorized
 */
router.patch(
  '/:id',
  validateRequest(schemas.eventUpdateSchema),
  async (req, res, next) => {
    try {
      const customerId = req.user?.id;
      if (!customerId) {
        const err = new Error('User not authenticated');
        err.status = 401;
        return next(err);
      }

      const { eventModel } = getModels(req);
      const event = await eventModel.updateEvent(req.params.id, customerId, req.body);

      if (!event) {
        const err = new Error('Event not found');
        err.status = 404;
        err.details = [{ id: req.params.id }];
        return next(err);
      }

      res.status(200).json(event);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/events/:id/dashboard
 * Get event dashboard with booking summary
 * Status: 200 OK with Cache-Control
 */
router.get(
  '/:id/dashboard',
  setCacheControl({ maxAge: 30, isPrivate: true }),
  async (req, res, next) => {
    try {
      const customerId = req.user?.id;
      if (!customerId) {
        const err = new Error('User not authenticated');
        err.status = 401;
        return next(err);
      }

      const { eventModel, checklistModel } = getModels(req);
      const db = req.app.locals.db;

      const event = await eventModel.getEventById(req.params.id, customerId);
      if (!event) {
        const err = new Error('Event not found');
        err.status = 404;
        return next(err);
      }

      // Get booking info
      const bookingQuery = `
        SELECT id, vendor_name_snapshot as "vendorName", status, price_snapshot as price
        FROM bookings
        WHERE event_id = $1
      `;
      const bookingResult = await db.query(bookingQuery, [req.params.id]);
      const bookings = bookingResult.rows;

      const totalBooked = bookings.reduce((sum, b) => sum + (b.price || 0), 0);

      // Get checklist stats
      const checklistStats = await checklistModel.getChecklistStats(req.params.id);

      const dashboard = {
        eventId: event.id,
        budget: event.budget,
        totalBooked,
        bookings,
        checklist: {
          total: parseInt(checklistStats.total, 10) || 0,
          done: parseInt(checklistStats.done, 10) || 0,
        },
      };

      res.status(200).json(dashboard);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/events/:id/checklist
 * Add a checklist item
 * Status: 201 Created
 */
router.post(
  '/:id/checklist',
  validateRequest(schemas.checklistItemCreateSchema),
  async (req, res, next) => {
    try {
      const customerId = req.user?.id;
      if (!customerId) {
        const err = new Error('User not authenticated');
        err.status = 401;
        return next(err);
      }

      const { eventModel, checklistModel } = getModels(req);

      // Verify event exists and belongs to user
      const event = await eventModel.getEventById(req.params.id, customerId);
      if (!event) {
        const err = new Error('Event not found');
        err.status = 404;
        return next(err);
      }

      const item = await checklistModel.createItem(req.params.id, req.body.task);

      res.status(201).json(item);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/events/:id/checklist/:itemId
 * Update a checklist item
 * Status: 200 OK, 404 Not Found, 400 Bad Request
 */
router.patch(
  '/:id/checklist/:itemId',
  validateRequest(schemas.checklistItemUpdateSchema),
  async (req, res, next) => {
    try {
      const customerId = req.user?.id;
      if (!customerId) {
        const err = new Error('User not authenticated');
        err.status = 401;
        return next(err);
      }

      const { eventModel, checklistModel } = getModels(req);

      // Verify event exists and belongs to user
      const event = await eventModel.getEventById(req.params.id, customerId);
      if (!event) {
        const err = new Error('Event not found');
        err.status = 404;
        return next(err);
      }

      const item = await checklistModel.updateItem(req.params.itemId, req.params.id, req.body);

      if (!item) {
        const err = new Error('Checklist item not found');
        err.status = 404;
        return next(err);
      }

      res.status(200).json(item);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/events/:id/checklist/:itemId
 * Delete a checklist item
 * Status: 204 No Content, 404 Not Found
 */
router.delete(
  '/:id/checklist/:itemId',
  async (req, res, next) => {
    try {
      const customerId = req.user?.id;
      if (!customerId) {
        const err = new Error('User not authenticated');
        err.status = 401;
        return next(err);
      }

      const { eventModel, checklistModel } = getModels(req);

      // Verify event exists and belongs to user
      const event = await eventModel.getEventById(req.params.id, customerId);
      if (!event) {
        const err = new Error('Event not found');
        err.status = 404;
        return next(err);
      }

      // Verify item exists
      const item = await checklistModel.getItemById(req.params.itemId, req.params.id);
      if (!item) {
        const err = new Error('Checklist item not found');
        err.status = 404;
        return next(err);
      }

      await checklistModel.deleteItem(req.params.itemId, req.params.id);

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
