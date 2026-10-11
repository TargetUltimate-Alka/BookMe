const createBookingSchema = {
  type: 'object',
  properties: {
    event_id: { type: 'string', minLength: 1 },
    vendor_id: { type: 'string', minLength: 1 },
    service_id: { type: 'string', minLength: 1 },
    package_id: { type: 'string', minLength: 1 },
    category: { type: 'string', maxLength: 100 },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          quantity: { type: 'number', minimum: 1 },
          unit_price: { type: 'number', minimum: 0 },
          unit: { type: 'string' },
          subtotal: { type: 'number', minimum: 0 },
        },
      },
    },
    custom_price: { type: 'number', minimum: 0 },
    custom_package_name: { type: 'string', maxLength: 255 },
  },
  required: ['event_id', 'vendor_id', 'service_id', 'package_id'],
  additionalProperties: true,
};

const rejectBookingSchema = {
  type: 'object',
  properties: {
    reason: { type: 'string', minLength: 1, maxLength: 500 },
  },
  required: ['reason'],
  additionalProperties: false,
};

const cancelBookingSchema = {
  type: 'object',
  properties: {
    reason: { type: 'string', minLength: 1, maxLength: 500 },
  },
  required: ['reason'],
  additionalProperties: false,
};

module.exports = {
  createBookingSchema,
  rejectBookingSchema,
  cancelBookingSchema,
};
