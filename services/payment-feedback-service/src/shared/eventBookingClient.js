const config = require('../config');
const logger = require('./logger');

class EventBookingClient {
  constructor() {
    this.baseUrl = config.eventBookingServiceUrl.replace(/\/$/, '');
    this.apiKey = config.internalApiKey;
  }

  async getBooking(bookingId) {
    try {
      const url = `${this.baseUrl}/internal/bookings/${bookingId}`;
      const res = await fetch(url, {
        headers: {
          'X-Internal-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        if (res.status === 404) return null;
        logger.warn(`Failed to fetch booking ${bookingId} from event-booking-service: HTTP ${res.status}`);
        return null;
      }

      return await res.json();
    } catch (err) {
      logger.warn(`Could not connect to event-booking-service at ${this.baseUrl}: ${err.message}`);
      return null;
    }
  }

  async notifyPaymentCompleted({ bookingId, paymentId, amount }) {
    try {
      // 1. Try internal confirm route first
      const url = `${this.baseUrl}/internal/bookings/${bookingId}/confirm`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'X-Internal-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentId, amount, status: 'confirmed' }),
      });

      if (res.ok) {
        logger.info(`Successfully notified event-booking-service for booking ${bookingId}`);
        return await res.json();
      }

      // 2. Fallback to /bookings/:id/status if available
      const fallbackUrl = `${this.baseUrl}/bookings/${bookingId}/status`;
      const fallbackRes = await fetch(fallbackUrl, {
        method: 'PATCH',
        headers: {
          'X-Internal-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'confirmed' }),
      });

      if (fallbackRes.ok) {
        return await fallbackRes.json();
      }

      logger.warn(`Direct HTTP notification to booking service returned ${res.status}`);
      return null;
    } catch (err) {
      logger.warn(`Failed direct HTTP notification to event-booking-service: ${err.message}`);
      return null;
    }
  }
}

module.exports = new EventBookingClient();
