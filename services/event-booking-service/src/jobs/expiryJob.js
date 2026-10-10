const { getClient } = require('../shared/db/pool');
const bookingRepository = require('../modules/booking/repository/bookingRepository');
const historyRepository = require('../modules/booking/repository/historyRepository');
const publisher = require('../modules/booking/events/publisher');
const { vendorClient } = require('../clients/vendorClient');
const logger = require('../shared/logger');

let intervalId = null;

async function processExpiries() {
  let client;
  try {
    client = await getClient();
    // 1. Process Expired PENDING Bookings
    const expiredPending = await bookingRepository.findExpiredPending(client);
    for (const booking of expiredPending) {
      try {
        await client.query('BEGIN');
        const reason = 'Expired - Vendor did not respond within 48h window';
        const updated = await bookingRepository.updateStatus(
          booking.id,
          'REJECTED',
          { rejectionReason: reason },
          client
        );
        await historyRepository.recordTransition(
          booking.id,
          'PENDING',
          'REJECTED',
          'SYSTEM',
          reason,
          client
        );
        await client.query('COMMIT');
        logger.info(`Expired PENDING booking ${booking.id} transitioned to REJECTED.`);
        await publisher.publishBookingRejected(updated, reason);
      } catch (err) {
        await client.query('ROLLBACK');
        logger.error(`Error expiring PENDING booking ${booking.id}: ${err.message}`);
      }
    }

    // 2. Process Expired ACCEPTED Bookings (Payment window expired)
    const expiredAccepted = await bookingRepository.findExpiredAccepted(client);
    for (const booking of expiredAccepted) {
      try {
        // Release date in vendor calendar
        try {
          await vendorClient.release(booking.vendor_id, booking.booking_date, booking.id);
        } catch (rErr) {
          logger.error(`Error releasing vendor date for expired booking ${booking.id}: ${rErr.message}`);
        }

        await client.query('BEGIN');
        const reason = 'Payment window expired (24h elapsed without completed payment)';
        const updated = await bookingRepository.updateStatus(
          booking.id,
          'CANCELLED',
          {
            cancellationReason: reason,
            cancelledBy: 'SYSTEM',
          },
          client
        );
        await historyRepository.recordTransition(
          booking.id,
          'ACCEPTED',
          'CANCELLED',
          'SYSTEM',
          reason,
          client
        );
        await client.query('COMMIT');
        logger.info(`Expired ACCEPTED booking ${booking.id} transitioned to CANCELLED.`);
        await publisher.publishBookingCancelled(updated, reason, 'SYSTEM', 'ACCEPTED');
      } catch (err) {
        await client.query('ROLLBACK');
        logger.error(`Error expiring ACCEPTED booking ${booking.id}: ${err.message}`);
      }
    }
  } catch (err) {
    logger.error(`Failed to process booking expirations: ${err.message}`);
  } finally {
    if (client && typeof client.release === 'function') {
      client.release();
    }
  }
}

function startExpiryJob(intervalMs = 5 * 60 * 1000) {
  if (intervalId) return;

  logger.info(`Starting Booking Expiry Job (interval: ${intervalMs / 1000}s)...`);
  intervalId = setInterval(processExpiries, intervalMs);

  // Run initial pass after short delay
  setTimeout(processExpiries, 5000);
}

function stopExpiryJob() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('Booking Expiry Job stopped.');
  }
}

module.exports = {
  startExpiryJob,
  stopExpiryJob,
  processExpiries,
};
