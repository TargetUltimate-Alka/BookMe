/**
 * ChecklistItem model - database operations for event checklist items
 */

class ChecklistItem {
  constructor(db) {
    this.db = db;
  }

  async createItem(eventId, task) {
    const query = `
      INSERT INTO checklist_items (event_id, task, done)
      VALUES ($1, $2, $3)
      RETURNING id, event_id as "eventId", task, done, created_at as "createdAt"
    `;
    const result = await this.db.query(query, [eventId, task, false]);
    return result.rows[0];
  }

  async getItemById(itemId, eventId) {
    const query = `
      SELECT id, event_id as "eventId", task, done, created_at as "createdAt"
      FROM checklist_items
      WHERE id = $1 AND event_id = $2
    `;
    const result = await this.db.query(query, [itemId, eventId]);
    return result.rows[0];
  }

  async getItemsByEvent(eventId) {
    const query = `
      SELECT id, event_id as "eventId", task, done, created_at as "createdAt"
      FROM checklist_items
      WHERE event_id = $1
      ORDER BY created_at ASC
    `;
    const result = await this.db.query(query, [eventId]);
    return result.rows;
  }

  async updateItem(itemId, eventId, { done }) {
    const query = `
      UPDATE checklist_items
      SET done = $1
      WHERE id = $2 AND event_id = $3
      RETURNING id, event_id as "eventId", task, done, created_at as "createdAt"
    `;
    const result = await this.db.query(query, [done, itemId, eventId]);
    return result.rows[0];
  }

  async deleteItem(itemId, eventId) {
    const query = `
      DELETE FROM checklist_items
      WHERE id = $1 AND event_id = $2
    `;
    await this.db.query(query, [itemId, eventId]);
  }

  async getChecklistStats(eventId) {
    const query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN done THEN 1 ELSE 0 END) as done
      FROM checklist_items
      WHERE event_id = $1
    `;
    const result = await this.db.query(query, [eventId]);
    return result.rows[0];
  }
}

module.exports = ChecklistItem;
