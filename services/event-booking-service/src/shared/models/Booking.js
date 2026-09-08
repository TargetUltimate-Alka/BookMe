/**
 * Booking model - database operations for bookings
 */

class Booking {
  constructor(db) {
    this.db = db;
  }

  async createBooking(eventId, { vendorId, packageId, date, vendorNameSnapshot, priceSnapshot }) {
    const query = `
      INSERT INTO bookings (event_id, vendor_id, package_id, date, vendor_name_snapshot, price_snapshot, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING 
        id, 
        event_id as "eventId", 
        vendor_id as "vendorId",
        package_id as "packageId",
        date,
        vendor_name_snapshot as "vendorNameSnapshot",
        price_snapshot as "priceSnapshot",
        status,
        created_at as "createdAt"
    `;
    const result = await this.db.query(query, [
      eventId,
      vendorId,
      packageId,
      date,
      vendorNameSnapshot,
      priceSnapshot,
      'pending',
    ]);
    return result.rows[0];
  }

  async getBookingById(bookingId) {
    const query = `
      SELECT 
        id, 
        event_id as "eventId", 
        vendor_id as "vendorId",
        package_id as "packageId",
        date,
        vendor_name_snapshot as "vendorNameSnapshot",
        price_snapshot as "priceSnapshot",
        status,
        created_at as "createdAt"
      FROM bookings
      WHERE id = $1
    `;
    const result = await this.db.query(query, [bookingId]);
    return result.rows[0];
  }

  async getBookingsByEvent(eventId) {
    const query = `
      SELECT 
        id, 
        event_id as "eventId", 
        vendor_id as "vendorId",
        package_id as "packageId",
        date,
        vendor_name_snapshot as "vendorNameSnapshot",
        price_snapshot as "priceSnapshot",
        status,
        created_at as "createdAt"
      FROM bookings
      WHERE event_id = $1
      ORDER BY created_at DESC
    `;
    const result = await this.db.query(query, [eventId]);
    return result.rows;
  }

  async updateBookingStatus(bookingId, newStatus) {
    // Validate status transition
    const booking = await this.getBookingById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    const validTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    };

    if (!validTransitions[booking.status]?.includes(newStatus)) {
      const err = new Error(`Invalid status transition from ${booking.status} to ${newStatus}`);
      err.status = 400;
      err.details = [
        {
          field: 'status',
          issue: `Cannot transition from ${booking.status} to ${newStatus}`,
          allowedTransitions: validTransitions[booking.status],
        },
      ];
      throw err;
    }

    const query = `
      UPDATE bookings
      SET status = $1
      WHERE id = $2
      RETURNING 
        id, 
        event_id as "eventId", 
        vendor_id as "vendorId",
        package_id as "packageId",
        date,
        vendor_name_snapshot as "vendorNameSnapshot",
        price_snapshot as "priceSnapshot",
        status,
        created_at as "createdAt"
    `;
    const result = await this.db.query(query, [newStatus, bookingId]);
    return result.rows[0];
  }
}

module.exports = Booking;
