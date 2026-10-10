const { getClient, query } = require('../../../shared/db/pool');
const bookingRepository = require('../repository/bookingRepository');
const historyRepository = require('../repository/historyRepository');
const budgetRepository = require('../../event/repository/budgetRepository');
const publisher = require('./publisher');
const { vendorClient } = require('../../../clients/vendorClient');
const logger = require('../../../shared/logger');

async function handlePaymentCompleted(payload) {
  const { eventId: incomingEventId, bookingId, paymentId, amount } = payload;
  const deduplicationKey = incomingEventId || `pay_completed_${bookingId}_${paymentId || Date.now()}`;

  // 1. Idempotency check via processed_events table
  const checkRes = await query('SELECT event_id FROM processed_events WHERE event_id = $1', [
    deduplicationKey,
  ]);
  if (checkRes.rows.length > 0) {
    logger.warn(`Event ${deduplicationKey} already processed. Skipping duplicate payment.completed.`);
    return;
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // 2. Load booking
    const booking = await bookingRepository.findById(bookingId, client);
    if (!booking) {
      logger.warn(`Booking ${bookingId} not found for payment.completed event`);
      await client.query('ROLLBACK');
      return;
    }

    if (booking.status !== 'ACCEPTED') {
      logger.warn(
        `Received payment.completed for booking ${bookingId} in unexpected status '${booking.status}'. Ignoring.`
      );
      // Mark as processed to avoid repeating warning
      await client.query(
        'INSERT INTO processed_events (event_id, event_type) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [deduplicationKey, 'payment.completed']
      );
      await client.query('COMMIT');
      return;
    }

    // 3. Transition status ACCEPTED -> CONFIRMED
    const updated = await bookingRepository.updateStatus(booking.id, 'CONFIRMED', {}, client);
    await historyRepository.recordTransition(
      booking.id,
      'ACCEPTED',
      'CONFIRMED',
      'SYSTEM_PAYMENT',
      `Payment confirmed. Payment ID: ${paymentId || 'N/A'}`,
      client
    );

    // 4. Update actual budget amount for category
    if (booking.category) {
      await budgetRepository.incrementActualAmount(
        booking.event_id,
        booking.category,
        Number(amount || booking.price_snapshot),
        client
      );
    }

    // 5. Mark event as processed (Idempotency guarantee)
    await client.query(
      'INSERT INTO processed_events (event_id, event_type) VALUES ($1, $2)',
      [deduplicationKey, 'payment.completed']
    );

    await client.query('COMMIT');
    logger.info(`Booking ${bookingId} confirmed following payment.completed.`);

    // 6. External side effects: notify vendor calendar & publish booking.confirmed
    try {
      await vendorClient.book(booking.vendor_id, booking.booking_date, booking.id);
    } catch (vErr) {
      logger.error(`Vendor lock failed post-payment for booking ${bookingId}: ${vErr.message}`);
    }

    await publisher.publishBookingConfirmed(updated);
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error(`Failed to handle payment.completed event: ${err.message}`, { error: err.stack });
    throw err;
  } finally {
    client.release();
  }
}

async function handlePaymentFailed(payload) {
  const { bookingId, reason } = payload;
  logger.warn(`Payment failed for booking ${bookingId}. Reason: ${reason || 'Unknown'}. Awaiting expiry window.`);
}

async function handlePaymentRefunded(payload) {
  const { bookingId, amount } = payload;
  logger.info(`Payment refund confirmed for booking ${bookingId}. Amount: ${amount}`);
}

module.exports = {
  consumers: {
    'payment.completed': handlePaymentCompleted,
    'payment.failed': handlePaymentFailed,
    'payment.refunded': handlePaymentRefunded,
  },
  handlePaymentCompleted,
  handlePaymentFailed,
  handlePaymentRefunded,
};
