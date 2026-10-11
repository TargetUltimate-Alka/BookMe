const createEventSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 255 },
    event_type: {
      type: 'string',
      enum: ['Wedding', 'Corporate', 'Birthday', 'Anniversary', 'Social', 'Other'],
    },
    event_date: { type: 'string', format: 'date' },
    budget: { type: 'number', minimum: 1 },
    guest_count: { type: 'integer', minimum: 1 },
    city: { type: 'string', maxLength: 100 },
  },
  required: ['name', 'event_type', 'event_date', 'budget', 'guest_count'],
  additionalProperties: false,
};

const updateEventSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 255 },
    event_type: {
      type: 'string',
      enum: ['Wedding', 'Corporate', 'Birthday', 'Anniversary', 'Social', 'Other'],
    },
    event_date: { type: 'string', format: 'date' },
    budget: { type: 'number', minimum: 1 },
    guest_count: { type: 'integer', minimum: 1 },
    city: { type: 'string', maxLength: 100 },
  },
  additionalProperties: false,
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
        additionalProperties: false,
      },
      minItems: 1,
    },
  },
  required: ['categories'],
  additionalProperties: false,
};

const createChecklistSchema = {
  type: 'object',
  properties: {
    task: { type: 'string', minLength: 1, maxLength: 255 },
    category: { type: 'string', maxLength: 100 },
    due_date: { type: 'string', format: 'date' },
  },
  required: ['task'],
  additionalProperties: false,
};

const updateChecklistSchema = {
  type: 'object',
  properties: {
    task: { type: 'string', minLength: 1, maxLength: 255 },
    category: { type: 'string', maxLength: 100 },
    due_date: { type: 'string', format: 'date' },
    done: { type: 'boolean' },
  },
  additionalProperties: false,
};

module.exports = {
  createEventSchema,
  updateEventSchema,
  updateBudgetSchema,
  createChecklistSchema,
  updateChecklistSchema,
};
