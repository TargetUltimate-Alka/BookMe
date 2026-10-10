const {
  BOOKING_STATUS,
  ALLOWED_TRANSITIONS,
  validateTransition,
} = require('../../src/modules/booking/stateMachine');

describe('Booking State Machine - Pure Unit Tests (SRS §8)', () => {
  describe('Valid Status Transitions', () => {
    it('allows PENDING -> ACCEPTED', () => {
      expect(validateTransition(BOOKING_STATUS.PENDING, BOOKING_STATUS.ACCEPTED)).toBe(true);
    });

    it('allows PENDING -> REJECTED', () => {
      expect(validateTransition(BOOKING_STATUS.PENDING, BOOKING_STATUS.REJECTED)).toBe(true);
    });

    it('allows PENDING -> CANCELLED', () => {
      expect(validateTransition(BOOKING_STATUS.PENDING, BOOKING_STATUS.CANCELLED)).toBe(true);
    });

    it('allows ACCEPTED -> CONFIRMED', () => {
      expect(validateTransition(BOOKING_STATUS.ACCEPTED, BOOKING_STATUS.CONFIRMED)).toBe(true);
    });

    it('allows ACCEPTED -> CANCELLED', () => {
      expect(validateTransition(BOOKING_STATUS.ACCEPTED, BOOKING_STATUS.CANCELLED)).toBe(true);
    });

    it('allows CONFIRMED -> COMPLETED', () => {
      expect(validateTransition(BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.COMPLETED)).toBe(true);
    });

    it('allows CONFIRMED -> CANCELLED', () => {
      expect(validateTransition(BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.CANCELLED)).toBe(true);
    });
  });

  describe('Invalid Status Transitions (Throws 409 Conflict)', () => {
    it('rejects PENDING -> CONFIRMED (skipping vendor acceptance)', () => {
      expect(() => {
        validateTransition(BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED);
      }).toThrow(/Cannot transition/);

      try {
        validateTransition(BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED);
      } catch (err) {
        expect(err.status).toBe(409);
        expect(err.code).toBe('INVALID_STATE_TRANSITION');
      }
    });

    it('rejects PENDING -> COMPLETED', () => {
      expect(() => {
        validateTransition(BOOKING_STATUS.PENDING, BOOKING_STATUS.COMPLETED);
      }).toThrow();
    });

    it('rejects ACCEPTED -> PENDING (backward transition)', () => {
      expect(() => {
        validateTransition(BOOKING_STATUS.ACCEPTED, BOOKING_STATUS.PENDING);
      }).toThrow();
    });

    it('rejects COMPLETED -> any other status (terminal state)', () => {
      expect(() => {
        validateTransition(BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CANCELLED);
      }).toThrow();
      expect(() => {
        validateTransition(BOOKING_STATUS.COMPLETED, BOOKING_STATUS.PENDING);
      }).toThrow();
    });

    it('rejects CANCELLED -> any other status (terminal state)', () => {
      expect(() => {
        validateTransition(BOOKING_STATUS.CANCELLED, BOOKING_STATUS.ACCEPTED);
      }).toThrow();
    });

    it('rejects REJECTED -> any other status (terminal state)', () => {
      expect(() => {
        validateTransition(BOOKING_STATUS.REJECTED, BOOKING_STATUS.ACCEPTED);
      }).toThrow();
    });

    it('throws 400 for unknown initial status', () => {
      expect(() => {
        validateTransition('UNKNOWN_STATUS', BOOKING_STATUS.ACCEPTED);
      }).toThrow(/Unknown booking status/);
    });
  });
});
