const createBookingSchema = {
  type: 'object',
  properties: {
    event_id: { type: 'string', minLength: 1 },
    vendor_id: { type: 'string', minLength: 1 },
    service_id: { type: 'string', minLength: 1 },
    package_id: { type: 'string', minLength: 1 },
    category: { type: 'string', maxLength: 100 },
  },
  required: ['event_id', 'vendor_id', 'service_id', 'package_id'],
  additionalProperties: false,
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
