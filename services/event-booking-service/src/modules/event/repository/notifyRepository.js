const { query } = require('../../../shared/db/pool');

class NotifyRepository {
  async createNotifyRequest({ customerId, eventItemId, packageId, categoryId, targetDate }) {
    const sql = `
      INSERT INTO notify_requests (customer_id, event_item_id, package_id, category_id, target_date, status)
      VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
      RETURNING id, customer_id, event_item_id, package_id, category_id, target_date, status, created_at;
    `;
    const params = [
      customerId,
      eventItemId || null,
      packageId || null,
      categoryId || null,
      targetDate,
    ];
    const res = await query(sql, params);
    return res.rows[0];
  }

  async findByCustomerId(customerId) {
    const sql = `
      SELECT id, customer_id, event_item_id, package_id, category_id, target_date, status, created_at
      FROM notify_requests
      WHERE customer_id = $1 AND status = 'ACTIVE'
      ORDER BY created_at DESC;
    `;
    const res = await query(sql, [customerId]);
    return res.rows;
  }

  async countActiveToday(customerId) {
    const sql = `
      SELECT COUNT(*) AS total
      FROM notify_requests
      WHERE customer_id = $1 AND status = 'ACTIVE' AND created_at >= CURRENT_DATE;
    `;
    const res = await query(sql, [customerId]);
    return parseInt(res.rows[0].total || res.rows[0].count || '0', 10);
  }

  async findById(id) {
    const sql = `
      SELECT id, customer_id, event_item_id, package_id, category_id, target_date, status, created_at
      FROM notify_requests
      WHERE id = $1;
    `;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  }

  async cancelRequest(id, customerId) {
    const sql = `
      DELETE FROM notify_requests
      WHERE id = $1 AND customer_id = $2
      RETURNING id;
    `;
    const res = await query(sql, [id, customerId]);
    return res.rows.length > 0;
  }
}

module.exports = new NotifyRepository();
