const { publishEvent } = require('../../../shared/rabbit');

class BookingEventPublisher {
  async publishBookingCreated(booking) {
    await publishEvent('booking.created', {
      bookingId: booking.id,
      eventId: booking.event_id,
      customerId: booking.customer_id,
      vendorId: booking.vendor_id,
      amount: Number(booking.price_snapshot),
      date: booking.booking_date,
    });
  }

  async publishBookingAccepted(booking) {
    await publishEvent('booking.accepted', {
      bookingId: booking.id,
      eventId: booking.event_id,
      customerId: booking.customer_id,
      vendorId: booking.vendor_id,
      amount: Number(booking.price_snapshot),
      paymentDueAt: booking.payment_due_at,
    });
  }

  async publishBookingRejected(booking, reason) {
    await publishEvent('booking.rejected', {
      bookingId: booking.id,
      eventId: booking.event_id,
      customerId: booking.customer_id,
      vendorId: booking.vendor_id,
      reason,
    });
  }

  async publishBookingConfirmed(booking) {
    await publishEvent('booking.confirmed', {
      bookingId: booking.id,
      eventId: booking.event_id,
      customerId: booking.customer_id,
      vendorId: booking.vendor_id,
      amount: Number(booking.price_snapshot),
      category: booking.category,
    });
  }

  async publishBookingCancelled(booking, reason, cancelledBy, previousStatus) {
    await publishEvent('booking.cancelled', {
      bookingId: booking.id,
      eventId: booking.event_id,
      customerId: booking.customer_id,
      vendorId: booking.vendor_id,
      amount: Number(booking.price_snapshot),
      bookingDate: booking.booking_date,
      cancelledBy,
      previousStatus,
      reason,
    });
  }

  async publishBookingCompleted(booking) {
    await publishEvent('booking.completed', {
      bookingId: booking.id,
      eventId: booking.event_id,
      vendorId: booking.vendor_id,
    });
  }
}

module.exports = new BookingEventPublisher();
