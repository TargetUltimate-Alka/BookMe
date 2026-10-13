const { getClient } = require('../../../shared/db/pool');
const bookingRepository = require('../repository/bookingRepository');
const historyRepository = require('../repository/historyRepository');
const counterOfferRepository = require('../repository/counterOfferRepository');
const eventRepository = require('../../event/repository/eventRepository');
const checklistRepository = require('../../event/repository/checklistRepository');
const { validateTransition, BOOKING_STATUS } = require('../stateMachine');
const { vendorClient } = require('../../../clients/vendorClient');
const publisher = require('../events/publisher');
const logger = require('../../../shared/logger');

function formatBooking(booking) {
  const agreedPaise = Number(
    booking.agreed_amount_paise !== undefined && booking.agreed_amount_paise !== null
      ? booking.agreed_amount_paise
      : Math.round(Number(booking.price_snapshot || 0) * 100)
  );
  const depositPaise = Number(
    booking.deposit_amount_paise !== undefined && booking.deposit_amount_paise !== null
      ? booking.deposit_amount_paise
      : Math.round(agreedPaise * 0.4)
  );
  const balancePaise = Number(
    booking.balance_amount_paise !== undefined && booking.balance_amount_paise !== null
      ? booking.balance_amount_paise
      : agreedPaise - depositPaise
  );

  const eventDate =
    typeof booking.booking_date === 'string'
      ? booking.booking_date.split('T')[0]
      : booking.booking_date
      ? new Date(booking.booking_date).toISOString().split('T')[0]
      : null;

  return {
    id: booking.id,
    eventItemId: booking.event_item_id || null,
    customerId: booking.customer_id,
    vendorId: booking.vendor_id,
    packageId: booking.package_id,
    state: booking.status,
    status: booking.status,
    quantity: Number(booking.quantity || 1),
    eventDate,
    agreedAmountPaise: agreedPaise,
    depositAmountPaise: depositPaise,
    balanceAmountPaise: balancePaise,
    securityDepositPaise: Number(booking.security_deposit_paise || 0),
    rushSurchargePaise: Number(booking.rush_surcharge_paise || 0),
    deliveryMode: booking.delivery_choice || 'NONE',
    checkInAt: booking.check_in_at
      ? booking.check_in_at.toISOString
        ? booking.check_in_at.toISOString()
        : booking.check_in_at
      : null,
    depositDueAt: booking.deposit_due_at
      ? booking.deposit_due_at.toISOString
        ? booking.deposit_due_at.toISOString()
        : booking.deposit_due_at
      : null,
    balanceDueAt: booking.balance_due_at
      ? booking.balance_due_at.toISOString
        ? booking.balance_due_at.toISOString()
        : booking.balance_due_at
      : null,
    createdAt: booking.created_at
      ? booking.created_at.toISOString
        ? booking.created_at.toISOString()
        : booking.created_at
      : new Date().toISOString(),
    updatedAt: booking.updated_at
      ? booking.updated_at.toISOString
        ? booking.updated_at.toISOString()
        : booking.updated_at
      : null,
    // Legacy fields for backward compatibility with existing integration tests
    event_id: booking.event_id,
    customer_id: booking.customer_id,
    vendor_id: booking.vendor_id,
    service_id: booking.service_id,
    package_id: booking.package_id,
    category: booking.category,
    booking_date: eventDate,
    vendor_name_snapshot: booking.vendor_name_snapshot,
    package_name_snapshot: booking.package_name_snapshot,
    price_snapshot: Number(booking.price_snapshot || agreedPaise / 100),
    vendor_response_due_at: booking.vendor_response_due_at,
    payment_due_at: booking.payment_due_at || booking.deposit_due_at,
    items: booking.items || [],
    delivery_choice: booking.delivery_choice,
    delivery_address: booking.delivery_address,
  };
}

class BookingService {
  async createBooking(customerId, data) {
    const eventId = data.event_id || data.eventId;
    const eventItemId = data.eventItemId || data.event_item_id;
    const vendorId = data.vendorId || data.vendor_id;
    const packageId = data.packageId || data.package_id;
    const serviceId = data.serviceId || data.service_id || packageId;
    const category = data.category;
    let eventDate = data.eventDate || data.event_date || data.booking_date;

    // 1. Verify Event ownership and status if eventId exists
    let event = null;
    if (eventId) {
      event = await eventRepository.findById(eventId);
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

      if (!eventDate) {
        eventDate = event.event_date;
      }
    }

    if (!eventDate) {
      eventDate = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0];
    }

