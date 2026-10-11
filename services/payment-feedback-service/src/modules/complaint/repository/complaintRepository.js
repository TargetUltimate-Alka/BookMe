const { query, isPgActive } = require('../../../shared/db');
const inMemoryStore = require('../../../shared/inMemoryStore');

class ComplaintRepository {
  async saveComplaint(complaint) {
    if (!isPgActive()) {
      return inMemoryStore.saveComplaint(complaint);
    }

    const text = `
      INSERT INTO complaints (id, booking_id, customer_id, subject, description, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at
      RETURNING *;
    `;
    const params = [
      complaint.id,
      complaint.booking_id || complaint.bookingId,
      complaint.customer_id || complaint.customerId,
      complaint.subject,
      complaint.description,
      complaint.status || 'open',
      complaint.created_at || new Date().toISOString(),
      new Date().toISOString(),
    ];

    try {
      const res = await query(text, params);
      return res.rows[0];
    } catch {
      return inMemoryStore.saveComplaint(complaint);
    }
  }

  async findById(id) {
    if (!isPgActive()) {
      return inMemoryStore.findComplaintById(id);
    }

    try {
      const res = await query('SELECT * FROM complaints WHERE id = $1', [id]);
      if (res.rows.length === 0) return inMemoryStore.findComplaintById(id);
      return res.rows[0];
    } catch {
      return inMemoryStore.findComplaintById(id);
    }
  }

  async findList(status) {
    if (!isPgActive()) {
      return inMemoryStore.findComplaints(status);
    }

    try {
      let text = 'SELECT * FROM complaints';
      const params = [];
      if (status) {
        text += ' WHERE status = $1';
        params.push(status);
      }
      text += ' ORDER BY created_at DESC';
      const res = await query(text, params);
      if (res.rows.length === 0) return inMemoryStore.findComplaints(status);
      return res.rows;
    } catch {
      return inMemoryStore.findComplaints(status);
    }
  }
}

module.exports = new ComplaintRepository();
