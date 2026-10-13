const { getClient, query } = require('../../../shared/db/pool');
const bookingRepository = require('../repository/bookingRepository');
const historyRepository = require('../repository/historyRepository');
const budgetRepository = require('../../event/repository/budgetRepository');
const publisher = require('./publisher');
const { vendorClient } = require('../../../clients/vendorClient');
const logger = require('../../../shared/logger');

async function handleDepositSucceeded(payload) {
  // Extract either from CloudEvents envelope or direct payload
  const data = payload.payload || payload;
  const { eventId: incomingEventId, bookingId, paymentId, amountPaise, amount } = data;
  const deduplicationKey = incomingEventId || payload.idempotencyKey || `pay_deposit_${bookingId}_${paymentId || Date.now()}`;

  // 1. Idempotency check via processed_events table
  const checkRes = await query('SELECT event_id FROM processed_events WHERE event_id = $1', [
    deduplicationKey,
  ]);
  if (checkRes.rows.length > 0) {
    logger.warn(`Event ${deduplicationKey} already processed. Skipping duplicate deposit event.`);
    return;
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // 2. Load booking
    const booking = await bookingRepository.findById(bookingId, client);
    if (!booking) {
      logger.warn(`Booking ${bookingId} not found for deposit payment event`);
      await client.query('ROLLBACK');
      return;
    }

    if (booking.status !== 'ACCEPTED') {
      logger.warn(
        `Received deposit payment for booking ${bookingId} in status '${booking.status}'. Ignoring state change.`
      );
      await client.query(
        'INSERT INTO processed_events (event_id, event_type) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [deduplicationKey, 'payment.deposit.succeeded']
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
      `Deposit payment confirmed. Payment ID: ${paymentId || 'N/A'}`,
      client
    );

    // 4. Update actual budget amount for category if present
    if (booking.category) {
      const budgetAmount = amount || (amountPaise ? amountPaise / 100 : booking.price_snapshot);
      await budgetRepository.incrementActualAmount(
        booking.event_id,
        booking.category,
        Number(budgetAmount),
        client
      );
    }

    // 5. Mark event as processed (Idempotency guarantee)
    await client.query(
      'INSERT INTO processed_events (event_id, event_type) VALUES ($1, $2)',
      [deduplicationKey, 'payment.deposit.succeeded']
    );

    await client.query('COMMIT');
    logger.info(`Booking ${bookingId} confirmed following deposit payment.`);

    // 6. External side effects: notify vendor calendar & publish booking.confirmed
    try {
      await vendorClient.book(booking.vendor_id, booking.booking_date, booking.id);
    } catch (vErr) {
      logger.error(`Vendor lock failed post-payment for booking ${bookingId}: ${vErr.message}`);
    }

    await publisher.publishBookingConfirmed(updated);
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error(`Failed to handle deposit payment event: ${err.message}`, { error: err.stack });
    throw err;
  } finally {
    client.release();
  }
}

async function handlePaymentCompleted(payload) {
  return handleDepositSucceeded(payload);
}

async function handlePaymentFailed(payload) {
  const data = payload.payload || payload;
  const { bookingId, reason } = data;
  logger.warn(`Payment failed for booking ${bookingId}. Reason: ${reason || 'Unknown'}. Awaiting expiry window.`);
}

async function handlePaymentRefunded(payload) {
  const data = payload.payload || payload;
  const { bookingId, amount, refundPaise } = data;
  logger.info(`Payment refund confirmed for booking ${bookingId}. Amount: ${refundPaise || amount}`);
}

async function handleBalanceSucceeded(payload) {
  const data = payload.payload || payload;
  const { bookingId, paymentId } = data;
  logger.info(`Balance payment confirmed for booking ${bookingId}. Payment ID: ${paymentId}`);
}

module.exports = {
  consumers: {
    'payment.deposit.succeeded': handleDepositSucceeded,
    'payment.completed': handlePaymentCompleted,
    'payment.balance.succeeded': handleBalanceSucceeded,
    'payment.failed': handlePaymentFailed,
    'payment.refund.processed': handlePaymentRefunded,
    'payment.refunded': handlePaymentRefunded,
  },
  handleDepositSucceeded,
  handlePaymentCompleted,
  handlePaymentFailed,
  handlePaymentRefunded,
  handleBalanceSucceeded,
};
