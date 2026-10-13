const crypto = require('crypto');
const { publishEvent } = require('../../../shared/rabbit');

class BookingEventPublisher {
  _wrapEnvelope(type, payload, correlationId) {
    return {
      eventId: crypto.randomUUID(),
      type,
      version: '1.0.0',
      occurredAt: new Date().toISOString(),
      correlationId: correlationId || `corr_${crypto.randomUUID()}`,
      idempotencyKey: `idem_${type}_${payload.bookingId || crypto.randomUUID()}`,
      producer: 'event-booking-service',
      payload,
    };
  }

  async publishBookingRequested(booking, responseDueAt, correlationId) {
    const payload = {
      bookingId: booking.id,
      customerId: booking.customer_id,
      vendorId: booking.vendor_id,
      packageId: booking.package_id,
      eventDate: typeof booking.booking_date === 'string'
        ? booking.booking_date.split('T')[0]
        : new Date(booking.booking_date).toISOString().split('T')[0],
      amountPaise: Number(booking.agreed_amount_paise || booking.price_snapshot * 100 || 0),
      responseDueAt: (responseDueAt || booking.vendor_response_due_at || new Date(Date.now() + 12 * 3600 * 1000)).toISOString ? (responseDueAt || booking.vendor_response_due_at).toISOString() : responseDueAt,
    };
    const envelope = this._wrapEnvelope('booking.requested', payload, correlationId);
    await publishEvent('booking.requested', envelope);
    // Legacy event alias for older listeners
    await publishEvent('booking.created', {
      bookingId: booking.id,
      eventId: booking.event_id,
      customerId: booking.customer_id,
      vendorId: booking.vendor_id,
      amount: Number(booking.price_snapshot),
      date: payload.eventDate,
    });
  }

  // Alias for backward compatibility with existing tests
  async publishBookingCreated(booking) {
    return this.publishBookingRequested(booking);
  }

  async publishBookingCountered(counterOffer, correlationId) {
    const payload = {
      bookingId: counterOffer.booking_id,
      counterId: counterOffer.id,
      proposerRole: counterOffer.proposed_by_role,
      proposedAmountPaise: Number(counterOffer.amount_paise),
      expiresAt: typeof counterOffer.expires_at === 'string' ? counterOffer.expires_at : counterOffer.expires_at.toISOString(),
    };
    const envelope = this._wrapEnvelope('booking.countered', payload, correlationId);
    await publishEvent('booking.countered', envelope);
  }

  async publishBookingAccepted(booking, correlationId) {
    const payload = {
      bookingId: booking.id,
      customerId: booking.customer_id,
      vendorId: booking.vendor_id,
      agreedAmountPaise: Number(booking.agreed_amount_paise || booking.price_snapshot * 100 || 0),
      depositDueAt: booking.deposit_due_at ? (booking.deposit_due_at.toISOString ? booking.deposit_due_at.toISOString() : booking.deposit_due_at) : new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    };
    const envelope = this._wrapEnvelope('booking.accepted', payload, correlationId);
    await publishEvent('booking.accepted', envelope);
  }

  async publishBookingRejected(booking, reason, correlationId) {
    const payload = {
      bookingId: booking.id,
      customerId: booking.customer_id,
      vendorId: booking.vendor_id,
      reason: reason || 'Vendor declined booking',
    };
    const envelope = this._wrapEnvelope('booking.rejected', payload, correlationId);
    await publishEvent('booking.rejected', envelope);
  }

  async publishBookingExpired(booking, expiredState, reason, correlationId) {
    const payload = {
      bookingId: booking.id,
      expiredState: expiredState || booking.status,
      reason: reason || 'Deadline expired',
    };
    const envelope = this._wrapEnvelope('booking.expired', payload, correlationId);
    await publishEvent('booking.expired', envelope);
  }

  async publishBookingConfirmed(booking, correlationId) {
    const payload = {
      bookingId: booking.id,
      customerId: booking.customer_id,
      vendorId: booking.vendor_id,
      eventDate: typeof booking.booking_date === 'string'
        ? booking.booking_date.split('T')[0]
        : new Date(booking.booking_date).toISOString().split('T')[0],
      depositAmountPaise: Number(booking.deposit_amount_paise || Math.round((booking.price_snapshot || 0) * 40)),
      balanceDueAt: booking.balance_due_at ? (booking.balance_due_at.toISOString ? booking.balance_due_at.toISOString() : booking.balance_due_at) : null,
    };
    const envelope = this._wrapEnvelope('booking.confirmed', payload, correlationId);
    await publishEvent('booking.confirmed', envelope);
  }

  async publishBookingCancelled(booking, reason, cancelledBy, chargeBreakdown = {}, correlationId) {
    const payload = {
      bookingId: booking.id,
      cancelledBy: cancelledBy || 'CUSTOMER',
      chargePaise: Number(chargeBreakdown.chargePaise || 0),
      refundPaise: Number(chargeBreakdown.refundPaise || 0),
      vendorPenaltyPaise: Number(chargeBreakdown.penaltyPaise || 0),
      reason: reason || 'Booking cancelled',
    };
    const envelope = this._wrapEnvelope('booking.cancelled', payload, correlationId);
    await publishEvent('booking.cancelled', envelope);
  }

  async publishBookingInProgress(booking, checkInAt, latitude, longitude, correlationId) {
    const payload = {
      bookingId: booking.id,
      vendorId: booking.vendor_id,
      checkInAt: checkInAt ? (checkInAt.toISOString ? checkInAt.toISOString() : checkInAt) : new Date().toISOString(),
      latitude: Number(latitude || 0),
      longitude: Number(longitude || 0),
    };
    const envelope = this._wrapEnvelope('booking.in_progress', payload, correlationId);
    await publishEvent('booking.in_progress', envelope);
  }

  async publishBookingNoShow(booking, correlationId) {
    const payload = {
      bookingId: booking.id,
      vendorId: booking.vendor_id,
      reportedAt: new Date().toISOString(),
    };
    const envelope = this._wrapEnvelope('booking.no_show', payload, correlationId);
    await publishEvent('booking.no_show', envelope);
  }

  async publishBookingCompleted(booking, correlationId) {
    const payload = {
      bookingId: booking.id,
      customerId: booking.customer_id,
      vendorId: booking.vendor_id,
      completedAt: new Date().toISOString(),
    };
    const envelope = this._wrapEnvelope('booking.completed', payload, correlationId);
    await publishEvent('booking.completed', envelope);
  }

  async publishBookingDisputed(booking, raisedBy, reason, correlationId) {
    const payload = {
      bookingId: booking.id,
      raisedBy: raisedBy || 'CUSTOMER',
      disputeReason: reason || 'Dispute raised on booking',
      raisedAt: new Date().toISOString(),
    };
    const envelope = this._wrapEnvelope('booking.disputed', payload, correlationId);
    await publishEvent('booking.disputed', envelope);
  }
}

module.exports = new BookingEventPublisher();
