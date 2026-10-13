const express = require('express');
const eventController = require('./controllers/eventController');
const budgetController = require('./controllers/budgetController');
const checklistController = require('./controllers/checklistController');
const suggestionController = require('./controllers/suggestionController');
const coverageController = require('./controllers/coverageController');
const notifyController = require('./controllers/notifyController');
const requireRole = require('../../shared/middleware/requireRole');
const idempotencyMiddleware = require('../../shared/middleware/idempotency');
const { validate } = require('../../shared/middleware/validate');
const {
  createEventSchema,
  updateEventSchema,
  updateBudgetSchema,
  createChecklistSchema,
  updateChecklistSchema,
  notifyRequestSchema,
} = require('./validators/eventValidators');

const eventRouter = express.Router();
const checklistItemRouter = express.Router();
const notifyRouter = express.Router();

// ==========================================
// 1. Event Routes (/events)
// ==========================================

// OPTIONS preflight & discovery with Allow header (A5)
eventRouter.options('/', (req, res) => {
  res.setHeader('Allow', 'GET, POST, OPTIONS');
  res.status(204).end();
});

eventRouter.options('/:id', (req, res) => {
  res.setHeader('Allow', 'GET, PATCH, PUT, DELETE, OPTIONS');
  res.status(204).end();
});

// Create Event (Customer)
eventRouter.post(
  '/',
  idempotencyMiddleware(false),
  requireRole('customer'),
  validate(createEventSchema, 'body'),
  eventController.createEvent
);

// List Customer's Events
eventRouter.get(
  '/',
  requireRole('customer'),
  eventController.listEvents
);

// Event Dashboard Aggregate
eventRouter.get(
  '/:id/dashboard',
  requireRole(['customer', 'admin', 'superadmin', 'supportagent']),
  eventController.getDashboard
);

// Event Suggestions (Legacy / Deprecated)
eventRouter.get(
  '/:id/suggestions',
  requireRole(['customer', 'admin', 'superadmin', 'supportagent']),
  suggestionController.getSuggestions
);

// Budget Management (Legacy / Deprecated)
eventRouter.get(
  '/:id/budget',
  requireRole(['customer', 'admin', 'superadmin', 'supportagent']),
  budgetController.getBudget
);

eventRouter.put(
  '/:id/budget',
  requireRole(['customer', 'admin', 'superadmin', 'supportagent']),
  validate(updateBudgetSchema, 'body'),
  budgetController.updateBudget
);

// Event Coverage Summary (FR-PLAN-03)
eventRouter.get(
  '/:id/coverage',
  requireRole(['customer', 'admin', 'superadmin', 'supportagent']),
  coverageController.getEventCoverageSummary
);

// Matching available vendors for checklist item (FR-PLAN-02)
eventRouter.get(
  '/:id/items/:itemId/vendors',
  requireRole(['customer', 'admin', 'superadmin', 'supportagent']),
  coverageController.listMatchingVendorsForItem
);

// Checklist items nested routes under /events/:id/items (OpenAPI planner.yaml)
eventRouter.get(
  '/:id/items',
  requireRole(['customer', 'admin', 'superadmin', 'supportagent']),
  checklistController.getChecklist
);

eventRouter.post(
  '/:id/items',
  requireRole(['customer', 'admin', 'superadmin', 'supportagent']),
  validate(createChecklistSchema, 'body'),
  checklistController.createChecklistItem
);

eventRouter.patch(
  '/:id/items/:itemId',
  requireRole(['customer', 'admin', 'superadmin', 'supportagent']),
  validate(updateChecklistSchema, 'body'),
  checklistController.updateChecklistItem
);

eventRouter.delete(
  '/:id/items/:itemId',
  requireRole(['customer', 'admin', 'superadmin', 'supportagent']),
  checklistController.deleteChecklistItem
);

// Legacy Checklist aliases under /events/:id/checklist
eventRouter.get(
  '/:id/checklist',
  requireRole(['customer', 'admin', 'superadmin', 'supportagent']),
  checklistController.getChecklist
);

eventRouter.post(
  '/:id/checklist',
  requireRole(['customer', 'admin', 'superadmin', 'supportagent']),
  validate(createChecklistSchema, 'body'),
  checklistController.createChecklistItem
);

// Get Single Event
eventRouter.get(
  '/:id',
  requireRole(['customer', 'admin', 'superadmin', 'supportagent']),
  eventController.getEventById
);

// Update Event (PATCH per OpenAPI, PUT for backward compatibility)
eventRouter.patch(
  '/:id',
  requireRole(['customer', 'admin', 'superadmin', 'supportagent']),
  validate(updateEventSchema, 'body'),
  eventController.updateEvent
);

eventRouter.put(
  '/:id',
  requireRole(['customer', 'admin', 'superadmin', 'supportagent']),
  validate(updateEventSchema, 'body'),
  eventController.updateEvent
);

// Soft Delete (Cancel) Event
eventRouter.delete(
  '/:id',
  requireRole(['customer', 'admin', 'superadmin', 'supportagent']),
  eventController.cancelEvent
);

// ==========================================
// 2. Direct Checklist Item Routes (/checklist) - Legacy
// ==========================================

checklistItemRouter.put(
  '/:id',
  requireRole(['customer', 'admin', 'superadmin', 'supportagent']),
  validate(updateChecklistSchema, 'body'),
  checklistController.updateChecklistItem
);

checklistItemRouter.delete(
  '/:id',
  requireRole(['customer', 'admin', 'superadmin', 'supportagent']),
  checklistController.deleteChecklistItem
);

// ==========================================
// 3. Notify-Me Routes (/notify-me) - FR-PLAN-03, FR-NOT-02
// ==========================================

notifyRouter.post(
  '/',
  requireRole('customer'),
  validate(notifyRequestSchema, 'body'),
  notifyController.createNotifyRequest
);

notifyRouter.get(
  '/',
  requireRole('customer'),
  notifyController.listNotifyRequests
);

notifyRouter.delete(
  '/:id',
  requireRole('customer'),
  notifyController.cancelNotifyRequest
);

module.exports = {
  eventRouter,
  checklistItemRouter,
  notifyRouter,
};
