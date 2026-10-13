const createBookingSchema = {
  type: 'object',
  properties: {
    // OpenAPI contract fields
    eventItemId: { type: 'string' },
    vendorId: { type: 'string' },
    packageId: { type: 'string' },
    eventDate: { type: 'string' },
    quantity: { type: 'integer', minimum: 1 },
    addonIds: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },

    // Backwards-compatible legacy fields
    event_id: { type: 'string' },
    event_item_id: { type: 'string' },
    vendor_id: { type: 'string' },
    service_id: { type: 'string' },
    package_id: { type: 'string' },
    booking_date: { type: 'string' },
    category: { type: 'string', maxLength: 100 },
    items: { type: 'array' },
    custom_price: { type: 'number', minimum: 0 },
    custom_package_name: { type: 'string', maxLength: 255 },
  },
  anyOf: [
    { required: ['vendorId', 'packageId', 'eventDate'] },
    { required: ['vendor_id', 'package_id'] },
    { required: ['event_id', 'vendor_id', 'service_id', 'package_id'] },
  ],
  additionalProperties: true,
};

const rejectBookingSchema = {
  type: 'object',
  properties: {
    reason: { type: 'string', minLength: 1, maxLength: 500 },
  },
  required: ['reason'],
  additionalProperties: true,
};

const cancelBookingSchema = {
  type: 'object',
  properties: {
    reason: { type: 'string', minLength: 1, maxLength: 500 },
    forceMajeure: { type: 'boolean' },
    evidenceUrl: { type: 'string' },
  },
  required: ['reason'],
  additionalProperties: true,
};

const counterOfferSchema = {
  type: 'object',
  properties: {
    amountPaise: { type: 'integer', minimum: 1 },
    notes: { type: 'string' },
  },
  required: ['amountPaise'],
  additionalProperties: true,
};

const deliveryChoiceSchema = {
  type: 'object',
  properties: {
    choice: { type: 'string', enum: ['DELIVERY', 'PICKUP', 'delivery', 'pickup'] },
    deliveryMode: { type: 'string', enum: ['DELIVERY', 'SELF_PICKUP', 'PICKUP', 'delivery', 'self_pickup', 'pickup'] },
    deliveryAddress: {
      type: 'object',
      properties: {
        address: { type: 'string' },
        city: { type: 'string' },
        latitude: { type: 'number' },
        longitude: { type: 'number' },
      },
    },
  },
  anyOf: [
    { required: ['choice'] },
    { required: ['deliveryMode'] },
  ],
  additionalProperties: true,
};

const checkInSchema = {
  type: 'object',
  properties: {
    latitude: { type: 'number' },
    longitude: { type: 'number' },
  },
  required: ['latitude', 'longitude'],
  additionalProperties: true,
};

const disputeSchema = {
  type: 'object',
  properties: {
    reason: { type: 'string', minLength: 1, maxLength: 1000 },
  },
  required: ['reason'],
  additionalProperties: true,
};

module.exports = {
  createBookingSchema,
  rejectBookingSchema,
  cancelBookingSchema,
  counterOfferSchema,
  deliveryChoiceSchema,
  checkInSchema,
  disputeSchema,
};
