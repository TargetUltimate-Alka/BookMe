const createEventSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 255 },
    // OpenAPI planner.yaml fields
    dateFrom: { type: 'string' },
    dateTo: { type: 'string' },
    venueLocation: {
      type: 'object',
      properties: {
        address: { type: 'string' },
        city: { type: 'string' },
        state: { type: 'string' },
        postalCode: { type: 'string' },
        latitude: { type: 'number' },
        longitude: { type: 'number' },
      },
    },
    guestCount: { type: 'integer', minimum: 1 },

    // Legacy fields
    event_type: {
      type: 'string',
      enum: ['Wedding', 'Corporate', 'Birthday', 'Anniversary', 'Social', 'Other'],
    },
    event_date: { type: 'string' },
    budget: { type: 'number', minimum: 1 },
    guest_count: { type: 'integer', minimum: 1 },
    city: { type: 'string', maxLength: 100 },
  },
  anyOf: [
    { required: ['name', 'dateFrom', 'dateTo', 'venueLocation', 'guestCount'] },
    { required: ['name', 'event_type', 'event_date', 'budget', 'guest_count'] },
  ],
  additionalProperties: true,
};

const updateEventSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 255 },
    guestCount: { type: 'integer', minimum: 1 },
    venueLocation: { type: 'object' },
    event_type: { type: 'string' },
    event_date: { type: 'string' },
    budget: { type: 'number' },
    guest_count: { type: 'integer' },
    city: { type: 'string' },
  },
  additionalProperties: true,
};

const updateBudgetSchema = {
  type: 'object',
  properties: {
    categories: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: { type: 'string', minLength: 1, maxLength: 100 },
          planned_amount: { type: 'number', minimum: 0 },
        },
        required: ['category', 'planned_amount'],
        additionalProperties: true,
      },
      minItems: 1,
    },
  },
  required: ['categories'],
  additionalProperties: true,
};

const createChecklistSchema = {
  type: 'object',
  properties: {
    // OpenAPI planner.yaml fields
    categoryId: { type: 'string' },
    quantity: { type: 'integer', minimum: 1 },
    durationHours: { type: 'integer' },
    brand: { type: 'string' },

    // Legacy fields
    task: { type: 'string', minLength: 1, maxLength: 255 },
    category: { type: 'string', maxLength: 100 },
    due_date: { type: 'string' },
  },
  anyOf: [
    { required: ['categoryId', 'quantity'] },
    { required: ['task'] },
  ],
  additionalProperties: true,
};

const updateChecklistSchema = {
  type: 'object',
  properties: {
    quantity: { type: 'integer', minimum: 1 },
    durationHours: { type: 'integer' },
    brand: { type: 'string' },
    task: { type: 'string', minLength: 1, maxLength: 255 },
    category: { type: 'string', maxLength: 100 },
    due_date: { type: 'string' },
    done: { type: 'boolean' },
  },
  additionalProperties: true,
};

const notifyRequestSchema = {
  type: 'object',
  properties: {
    targetDate: { type: 'string' },
    eventItemId: { type: 'string' },
    packageId: { type: 'string' },
    categoryId: { type: 'string' },
  },
  required: ['targetDate'],
  additionalProperties: true,
};

module.exports = {
  createEventSchema,
  updateEventSchema,
  updateBudgetSchema,
  createChecklistSchema,
  updateChecklistSchema,
  notifyRequestSchema,
};
