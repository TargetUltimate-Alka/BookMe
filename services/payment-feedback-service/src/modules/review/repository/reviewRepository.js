const { query, isPgActive } = require('../../../shared/db');
const inMemoryStore = require('../../../shared/inMemoryStore');

class ReviewRepository {
  async saveReview(review) {
    if (!isPgActive()) {
      return inMemoryStore.saveReview(review);
    }

    const text = `
      INSERT INTO reviews (id, booking_id, vendor_id, customer_id, rating, comment, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const params = [
      review.id,
      review.booking_id || review.bookingId,
      review.vendor_id || review.vendorId,
      review.customer_id || review.customerId,
      review.rating,
      review.comment,
      review.created_at || new Date().toISOString(),
    ];

    try {
      const res = await query(text, params);
      return res.rows[0];
    } catch {
      return inMemoryStore.saveReview(review);
    }
  }

  async findByBookingId(bookingId) {
    if (!isPgActive()) {
      return inMemoryStore.findReviewByBookingId(bookingId);
    }

    try {
      const res = await query('SELECT * FROM reviews WHERE booking_id = $1', [bookingId]);
      if (res.rows.length === 0) return inMemoryStore.findReviewByBookingId(bookingId);
      return res.rows[0];
    } catch {
      return inMemoryStore.findReviewByBookingId(bookingId);
    }
  }

  async findByVendorId(vendorId) {
    if (!isPgActive()) {
      return inMemoryStore.findReviewsByVendorId(vendorId);
    }

    try {
      const res = await query('SELECT * FROM reviews WHERE vendor_id = $1 ORDER BY created_at DESC', [vendorId]);
      if (res.rows.length === 0) return inMemoryStore.findReviewsByVendorId(vendorId);
      return res.rows;
    } catch {
      return inMemoryStore.findReviewsByVendorId(vendorId);
    }
  }
}

module.exports = new ReviewRepository();
