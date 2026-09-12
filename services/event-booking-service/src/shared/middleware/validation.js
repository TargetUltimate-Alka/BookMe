/**
 * Request validation middleware using AJV
 * Status: Implements "JSON Schema validation, using ajv" requirement
 */

const Ajv = require('ajv');
const ajv = new Ajv({ removeAdditional: true });

// Validation schemas
const eventCreateSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 255 },
    date: { type: 'string', format: 'date' },
    budget: { type: 'number', minimum: 0 },
    guestCount: { type: 'integer', minimum: 0 },
  },
  required: ['name', 'date', 'budget', 'guestCount'],
  additionalProperties: false,
};

const eventUpdateSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 255 },
    date: { type: 'string', format: 'date' },
    budget: { type: 'number', minimum: 0 },
    guestCount: { type: 'integer', minimum: 0 },
  },
  additionalProperties: false,
};

const checklistItemCreateSchema = {
  type: 'object',
  properties: {
    task: { type: 'string', minLength: 1, maxLength: 255 },
  },
  required: ['task'],
  additionalProperties: false,
};

const checklistItemUpdateSchema = {
  type: 'object',
  properties: {
    done: { type: 'boolean' },
  },
  additionalProperties: false,
};

const bookingCreateSchema = {
  type: 'object',
  properties: {
    eventId: { type: 'string', minLength: 1 },
    vendorId: { type: 'string', minLength: 1 },
    packageId: { type: 'string', minLength: 1 },
    date: { type: 'string', format: 'date' },
  },
  required: ['eventId', 'vendorId', 'packageId', 'date'],
  additionalProperties: false,
};

const bookingStatusUpdateSchema = {
  type: 'object',
  properties: {
    status: {
      type: 'string',
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
    },
  },
  required: ['status'],
  additionalProperties: false,
};

// Validation middleware factory
const validateRequest = (schema) => {
  return (req, res, next) => {
    const validate = ajv.compile(schema);
    const valid = validate(req.body);

    if (!valid) {
      const err = new Error('Validation failed');
      err.status = 400;
      err.details = validate.errors.map((e) => ({
        field: e.instancePath || 'root',
        issue: e.message,
        params: e.params,
      }));
      return next(err);
    }

    next();
  };
};

module.exports = {
  validateRequest,
  schemas: {
    eventCreateSchema,
    eventUpdateSchema,
    checklistItemCreateSchema,
    checklistItemUpdateSchema,
    bookingCreateSchema,
    bookingStatusUpdateSchema,
  },
};
