const { query } = require('../../../shared/db/pool');

class BudgetRepository {
  /**
   * Batch insert default budget split rows inside a transaction
   */
  async insertBatch(eventId, items, client) {
    if (!items || items.length === 0) return [];

    const inserted = [];
    for (const item of items) {
      const sql = `
        INSERT INTO event_budget (event_id, category, planned_amount, actual_amount)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (event_id, category)
        DO UPDATE SET planned_amount = EXCLUDED.planned_amount, updated_at = CURRENT_TIMESTAMP
        RETURNING id, event_id, category, planned_amount, actual_amount, created_at, updated_at;
      `;
      const params = [eventId, item.category, item.planned_amount, item.actual_amount || 0];
      const res = client ? await client.query(sql, params) : await query(sql, params);
      inserted.push(res.rows[0]);
    }
    return inserted;
  }

  async findByEventId(eventId) {
    const sql = `
      SELECT id, event_id, category, planned_amount, actual_amount, created_at, updated_at
      FROM event_budget
      WHERE event_id = $1
      ORDER BY planned_amount DESC, category ASC;
    `;
    const res = await query(sql, [eventId]);
    return res.rows;
  }

  async upsertCategories(eventId, categories) {
    const updated = [];
    for (const cat of categories) {
      const sql = `
        INSERT INTO event_budget (event_id, category, planned_amount, actual_amount)
        VALUES ($1, $2, $3, 0.00)
        ON CONFLICT (event_id, category)
        DO UPDATE SET planned_amount = EXCLUDED.planned_amount, updated_at = CURRENT_TIMESTAMP
        RETURNING id, event_id, category, planned_amount, actual_amount, created_at, updated_at;
      `;
      const res = await query(sql, [eventId, cat.category, cat.planned_amount]);
      updated.push(res.rows[0]);
    }
    return updated;
  }

  async incrementActualAmount(eventId, category, amount, client = null) {
    const sql = `
      INSERT INTO event_budget (event_id, category, planned_amount, actual_amount)
      VALUES ($1, $2, 0.00, $3)
      ON CONFLICT (event_id, category)
      DO UPDATE SET actual_amount = event_budget.actual_amount + $3, updated_at = CURRENT_TIMESTAMP
      RETURNING id, event_id, category, planned_amount, actual_amount;
    `;
    const params = [eventId, category, amount];
    const res = client ? await client.query(sql, params) : await query(sql, params);
    return res.rows[0];
  }
}

module.exports = new BudgetRepository();
