/**
 * Booking Lifecycle State Machine (SRS Section 5 & OpenAPI booking.yaml)
 * Pure, deterministic transition validator
 */

const BOOKING_STATUS = {
  REQUESTED: 'REQUESTED',
  NEGOTIATING: 'NEGOTIATING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  CONFIRMED: 'CONFIRMED',
  CANCELLED_BY_CUSTOMER: 'CANCELLED_BY_CUSTOMER',
  CANCELLED_BY_VENDOR: 'CANCELLED_BY_VENDOR',
  IN_PROGRESS: 'IN_PROGRESS',
  NO_SHOW: 'NO_SHOW',
  COMPLETED: 'COMPLETED',
  DISPUTED: 'DISPUTED',
  // Backwards-compatible aliases
  PENDING: 'PENDING',
  CANCELLED: 'CANCELLED',
};

const ALLOWED_TRANSITIONS = {
  [BOOKING_STATUS.REQUESTED]: [
    BOOKING_STATUS.NEGOTIATING,
    BOOKING_STATUS.ACCEPTED,
    BOOKING_STATUS.REJECTED,
    BOOKING_STATUS.EXPIRED,
    BOOKING_STATUS.CANCELLED_BY_CUSTOMER,
    BOOKING_STATUS.CANCELLED,
  ],
  [BOOKING_STATUS.PENDING]: [
    BOOKING_STATUS.ACCEPTED,
    BOOKING_STATUS.REJECTED,
    BOOKING_STATUS.CANCELLED,
    BOOKING_STATUS.NEGOTIATING,
    BOOKING_STATUS.EXPIRED,
    BOOKING_STATUS.CANCELLED_BY_CUSTOMER,
  ],
  [BOOKING_STATUS.NEGOTIATING]: [
    BOOKING_STATUS.NEGOTIATING,
    BOOKING_STATUS.ACCEPTED,
    BOOKING_STATUS.REJECTED,
    BOOKING_STATUS.EXPIRED,
    BOOKING_STATUS.CANCELLED_BY_CUSTOMER,
    BOOKING_STATUS.CANCELLED,
  ],
  [BOOKING_STATUS.ACCEPTED]: [
    BOOKING_STATUS.CONFIRMED,
    BOOKING_STATUS.EXPIRED,
    BOOKING_STATUS.CANCELLED_BY_CUSTOMER,
    BOOKING_STATUS.CANCELLED_BY_VENDOR,
    BOOKING_STATUS.CANCELLED,
  ],
  [BOOKING_STATUS.CONFIRMED]: [
    BOOKING_STATUS.IN_PROGRESS,
    BOOKING_STATUS.NO_SHOW,
    BOOKING_STATUS.CANCELLED_BY_CUSTOMER,
    BOOKING_STATUS.CANCELLED_BY_VENDOR,
    BOOKING_STATUS.CANCELLED,
    BOOKING_STATUS.COMPLETED, // Backwards-compatible direct completion for legacy tests
    BOOKING_STATUS.DISPUTED,
  ],
  [BOOKING_STATUS.IN_PROGRESS]: [
    BOOKING_STATUS.COMPLETED,
    BOOKING_STATUS.DISPUTED,
  ],
  [BOOKING_STATUS.DISPUTED]: [
    BOOKING_STATUS.COMPLETED,
  ],
  [BOOKING_STATUS.COMPLETED]: [
    BOOKING_STATUS.DISPUTED, // Allowed within 48h dispute window per FR-PAY-06
  ],
  [BOOKING_STATUS.CANCELLED]: [],
  [BOOKING_STATUS.CANCELLED_BY_CUSTOMER]: [],
  [BOOKING_STATUS.CANCELLED_BY_VENDOR]: [],
  [BOOKING_STATUS.REJECTED]: [],
  [BOOKING_STATUS.EXPIRED]: [],
  [BOOKING_STATUS.NO_SHOW]: [],
};

/**
 * Validates whether a status transition is allowed
 * @param {string} currentStatus
 * @param {string} nextStatus
 * @returns {boolean}
 * @throws {Error} with status 409 if invalid
 */
function validateTransition(currentStatus, nextStatus) {
  const allowed = ALLOWED_TRANSITIONS[currentStatus];

  if (!allowed) {
    const err = new Error(`Unknown booking status: ${currentStatus}`);
    err.status = 400;
    err.code = 'INVALID_STATUS';
    throw err;
  }

  if (!allowed.includes(nextStatus)) {
    const err = new Error(
      `Cannot transition booking from '${currentStatus}' to '${nextStatus}'. Allowed transitions: [${allowed.join(', ') || 'none'}]`
    );
    err.status = 409;
    err.code = 'INVALID_STATE_TRANSITION';
    err.details = [
      {
        field: 'status',
        current: currentStatus,
        attempted: nextStatus,
        allowed,
      },
    ];
    throw err;
  }

  return true;
}

module.exports = {
  BOOKING_STATUS,
  ALLOWED_TRANSITIONS,
  validateTransition,
};
