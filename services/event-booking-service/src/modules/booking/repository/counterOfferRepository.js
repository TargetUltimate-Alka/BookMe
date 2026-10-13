const { query } = require('../../../shared/db/pool');

class CounterOfferRepository {
  async createCounterOffer({ bookingId, proposedByRole, amountPaise, counterNumber, expiresAt }, client = null) {
    const sql = `
      INSERT INTO counter_offers (booking_id, proposed_by_role, amount_paise, counter_number, status, expires_at)
      VALUES ($1, $2, $3, $4, 'PENDING', $5)
      RETURNING id, booking_id, proposed_by_role, amount_paise, counter_number, status, expires_at, created_at;
    `;
    const params = [bookingId, proposedByRole, amountPaise, counterNumber, expiresAt];
    const res = client ? await client.query(sql, params) : await query(sql, params);
    return res.rows[0];
  }

  async findByBookingId(bookingId, client = null) {
    const sql = `
      SELECT id, booking_id, proposed_by_role, amount_paise, counter_number, status, expires_at, created_at
      FROM counter_offers
      WHERE booking_id = $1
      ORDER BY counter_number ASC;
    `;
    const res = client ? await client.query(sql, [bookingId]) : await query(sql, [bookingId]);
    return res.rows;
  }

  async findById(id, client = null) {
    const sql = `
      SELECT id, booking_id, proposed_by_role, amount_paise, counter_number, status, expires_at, created_at
      FROM counter_offers
      WHERE id = $1;
    `;
    const res = client ? await client.query(sql, [id]) : await query(sql, [id]);
    return res.rows[0] || null;
  }

  async updateStatus(id, status, client = null) {
    const sql = `
      UPDATE counter_offers
      SET status = $1
      WHERE id = $2
      RETURNING id, booking_id, proposed_by_role, amount_paise, counter_number, status, expires_at, created_at;
    `;
    const res = client ? await client.query(sql, [status, id]) : await query(sql, [status, id]);
    return res.rows[0] || null;
  }
}

module.exports = new CounterOfferRepository();