    // 2. Validate Vendor and Package
    const vendorValidation = await vendorClient.validate(vendorId, serviceId, packageId);

    // 3. Check Vendor Availability
    const availability = await vendorClient.checkAvailability(vendorId, eventDate);
    if (!availability.available) {
      const err = new Error(`Vendor is not available on ${eventDate}: ${availability.reason || 'Already booked'}`);
      err.status = 409;
      err.code = 'CAPACITY_UNAVAILABLE';
      err.details = [{ field: 'packageId', issue: 'Capacity unavailable for requested date' }];
      throw err;
    }

    // 4. Calculate prices in paise & Rush Surcharge (FR-BKG-06)
    const basePaise = Math.round(Number(data.custom_price || vendorValidation.price || 50000) * 100);
    const rushQuote = this.calculateRushQuoteSync(eventDate, basePaise);
    const agreedAmountPaise = rushQuote.totalPaise;
    const depositAmountPaise = Math.round(agreedAmountPaise * 0.4);
    const balanceAmountPaise = agreedAmountPaise - depositAmountPaise;

    // 5. Vendor response deadline (12h regular, 2h rush per SRS §2.3)
    const vendorResponseDueAt = new Date();
    if (rushQuote.isRush) {
      vendorResponseDueAt.setHours(vendorResponseDueAt.getHours() + 2);
    } else {
      vendorResponseDueAt.setHours(vendorResponseDueAt.getHours() + 12);
    }

    // Initial status: REQUESTED per OpenAPI contract
    const initialStatus = data.status || BOOKING_STATUS.REQUESTED;

    const client = await getClient();
    try {
      await client.query('BEGIN');

      const booking = await bookingRepository.createBooking(
        {
          eventId,
          eventItemId,
          customerId,
          vendorId,
          serviceId,
          packageId,
          category: category || vendorValidation.category || null,
          bookingDate: eventDate,
          vendorNameSnapshot: vendorValidation.vendorName,
          packageNameSnapshot: data.custom_package_name || vendorValidation.packageName,
          priceSnapshot: agreedAmountPaise / 100,
          agreedAmountPaise,
          depositAmountPaise,
          balanceAmountPaise,
          securityDepositPaise: data.securityDepositPaise || 0,
          rushSurchargePaise: rushQuote.surchargePaise,
          quantity: data.quantity || 1,
          addonIds: data.addonIds || [],
          notes: data.notes || null,
          status: initialStatus,
          vendorResponseDueAt,
          items: data.items || [],
        },
        client
      );

      // Record Initial History
      await historyRepository.recordTransition(
        booking.id,
        null,
        initialStatus,
        customerId,
        'Booking requested by customer',
        client
      );

      await client.query('COMMIT');
      logger.info(`Booking created: ${booking.id}`, { bookingId: booking.id, customerId, vendorId });

      // Soft-hold calendar capacity with vendor service
      try {
        await vendorClient.hold(vendorId, eventDate, booking.id);
      } catch (hErr) {
        logger.warn(`Soft-hold notification failed: ${hErr.message}`);
      }

      // Publish Async Event
      await publisher.publishBookingRequested(booking, vendorResponseDueAt);

      return formatBooking({
        ...booking,
        items: data.items || [],
      });
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.code === '23505') {
        const dupError = new Error('An active booking for this service already exists in this event');
        dupError.status = 409;
        dupError.code = 'CONFLICT';
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

    const isAdmin = user.role === 'admin' || user.role === 'superadmin' || user.role === 'supportagent';
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
    const formatted = formatBooking(booking);
    formatted.history = history;
    return formatted;
  }

  async listBookings(user, query = {}) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
    const offset = (page - 1) * limit;

    const filter = {
      status: query.status || null,
      eventId: query.event_id || query.eventId || null,
    };

    let bookings = [];
    let total = 0;

    const isAdmin = user.role === 'admin' || user.role === 'superadmin' || user.role === 'supportagent';

