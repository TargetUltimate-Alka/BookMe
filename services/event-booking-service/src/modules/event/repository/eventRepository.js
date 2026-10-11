const { query } = require('../../../shared/db/pool');

class EventRepository {
  /**
   * Insert event within client/transaction
   */
  async createEvent(eventData, client = null) {
    const { customerId, name, eventType, eventDate, budget, guestCount, city } = eventData;
    const sql = `
      INSERT INTO events (customer_id, name, event_type, event_date, budget, guest_count, city, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'PLANNING')
      RETURNING id, customer_id, name, event_type, event_date, budget, guest_count, city, status, created_at, updated_at;
    `;
    const params = [customerId, name, eventType, eventDate, budget, guestCount, city || null];
    const res = client ? await client.query(sql, params) : await query(sql, params);
    return res.rows[0];
  }

  async findById(eventId, client = null) {
    const sql = `
      SELECT id, customer_id, name, event_type, event_date, budget, guest_count, city, status, created_at, updated_at
      FROM events
      WHERE id = $1;
    `;
    const res = client ? await client.query(sql, [eventId]) : await query(sql, [eventId]);
    return res.rows[0] || null;
  }

  async findByCustomerId(customerId, status = null, limit = 20, offset = 0) {
    let sql = `
      SELECT id, customer_id, name, event_type, event_date, budget, guest_count, city, status, created_at, updated_at
      FROM events
      WHERE customer_id = $1
    `;
    const params = [customerId];

    if (status) {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }

    sql += ` ORDER BY event_date ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2};`;
    params.push(limit, offset);

    const res = await query(sql, params);
    return res.rows;
  }

  async countByCustomerId(customerId, status = null) {
    let sql = `SELECT COUNT(*) AS total FROM events WHERE customer_id = $1`;
    const params = [customerId];

    if (status) {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }

    const res = await query(sql, params);
    return parseInt(res.rows[0].total, 10);
  }

  async updateEvent(eventId, fields) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return this.findById(eventId);

    const setClauses = [];
    const params = [eventId];

    keys.forEach((key, idx) => {
      // Map camelCase to snake_case
      const col = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      params.push(fields[key]);
      setClauses.push(`${col} = $${params.length}`);
    });

    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);

    const sql = `
      UPDATE events
      SET ${setClauses.join(', ')}
      WHERE id = $1
      RETURNING id, customer_id, name, event_type, event_date, budget, guest_count, city, status, created_at, updated_at;
    `;

    const res = await query(sql, params);
    return res.rows[0] || null;
  }

  async softDelete(eventId) {
    const sql = `
      UPDATE events
      SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, status, updated_at;
    `;
    const res = await query(sql, [eventId]);
    return res.rows[0] || null;
  }
}

module.exports = new EventRepository();
