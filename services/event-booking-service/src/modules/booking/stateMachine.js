/**
 * Booking Lifecycle State Machine (SRS §8)
 * Pure, deterministic transition validator
 */

const BOOKING_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  CONFIRMED: 'CONFIRMED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  REJECTED: 'REJECTED',
};

const ALLOWED_TRANSITIONS = {
  [BOOKING_STATUS.PENDING]: [
    BOOKING_STATUS.ACCEPTED,
    BOOKING_STATUS.REJECTED,
    BOOKING_STATUS.CANCELLED,
  ],
  [BOOKING_STATUS.ACCEPTED]: [
    BOOKING_STATUS.CONFIRMED,
    BOOKING_STATUS.CANCELLED,
  ],
  [BOOKING_STATUS.CONFIRMED]: [
    BOOKING_STATUS.COMPLETED,
    BOOKING_STATUS.CANCELLED,
  ],
  [BOOKING_STATUS.COMPLETED]: [], // Terminal state
  [BOOKING_STATUS.CANCELLED]: [], // Terminal state
  [BOOKING_STATUS.REJECTED]: [],  // Terminal state
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
