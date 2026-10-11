const { query } = require('../../../shared/db/pool');

class HistoryRepository {
  async recordTransition(bookingId, fromStatus, toStatus, changedBy, reason = null, client = null) {
    const sql = `
      INSERT INTO booking_status_history (booking_id, from_status, to_status, changed_by, reason)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, booking_id, from_status, to_status, changed_by, reason, created_at;
    `;
    const params = [bookingId, fromStatus || null, toStatus, changedBy, reason || null];
    const res = client ? await client.query(sql, params) : await query(sql, params);
    return res.rows[0];
  }

  async findByBookingId(bookingId) {
    const sql = `
      SELECT id, booking_id, from_status, to_status, changed_by, reason, created_at
      FROM booking_status_history
      WHERE booking_id = $1
      ORDER BY created_at ASC;
    `;
    const res = await query(sql, [bookingId]);
    return res.rows;
  }
}

module.exports = new HistoryRepository();
