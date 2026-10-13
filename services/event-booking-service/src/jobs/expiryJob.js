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
    // 1. Process Expired PENDING / REQUESTED Bookings
    const expiredPending = await bookingRepository.findExpiredPending(client);
    for (const booking of expiredPending) {
      try {
        // Release hold with vendor
        try {
          await vendorClient.release(booking.vendor_id, booking.booking_date, booking.id);
        } catch (rErr) {
          logger.warn(`Error releasing hold for expired booking ${booking.id}: ${rErr.message}`);
        }

        await client.query('BEGIN');
        const reason = 'Response window expired (vendor did not respond within required window)';
        const updated = await bookingRepository.updateStatus(
          booking.id,
          'EXPIRED',
          { rejectionReason: reason },
          client
        );
        await historyRepository.recordTransition(
          booking.id,
          booking.status,
          'EXPIRED',
          'SYSTEM',
          reason,
          client
        );
        await client.query('COMMIT');
        logger.info(`Expired booking ${booking.id} (${booking.status}) transitioned to EXPIRED.`);
        await publisher.publishBookingExpired(updated, booking.status, reason);
      } catch (err) {
        await client.query('ROLLBACK');
        logger.error(`Error expiring booking ${booking.id}: ${err.message}`);
      }
    }

    // 2. Process Expired ACCEPTED Bookings (Deposit payment window expired)
    const expiredAccepted = await bookingRepository.findExpiredAccepted(client);
    for (const booking of expiredAccepted) {
      try {
        // Release hold in vendor calendar
        try {
          await vendorClient.release(booking.vendor_id, booking.booking_date, booking.id);
        } catch (rErr) {
          logger.error(`Error releasing vendor date for expired booking ${booking.id}: ${rErr.message}`);
        }

        await client.query('BEGIN');
        const reason = 'Deposit payment window expired (2 hours elapsed without payment)';
        const updated = await bookingRepository.updateStatus(
          booking.id,
          'EXPIRED',
          {
            cancellationReason: reason,
            cancelledBy: 'SYSTEM',
          },
          client
        );
        await historyRepository.recordTransition(
          booking.id,
          'ACCEPTED',
          'EXPIRED',
          'SYSTEM',
          reason,
          client
        );
        await client.query('COMMIT');
        logger.info(`Expired ACCEPTED booking ${booking.id} transitioned to EXPIRED.`);
        await publisher.publishBookingExpired(updated, 'ACCEPTED', reason);
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