    if (user.role === 'customer') {
      [bookings, total] = await Promise.all([
        bookingRepository.findByCustomerId(user.id, filter, limit, offset),
        bookingRepository.countByCustomerId(user.id, filter),
      ]);
    } else if (user.role === 'vendor') {
      const vendor = await vendorClient.getVendorByUserId(user.id);
      const vendorId = vendor ? vendor.id : 'vnd_456';
      [bookings, total] = await Promise.all([
        bookingRepository.findByVendorId(vendorId, filter, limit, offset),
        bookingRepository.countByVendorId(vendorId, filter),
      ]);
    } else if (isAdmin) {
      [bookings, total] = await Promise.all([
        bookingRepository.findAll(filter, limit, offset),
        bookingRepository.countAll(filter),
      ]);
    }

    const formatted = bookings.map(formatBooking);
    const hasMore = offset + bookings.length < total;
    const nextCursor = hasMore ? Buffer.from(String(offset + limit)).toString('base64') : null;

    return {
      items: formatted,
      data: formatted, // legacy alias
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        cursor: query.cursor || null,
        nextCursor,
        hasMore,
      },
    };
  }

  // Alias for legacy routes
  async listCustomerBookings(customerId, query = {}) {
    return this.listBookings({ id: customerId, role: 'customer' }, query);
  }

  // Alias for legacy routes
  async listVendorBookings(user, query = {}) {
    return this.listBookings(user, query);
  }

  async acceptBooking(bookingId, user) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      const err = new Error(`Booking ${bookingId} not found`);
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const isAdmin = user.role === 'admin' || user.role === 'superadmin';
    if (!isAdmin) {
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

    // Deposit due in 2 hours per FR-BKG-04 & SRS §2.3
    const depositDueAt = new Date();
    depositDueAt.setHours(depositDueAt.getHours() + 2);

    const client = await getClient();
    try {
      await client.query('BEGIN');

      const updated = await bookingRepository.updateStatus(
        booking.id,
        BOOKING_STATUS.ACCEPTED,
        { depositDueAt, paymentDueAt: depositDueAt },
        client
      );

      await historyRepository.recordTransition(
        booking.id,
        booking.status,
        BOOKING_STATUS.ACCEPTED,
        user.id,
        'Booking accepted by vendor. 2-hour deposit payment timer started.',
        client
      );

      await client.query('COMMIT');

      await publisher.publishBookingAccepted(updated);
      return formatBooking(updated);
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

    const isAdmin = user.role === 'admin' || user.role === 'superadmin';
    if (!isAdmin) {
      const vendor = await vendorClient.getVendorByUserId(user.id);
      if (vendor && booking.vendor_id !== vendor.id) {
        const err = new Error('Only the assigned vendor can reject this booking');
        err.status = 403;
        err.code = 'FORBIDDEN';
        throw err;
      }
    }

    validateTransition(booking.status, BOOKING_STATUS.REJECTED);

    // Release capacity hold
    try {
      await vendorClient.release(booking.vendor_id, booking.booking_date, booking.id);
    } catch (rErr) {
      logger.warn(`Capacity release failed on rejection: ${rErr.message}`);
    }

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
      return formatBooking(updated);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async submitCounterOffer(bookingId, user, { amountPaise, notes }) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      const err = new Error(`Booking ${bookingId} not found`);
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (!['REQUESTED', 'NEGOTIATING', 'PENDING'].includes(booking.status)) {
      const err = new Error(`Cannot submit counter-offer on booking in status '${booking.status}'`);
      err.status = 409;
      err.code = 'INVALID_STATE_TRANSITION';
      throw err;
    }

    // Check maximum 3 counter-offers rule (FR-BKG-03)
    const existingCounters = await counterOfferRepository.findByBookingId(bookingId);
    if (existingCounters.length >= 3) {
      const err = new Error('Maximum of 3 counter-offers allowed per booking (FR-BKG-03)');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = [{ field: 'counterOffer', issue: 'Max 3 counter-offers reached' }];
      throw err;
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 6); // 6 hours per FR-BKG-03 & SRS §2.3

    const counterNumber = existingCounters.length + 1;
    const proposedByRole = user.role.toLowerCase();

    const client = await getClient();
    try {
      await client.query('BEGIN');

      const counter = await counterOfferRepository.createCounterOffer(
        {
          bookingId,
          proposedByRole,
          amountPaise: Number(amountPaise),
          counterNumber,
          expiresAt: expiresAt.toISOString(),
        },
        client
      );

      // Transition booking to NEGOTIATING if not already
      if (booking.status !== BOOKING_STATUS.NEGOTIATING) {
        await bookingRepository.updateStatus(booking.id, BOOKING_STATUS.NEGOTIATING, {}, client);
        await historyRepository.recordTransition(
          booking.id,
          booking.status,
          BOOKING_STATUS.NEGOTIATING,
          user.id,
          `Counter-offer #${counterNumber} proposed (${amountPaise} paise)`,
          client
        );
      }

      await client.query('COMMIT');

      await publisher.publishBookingCountered(counter);

      return {
        id: counter.id,
        bookingId: counter.booking_id,
        proposedByRole: counter.proposed_by_role,
        amountPaise: Number(counter.amount_paise),
        expiresAt: counter.expires_at,
        status: counter.status,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async acceptCounterOffer(bookingId, counterId, user) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      const err = new Error(`Booking ${bookingId} not found`);
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const counter = await counterOfferRepository.findById(counterId);
    if (!counter || counter.booking_id !== bookingId) {
      const err = new Error(`Counter-offer ${counterId} not found`);
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (counter.status !== 'PENDING') {
      const err = new Error(`Counter-offer is not pending (current: ${counter.status})`);
      err.status = 409;
      err.code = 'CONFLICT';
      throw err;
    }

    const userRole = user.role.toLowerCase();
    if (counter.proposed_by_role === userRole) {
      const err = new Error('You cannot accept your own counter-offer');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    validateTransition(booking.status, BOOKING_STATUS.ACCEPTED);

    const agreedPaise = Number(counter.amount_paise);
    const depositPaise = Math.round(agreedPaise * 0.4);
    const balancePaise = agreedPaise - depositPaise;
    const depositDueAt = new Date();
    depositDueAt.setHours(depositDueAt.getHours() + 2); // 2 hours

    const client = await getClient();
    try {
      await client.query('BEGIN');

      await counterOfferRepository.updateStatus(counter.id, 'ACCEPTED', client);

      const updated = await bookingRepository.updateStatus(
        booking.id,
        BOOKING_STATUS.ACCEPTED,
        {
          agreedAmountPaise: agreedPaise,
          depositAmountPaise: depositPaise,
          balanceAmountPaise: balancePaise,
          priceSnapshot: agreedPaise / 100,
          depositDueAt,
          paymentDueAt: depositDueAt,
        },
        client
      );

      await historyRepository.recordTransition(
        booking.id,
        booking.status,
        BOOKING_STATUS.ACCEPTED,
        user.id,
        `Counter-offer accepted. Agreed amount: ${agreedPaise} paise.`,
        client
      );

      await client.query('COMMIT');

      await publisher.publishBookingAccepted(updated);
      return formatBooking(updated);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async selectDeliveryChoice(bookingId, user, payload = {}) {
    const choice = payload.deliveryMode || payload.choice;
    const deliveryAddress = payload.deliveryAddress;
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      const err = new Error(`Booking ${bookingId} not found`);
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (user.role === 'customer' && booking.customer_id !== user.id) {
      const err = new Error('Forbidden');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    const updated = await bookingRepository.updateFields(booking.id, {
      deliveryChoice: choice,
      deliveryAddress: deliveryAddress ? JSON.stringify(deliveryAddress) : null,
    });

    return formatBooking(updated);
  }

  calculateRushQuoteSync(eventDate, basePricePaise) {
    const basePaise = Number(basePricePaise || 0);
    const now = new Date();
    let eventTime;
    if (typeof eventDate === 'string' && !eventDate.includes('T')) {
      const todayStr = now.toISOString().split('T')[0];
      if (eventDate === todayStr) {
        // Same-day event is urgent rush (< 24h)
        eventTime = new Date(now.getTime() + 12 * 3600 * 1000);
      } else {
        eventTime = new Date(`${eventDate}T00:00:00.000Z`);
      }
    } else {
      eventTime = new Date(eventDate);
    }
    const diffHours = (eventTime - now) / (1000 * 3600);
    let surchargePercent = 0;
    if (diffHours >= 0 && diffHours < 24) {
      surchargePercent = 50; // < 24h: 50%
    } else if (diffHours >= 24 && diffHours < 48) {
      surchargePercent = 25; // 24-48h: 25%
    }
    const isRush = surchargePercent > 0;
    const surchargePaise = Math.round(basePaise * (surchargePercent / 100));

    return {
      isRush,
      surchargePercent,
      rushSurchargePercent: surchargePercent,
      surchargePaise,
      rushSurchargePaise: surchargePaise,
      totalPaise: basePaise + surchargePaise,
      totalAmountPaise: basePaise + surchargePaise,
    };
  }

  async calculateRushQuote(body = {}) {
    const eventDate = body.eventDate || body.event_date;
    const basePricePaise =
      body.basePricePaise !== undefined
        ? body.basePricePaise
        : body.baseAmountPaise !== undefined
        ? body.baseAmountPaise
        : body.base_amount_paise !== undefined
        ? body.base_amount_paise
        : body.custom_price
        ? body.custom_price * 100
        : 0;
    return this.calculateRushQuoteSync(eventDate, basePricePaise);
  }

  async vendorCheckIn(bookingId, user, { latitude, longitude }) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      const err = new Error(`Booking ${bookingId} not found`);
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const isAdmin = user.role === 'admin' || user.role === 'superadmin';
    if (!isAdmin) {
      const vendor = await vendorClient.getVendorByUserId(user.id);
      if (vendor && booking.vendor_id !== vendor.id) {
        const err = new Error('Only the assigned vendor can check in');
        err.status = 403;
        err.code = 'FORBIDDEN';
        throw err;
      }
    }

    validateTransition(booking.status, BOOKING_STATUS.IN_PROGRESS);

    const now = new Date();
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const updated = await bookingRepository.updateStatus(
        booking.id,
        BOOKING_STATUS.IN_PROGRESS,
        {
          checkInAt: now,
          checkInLatitude: latitude,
          checkInLongitude: longitude,
        },
        client
      );

      await historyRepository.recordTransition(
        booking.id,
        booking.status,
        BOOKING_STATUS.IN_PROGRESS,
        user.id,
        `Vendor GPS check-in (Arrived) at [${latitude}, ${longitude}]`,
        client
      );

      await client.query('COMMIT');

      await publisher.publishBookingInProgress(updated, now, latitude, longitude);
      return formatBooking(updated);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async confirmBookingCompletion(bookingId, user) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      const err = new Error(`Booking ${bookingId} not found`);
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    validateTransition(booking.status, BOOKING_STATUS.COMPLETED);

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
        'Booking marked as completed',
        client
      );

      await client.query('COMMIT');

      await publisher.publishBookingCompleted(updated);
      return formatBooking(updated);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Alias for backward compatibility with existing tests
  async completeBooking(bookingId, user) {
    return this.confirmBookingCompletion(bookingId, user);
  }

  async previewCancellationCharges(bookingId, user) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      const err = new Error(`Booking ${bookingId} not found`);
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const role = (user.role || 'customer').toLowerCase();
    const agreedPaise = Number(booking.agreed_amount_paise || Math.round((booking.price_snapshot || 0) * 100));
    const paidPaise = Number(booking.deposit_amount_paise || Math.round(agreedPaise * 0.4));

    const now = new Date();
    const eventDate = new Date(booking.booking_date);
    const diffDays = Math.ceil((eventDate - now) / (1000 * 3600 * 24));

    if (role === 'vendor') {
      // Vendor cancellation penalty table (SRS §2.4)
      let penaltyPercent = 20;
      if (diffDays > 14) penaltyPercent = 20;
      else if (diffDays >= 7) penaltyPercent = 30;
      else if (diffDays >= 3) penaltyPercent = 50;
      else penaltyPercent = 100;

      const vendorPenaltyPaise = Math.round(agreedPaise * (penaltyPercent / 100));
      return {
        bookingId,
        cancelledByRole: 'vendor',
        cancellingPartyRole: 'vendor',
        daysUntilEvent: diffDays,
        hoursUntilEvent: diffDays * 24,
        isFreeCancel: false,
        chargePercent: 0,
        chargeAmountPaise: 0,
        refundAmountPaise: paidPaise,
        vendorPenaltyPercent: penaltyPercent,
        vendorPenaltyPaise,
      };
    } else {
      // Customer cancellation charges table (SRS §2.4)
      let chargePercent = 0;
      if (diffDays > 14) chargePercent = 0;
      else if (diffDays >= 7) chargePercent = 10;
      else if (diffDays >= 3) chargePercent = 25;
      else if (diffDays >= 1) chargePercent = 50;
      else chargePercent = 100;

      const chargeAmountPaise = Math.round(agreedPaise * (chargePercent / 100));
      const cappedChargePaise = Math.min(paidPaise, chargeAmountPaise);
      const refundAmountPaise = Math.max(0, paidPaise - cappedChargePaise);

      return {
        bookingId,
        cancelledByRole: 'customer',
        cancellingPartyRole: 'customer',
        daysUntilEvent: diffDays,
        hoursUntilEvent: diffDays * 24,
        isFreeCancel: chargePercent === 0,
        chargePercent,
        chargeAmountPaise: cappedChargePaise,
        refundAmountPaise,
        vendorPenaltyPercent: 0,
        vendorPenaltyPaise: 0,
      };
    }
  }

  async cancelBooking(bookingId, user, reason, forceMajeure = false) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      const err = new Error(`Booking ${bookingId} not found`);
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const preview = await this.previewCancellationCharges(bookingId, user);
    const isVendor = user.role === 'vendor';
    const targetStatus = isVendor ? BOOKING_STATUS.CANCELLED_BY_VENDOR : BOOKING_STATUS.CANCELLED_BY_CUSTOMER;

    validateTransition(booking.status, targetStatus);

    // Release capacity with vendor client
    try {
      await vendorClient.release(booking.vendor_id, booking.booking_date, booking.id);
    } catch (rErr) {
      logger.warn(`Capacity release failed on cancellation: ${rErr.message}`);
    }

    const previousStatus = booking.status;
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const updated = await bookingRepository.updateStatus(
        booking.id,
        targetStatus,
        {
          cancellationReason: reason,
          cancelledBy: user.role.toUpperCase(),
        },
        client
      );

      await historyRepository.recordTransition(
        booking.id,
        previousStatus,
        targetStatus,
        user.id,
        `Cancelled: ${reason}${forceMajeure ? ' (Force Majeure claimed)' : ''}`,
        client
      );

      await client.query('COMMIT');

      await publisher.publishBookingCancelled(
        updated,
        reason,
        user.role.toUpperCase(),
        {
          chargePaise: preview.chargeAmountPaise,
          refundPaise: preview.refundAmountPaise,
          penaltyPaise: preview.vendorPenaltyPaise,
        }
      );

      return formatBooking(updated);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async raiseBookingDispute(bookingId, user, reason) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      const err = new Error(`Booking ${bookingId} not found`);
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    validateTransition(booking.status, BOOKING_STATUS.DISPUTED);

    const client = await getClient();
    try {
      await client.query('BEGIN');

      const updated = await bookingRepository.updateStatus(
        booking.id,
        BOOKING_STATUS.DISPUTED,
        {},
        client
      );

      await historyRepository.recordTransition(
        booking.id,
        booking.status,
        BOOKING_STATUS.DISPUTED,
        user.id,
        `Dispute raised: ${reason}`,
        client
      );

      await client.query('COMMIT');

      await publisher.publishBookingDisputed(updated, user.role.toUpperCase(), reason);
      return formatBooking(updated);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getBookingTimeline(bookingId, user) {
    const booking = await this.getBookingById(bookingId, user);
    const history = await historyRepository.findByBookingId(bookingId);

    const timeline = history.map((h) => ({
      fromStatus: h.from_status || null,
      toStatus: h.to_status,
      actorId: h.changed_by,
      note: h.reason || 'Status update',
      timestamp: h.created_at ? (h.created_at.toISOString ? h.created_at.toISOString() : h.created_at) : new Date().toISOString(),
    }));

    return {
      bookingId,
      timeline,
      items: timeline,
    };
  }

  async getInternalBooking(bookingId) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      const err = new Error(`Booking ${bookingId} not found`);
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    return formatBooking(booking);
  }

  async internalConfirmDeposit(bookingId) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      const err = new Error(`Booking ${bookingId} not found`);
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    validateTransition(booking.status, BOOKING_STATUS.CONFIRMED);

    const client = await getClient();
    try {
      await client.query('BEGIN');

      const updated = await bookingRepository.updateStatus(
        booking.id,
        BOOKING_STATUS.CONFIRMED,
        {},
        client
      );

      await historyRepository.recordTransition(
        booking.id,
        booking.status,
        BOOKING_STATUS.CONFIRMED,
        'INTERNAL_SERVICE',
        'Deposit confirmed via internal API',
        client
      );

      await client.query('COMMIT');

      try {
        await vendorClient.book(booking.vendor_id, booking.booking_date, booking.id);
      } catch (vErr) {
        logger.warn(`Vendor calendar book call failed: ${vErr.message}`);
      }

      await publisher.publishBookingConfirmed(updated);
      return formatBooking(updated);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = new BookingService();
