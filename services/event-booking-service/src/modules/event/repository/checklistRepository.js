const { query } = require('../../../shared/db/pool');

class ChecklistRepository {
  /**
   * Batch insert default checklist items in a transaction
   */
  async insertBatch(eventId, items, client) {
    if (!items || items.length === 0) return [];

    const inserted = [];
    for (const item of items) {
      const sql = `
        INSERT INTO event_checklist (event_id, task, category, due_date, done)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, event_id, task, category, due_date, done, created_at, updated_at;
      `;
      const params = [eventId, item.task, item.category || 'General', item.due_date || null, item.done || false];
      const res = client ? await client.query(sql, params) : await query(sql, params);
      inserted.push(res.rows[0]);
    }
    return inserted;
  }

  async findByEventId(eventId) {
    const sql = `
      SELECT id, event_id, task, category, due_date, done, created_at, updated_at
      FROM event_checklist
      WHERE event_id = $1
      ORDER BY due_date ASC NULLS LAST, created_at ASC;
    `;
    const res = await query(sql, [eventId]);
    return res.rows;
  }

  async findById(id) {
    const sql = `
      SELECT id, event_id, task, category, due_date, done, created_at, updated_at
      FROM event_checklist
      WHERE id = $1;
    `;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  }

  async createItem(eventId, itemData) {
    const { task, category, due_date } = itemData;
    const sql = `
      INSERT INTO event_checklist (event_id, task, category, due_date, done)
      VALUES ($1, $2, $3, $4, FALSE)
      RETURNING id, event_id, task, category, due_date, done, created_at, updated_at;
    `;
    const res = await query(sql, [eventId, task, category || 'General', due_date || null]);
    return res.rows[0];
  }

  async updateItem(id, updateData) {
    const keys = Object.keys(updateData);
    if (keys.length === 0) return this.findById(id);

    const setClauses = [];
    const params = [id];

    keys.forEach((key) => {
      params.push(updateData[key]);
      setClauses.push(`${key} = $${params.length}`);
    });

    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);

    const sql = `
      UPDATE event_checklist
      SET ${setClauses.join(', ')}
      WHERE id = $1
      RETURNING id, event_id, task, category, due_date, done, created_at, updated_at;
    `;

    const res = await query(sql, params);
    return res.rows[0] || null;
  }

  async deleteItem(id) {
    const sql = `DELETE FROM event_checklist WHERE id = $1 RETURNING id;`;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  }

  async getChecklistStats(eventId) {
    const sql = `
      SELECT 
        COUNT(*)::integer AS total,
        COUNT(CASE WHEN done THEN 1 END)::integer AS completed,
        COUNT(CASE WHEN NOT done THEN 1 END)::integer AS pending,
        COUNT(CASE WHEN NOT done AND due_date < CURRENT_DATE THEN 1 END)::integer AS overdue
      FROM event_checklist
      WHERE event_id = $1;
    `;
    const res = await query(sql, [eventId]);
    return res.rows[0];
  }
}

module.exports = new ChecklistRepository();
