const express = require('express');
const eventController = require('./controllers/eventController');
const budgetController = require('./controllers/budgetController');
const checklistController = require('./controllers/checklistController');
const suggestionController = require('./controllers/suggestionController');
const requireRole = require('../../shared/middleware/requireRole');
const { validate } = require('../../shared/middleware/validate');
const {
  createEventSchema,
  updateEventSchema,
  updateBudgetSchema,
  createChecklistSchema,
  updateChecklistSchema,
} = require('./validators/eventValidators');

const eventRouter = express.Router();
const checklistItemRouter = express.Router();

// ==========================================
// 1. Event Routes (/events)
// ==========================================

// Create Event
eventRouter.post(
  '/',
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
  requireRole(['customer', 'admin']),
  eventController.getDashboard
);

// Event Suggestions
eventRouter.get(
  '/:id/suggestions',
  requireRole(['customer', 'admin']),
  suggestionController.getSuggestions
);

// Budget Management
eventRouter.get(
  '/:id/budget',
  requireRole(['customer', 'admin']),
  budgetController.getBudget
);

eventRouter.put(
  '/:id/budget',
  requireRole(['customer', 'admin']),
  validate(updateBudgetSchema, 'body'),
  budgetController.updateBudget
);

// Checklist Under Event
eventRouter.get(
  '/:id/checklist',
  requireRole(['customer', 'admin']),
  checklistController.getChecklist
);

eventRouter.post(
  '/:id/checklist',
  requireRole(['customer', 'admin']),
  validate(createChecklistSchema, 'body'),
  checklistController.createChecklistItem
);

// Get Single Event
eventRouter.get(
  '/:id',
  requireRole(['customer', 'admin']),
  eventController.getEventById
);

// Update Event
eventRouter.put(
  '/:id',
  requireRole(['customer', 'admin']),
  validate(updateEventSchema, 'body'),
  eventController.updateEvent
);

// Soft Delete (Cancel) Event
eventRouter.delete(
  '/:id',
  requireRole(['customer', 'admin']),
  eventController.cancelEvent
);

// ==========================================
// 2. Direct Checklist Item Routes (/checklist)
// ==========================================

checklistItemRouter.put(
  '/:id',
  requireRole(['customer', 'admin']),
  validate(updateChecklistSchema, 'body'),
  checklistController.updateChecklistItem
);

checklistItemRouter.delete(
  '/:id',
  requireRole(['customer', 'admin']),
  checklistController.deleteChecklistItem
);

module.exports = {
  eventRouter,
  checklistItemRouter,
};
