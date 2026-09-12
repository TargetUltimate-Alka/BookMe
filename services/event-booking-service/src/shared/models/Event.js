/**
 * Event model - database operations for events
 */

class Event {
  constructor(db) {
    this.db = db;
  }

  async createEvent(customerId, { name, date, budget, guestCount }) {
    const query = `
      INSERT INTO events (customer_id, name, date, budget, guest_count)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, customer_id as "customerId", name, date, budget, guest_count as "guestCount", created_at as "createdAt"
    `;
    const result = await this.db.query(query, [customerId, name, date, budget, guestCount]);
    return result.rows[0];
  }

  async getEventById(eventId, customerId) {
    const query = `
      SELECT id, customer_id as "customerId", name, date, budget, guest_count as "guestCount", created_at as "createdAt"
      FROM events
      WHERE id = $1 AND customer_id = $2
    `;
    const result = await this.db.query(query, [eventId, customerId]);
    return result.rows[0];
  }

  async getEventsByCustomer(customerId) {
    const query = `
      SELECT id, customer_id as "customerId", name, date, budget, guest_count as "guestCount", created_at as "createdAt"
      FROM events
      WHERE customer_id = $1
      ORDER BY created_at DESC
    `;
    const result = await this.db.query(query, [customerId]);
    return result.rows;
  }

  async updateEvent(eventId, customerId, updateData) {
    const { name, date, budget, guestCount } = updateData;
    
    // Build dynamic update query
    const updates = [];
    const values = [eventId, customerId];
    let paramCount = 2;

    if (name !== undefined) {
      paramCount++;
      updates.push(`name = $${paramCount}`);
      values.push(name);
    }
    if (date !== undefined) {
      paramCount++;
      updates.push(`date = $${paramCount}`);
      values.push(date);
    }
    if (budget !== undefined) {
      paramCount++;
      updates.push(`budget = $${paramCount}`);
      values.push(budget);
    }
    if (guestCount !== undefined) {
      paramCount++;
      updates.push(`guest_count = $${paramCount}`);
      values.push(guestCount);
    }

    if (updates.length === 0) {
      // No updates
      return this.getEventById(eventId, customerId);
    }

    const query = `
      UPDATE events
      SET ${updates.join(', ')}
      WHERE id = $1 AND customer_id = $2
      RETURNING id, customer_id as "customerId", name, date, budget, guest_count as "guestCount", created_at as "createdAt"
    `;

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async deleteEvent(eventId, customerId) {
    const query = `
      DELETE FROM events
      WHERE id = $1 AND customer_id = $2
    `;
    await this.db.query(query, [eventId, customerId]);
  }
}

module.exports = Event;
