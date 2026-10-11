const { getClient } = require('../../../shared/db/pool');
const bookingRepository = require('../repository/bookingRepository');
const historyRepository = require('../repository/historyRepository');
const eventRepository = require('../../event/repository/eventRepository');
const { validateTransition, BOOKING_STATUS } = require('../stateMachine');
const { vendorClient } = require('../../../clients/vendorClient');
const publisher = require('../events/publisher');
const logger = require('../../../shared/logger');

class BookingService {
  async createBooking(customerId, data) {
    const { event_id: eventId, vendor_id: vendorId, service_id: serviceId, package_id: packageId, category } = data;

    // 1. Verify Event ownership and status
    const event = await eventRepository.findById(eventId);
    if (!event) {
      const err = new Error(`Event ${eventId} not found`);
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (event.customer_id !== customerId) {
      const err = new Error('You can only create bookings for your own events');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    if (event.status === 'CANCELLED' || event.status === 'COMPLETED') {
      const err = new Error(`Cannot book services for an event in ${event.status} status`);
      err.status = 400;
      err.code = 'INVALID_EVENT_STATE';
      throw err;
    }

    const bookingDate = event.event_date;

    // 2. Validate Vendor, Service, and Package with vendor-service (or mock)
    const vendorValidation = await vendorClient.validate(vendorId, serviceId, packageId);

    // 3. Check Vendor Availability for event date
    const availability = await vendorClient.checkAvailability(vendorId, bookingDate);
    if (!availability.available) {
      const err = new Error(`Vendor is not available on ${bookingDate}: ${availability.reason || 'Already booked'}`);
      err.status = 409;
      err.code = 'VENDOR_UNAVAILABLE';
      throw err;
    }

    // 4. Calculate vendor response deadline: now + 48 hours
    const vendorResponseDueAt = new Date();
    vendorResponseDueAt.setHours(vendorResponseDueAt.getHours() + 48);

    const client = await getClient();
    try {
      await client.query('BEGIN');

      const effectivePrice =
        data.custom_price !== undefined && Number(data.custom_price) > 0
          ? Number(data.custom_price)
          : vendorValidation.price;
      const effectivePackageName = data.custom_package_name || vendorValidation.packageName;

      // 5. Insert Booking record
      const booking = await bookingRepository.createBooking(
        {
          eventId,
          customerId,
          vendorId,
          serviceId,
          packageId,
          category: category || vendorValidation.category || null,
          bookingDate,
          vendorNameSnapshot: vendorValidation.vendorName,
          packageNameSnapshot: effectivePackageName,
          priceSnapshot: effectivePrice,
          vendorResponseDueAt,
          items: data.items || [],
        },
        client
      );

      // 6. Record Initial History
      await historyRepository.recordTransition(
        booking.id,
        null,
        BOOKING_STATUS.PENDING,
        customerId,
        'Booking requested by customer',
        client
      );

      await client.query('COMMIT');
      logger.info(`Booking created: ${booking.id}`, { bookingId: booking.id, customerId, vendorId });

      // 7. Publish Async Event
      await publisher.publishBookingCreated(booking);

      return {
        ...booking,
        price_snapshot: Number(booking.price_snapshot),
        items: data.items || booking.items || [],
      };
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.code === '23505') {
        // Unique violation (e.g. partial index for active service booking)
        const dupError = new Error('An active booking for this service already exists in this event');
        dupError.status = 409;
        dupError.code = 'ALREADY_BOOKED';
        throw dupError;
      }
      throw err;
    } finally {
      client.release();
    }
  }

  async getBookingById(bookingId, user) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      const err = new Error(`Booking ${bookingId} not found`);
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    // Ownership check: customer, assigned vendor, or admin
    if (user.role === 'customer' && booking.customer_id !== user.id) {
      const err = new Error('Forbidden');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    if (user.role === 'vendor') {
      const vendor = await vendorClient.getVendorByUserId(user.id);
      if (vendor && booking.vendor_id !== vendor.id) {
        const err = new Error('Forbidden: Booking is not assigned to your vendor profile');
        err.status = 403;
        err.code = 'FORBIDDEN';
        throw err;
      }
    }

    const history = await historyRepository.findByBookingId(bookingId);

    return {
      ...booking,
      price_snapshot: Number(booking.price_snapshot),
      history,
    };
  }

  async listCustomerBookings(customerId, query = {}) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '10', 10)));
    const offset = (page - 1) * limit;

    const filter = {
      status: query.status || null,
      eventId: query.event_id || null,
    };

    const [bookings, total] = await Promise.all([
      bookingRepository.findByCustomerId(customerId, filter, limit, offset),
      bookingRepository.countByCustomerId(customerId, filter),
    ]);

    return {
      data: bookings.map((b) => ({
        ...b,
        price_snapshot: Number(b.price_snapshot),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async listVendorBookings(user, query = {}) {
    const vendor = await vendorClient.getVendorByUserId(user.id);
    const vendorId = vendor ? vendor.id : 'vnd_456';

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '10', 10)));
    const offset = (page - 1) * limit;

    const filter = {
      status: query.status || null,
    };

    const [bookings, total] = await Promise.all([
      bookingRepository.findByVendorId(vendorId, filter, limit, offset),
      bookingRepository.countByVendorId(vendorId, filter),
    ]);

    return {
      data: bookings.map((b) => ({
        ...b,
        price_snapshot: Number(b.price_snapshot),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async acceptBooking(bookingId, user) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      const err = new Error(`Booking ${bookingId} not found`);
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    // Verify vendor identity
    if (user.role !== 'admin') {
      const vendor = await vendorClient.getVendorByUserId(user.id);
      if (vendor && booking.vendor_id !== vendor.id) {
        const err = new Error('Only the assigned vendor can accept this booking');
        err.status = 403;
        err.code = 'FORBIDDEN';
        throw err;
      }
    }

    validateTransition(booking.status, BOOKING_STATUS.ACCEPTED);

    // Call vendorClient.hold to lock calendar date
    await vendorClient.hold(booking.vendor_id, booking.booking_date, booking.id);

    // Set payment window deadline: now + 24 hours
    const paymentDueAt = new Date();
    paymentDueAt.setHours(paymentDueAt.getHours() + 24);

    const client = await getClient();
    try {
      await client.query('BEGIN');

      const updated = await bookingRepository.updateStatus(
        booking.id,
        BOOKING_STATUS.ACCEPTED,
        { paymentDueAt },
        client
      );

      await historyRepository.recordTransition(
        booking.id,
        booking.status,
        BOOKING_STATUS.ACCEPTED,
        user.id,
        'Booking accepted by vendor. Calendar date held.',
        client
      );

      await client.query('COMMIT');

      await publisher.publishBookingAccepted(updated);
      return {
        ...updated,
        price_snapshot: Number(updated.price_snapshot),
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async rejectBooking(bookingId, user, reason) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      const err = new Error(`Booking ${bookingId} not found`);
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (user.role !== 'admin') {
      const vendor = await vendorClient.getVendorByUserId(user.id);
      if (vendor && booking.vendor_id !== vendor.id) {
        const err = new Error('Only the assigned vendor can reject this booking');
        err.status = 403;
        err.code = 'FORBIDDEN';
        throw err;
      }
    }

    validateTransition(booking.status, BOOKING_STATUS.REJECTED);

    const client = await getClient();
    try {
      await client.query('BEGIN');

      const updated = await bookingRepository.updateStatus(
        booking.id,
        BOOKING_STATUS.REJECTED,
        { rejectionReason: reason },
        client
      );

      await historyRepository.recordTransition(
        booking.id,
        booking.status,
        BOOKING_STATUS.REJECTED,
        user.id,
        reason,
        client
      );

      await client.query('COMMIT');

      await publisher.publishBookingRejected(updated, reason);
      return {
        ...updated,
        price_snapshot: Number(updated.price_snapshot),
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async cancelBooking(bookingId, user, reason) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      const err = new Error(`Booking ${bookingId} not found`);
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    // Access check: owner customer, assigned vendor, or admin
    if (user.role === 'customer' && booking.customer_id !== user.id) {
      const err = new Error('Forbidden');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    if (user.role === 'vendor') {
      const vendor = await vendorClient.getVendorByUserId(user.id);
      if (vendor && booking.vendor_id !== vendor.id) {
        const err = new Error('Forbidden');
        err.status = 403;
        err.code = 'FORBIDDEN';
        throw err;
      }
    }

    validateTransition(booking.status, BOOKING_STATUS.CANCELLED);

    // If date was held or booked, release it with vendor service
    if (booking.status === 'ACCEPTED' || booking.status === 'CONFIRMED') {
      try {
        await vendorClient.release(booking.vendor_id, booking.booking_date, booking.id);
      } catch (rErr) {
        logger.error(`Vendor date release failed during cancellation: ${rErr.message}`);
      }
    }

    const previousStatus = booking.status;
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const updated = await bookingRepository.updateStatus(
        booking.id,
        BOOKING_STATUS.CANCELLED,
        {
          cancellationReason: reason,
          cancelledBy: user.role.toUpperCase(),
        },
        client
      );

      await historyRepository.recordTransition(
        booking.id,
        previousStatus,
        BOOKING_STATUS.CANCELLED,
        user.id,
        reason,
        client
      );

      await client.query('COMMIT');

      await publisher.publishBookingCancelled(updated, reason, user.role.toUpperCase(), previousStatus);
      return {
        ...updated,
        price_snapshot: Number(updated.price_snapshot),
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async completeBooking(bookingId, user) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      const err = new Error(`Booking ${bookingId} not found`);
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (user.role !== 'admin') {
      const vendor = await vendorClient.getVendorByUserId(user.id);
      if (vendor && booking.vendor_id !== vendor.id) {
        const err = new Error('Only the assigned vendor can mark this booking as completed');
        err.status = 403;
        err.code = 'FORBIDDEN';
        throw err;
      }
    }

    validateTransition(booking.status, BOOKING_STATUS.COMPLETED);

    // Enforce rule: today >= booking_date
    const today = new Date().toISOString().split('T')[0];
    const bDate = typeof booking.booking_date === 'string'
      ? booking.booking_date.split('T')[0]
      : new Date(booking.booking_date).toISOString().split('T')[0];

    if (today < bDate) {
      const err = new Error(`Cannot complete booking before the event date (${bDate})`);
      err.status = 400;
      err.code = 'DATE_PREMATURE';
      err.details = [{ eventDate: bDate, currentDate: today }];
      throw err;
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      const updated = await bookingRepository.updateStatus(
        booking.id,
        BOOKING_STATUS.COMPLETED,
        {},
        client
      );

      await historyRepository.recordTransition(
        booking.id,
        booking.status,
        BOOKING_STATUS.COMPLETED,
        user.id,
        'Service successfully completed by vendor',
        client
      );

      await client.query('COMMIT');

      await publisher.publishBookingCompleted(updated);
      return {
        ...updated,
        price_snapshot: Number(updated.price_snapshot),
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getInternalBooking(bookingId) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      const err = new Error(`Booking ${bookingId} not found`);
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    return {
      id: booking.id,
      event_id: booking.event_id,
      customer_id: booking.customer_id,
      vendor_id: booking.vendor_id,
      amount: Number(booking.price_snapshot),
      status: booking.status,
      date: booking.booking_date,
    };
  }
}

module.exports = new BookingService();
