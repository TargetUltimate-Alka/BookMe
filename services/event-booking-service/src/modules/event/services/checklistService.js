const checklistRepository = require('../repository/checklistRepository');
const eventRepository = require('../repository/eventRepository');

class ChecklistService {
  async getChecklist(eventId, user) {
    const event = await eventRepository.findById(eventId);
    if (!event) {
      const err = new Error(`Event not found: ${eventId}`);
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (user.role !== 'admin' && event.customer_id !== user.id) {
      const err = new Error('Forbidden');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    const items = await checklistRepository.findByEventId(eventId);
    const today = new Date().toISOString().split('T')[0];

    return items.map((item) => {
      const isOverdue = !item.done && item.due_date && item.due_date < today;
      return {
        ...item,
        is_overdue: isOverdue,
      };
    });
  }

  async addItem(eventId, user, itemData) {
    const event = await eventRepository.findById(eventId);
    if (!event) {
      const err = new Error(`Event not found: ${eventId}`);
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (user.role !== 'admin' && event.customer_id !== user.id) {
      const err = new Error('Forbidden');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    const created = await checklistRepository.createItem(eventId, itemData);
    return {
      ...created,
      is_overdue: false,
    };
  }

  async updateItem(taskId, user, updateData) {
    const item = await checklistRepository.findById(taskId);
    if (!item) {
      const err = new Error(`Checklist item not found: ${taskId}`);
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const event = await eventRepository.findById(item.event_id);
    if (user.role !== 'admin' && event && event.customer_id !== user.id) {
      const err = new Error('Forbidden');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    const updated = await checklistRepository.updateItem(taskId, updateData);
    const today = new Date().toISOString().split('T')[0];
    const isOverdue = !updated.done && updated.due_date && updated.due_date < today;

    return {
      ...updated,
      is_overdue: isOverdue,
    };
  }

  async deleteItem(taskId, user) {
    const item = await checklistRepository.findById(taskId);
    if (!item) {
      const err = new Error(`Checklist item not found: ${taskId}`);
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const event = await eventRepository.findById(item.event_id);
    if (user.role !== 'admin' && event && event.customer_id !== user.id) {
      const err = new Error('Forbidden');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    await checklistRepository.deleteItem(taskId);
    return { success: true };
  }
}

module.exports = new ChecklistService();
