const checklistRepository = require('../repository/checklistRepository');
const eventRepository = require('../repository/eventRepository');
const { query } = require('../../../shared/db/pool');

function formatChecklistItem(item, booking = null) {
  let coverageStatus = 'NOT_COVERED';
  let bookingId = null;

  if (booking) {
    bookingId = booking.id;
    if (['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(booking.status)) {
      coverageStatus = 'BOOKED';
    } else if (['REQUESTED', 'NEGOTIATING', 'ACCEPTED', 'PENDING'].includes(booking.status)) {
      coverageStatus = 'REQUESTED';
    }
  }

  const today = new Date().toISOString().split('T')[0];
  const isOverdue = !item.done && item.due_date && item.due_date < today;

  return {
    id: item.id,
    eventId: item.event_id,
    categoryId: item.category_id || item.categoryId || item.id,
    categoryName: item.category || 'General',
    quantity: Number(item.quantity || 1),
    durationHours: Number(item.duration_hours || item.durationHours || 4),
    brand: item.brand || null,
    coverageStatus,
    bookingId,
    // Legacy fields for backward compatibility
    task: item.task || `${item.category || 'General'} Requirement`,
    category: item.category || 'General',
    due_date: item.due_date,
    done: Boolean(item.done),
    is_overdue: isOverdue,
    event_id: item.event_id,
  };
}

class ChecklistService {
  async getChecklist(eventId, user) {
    const event = await eventRepository.findById(eventId);
    if (!event) {
      const err = new Error(`Event not found: ${eventId}`);
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const isAdmin = user.role === 'admin' || user.role === 'superadmin' || user.role === 'supportagent';
    if (!isAdmin && event.customer_id !== user.id) {
      const err = new Error('Forbidden');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    const [items, bookingsRes] = await Promise.all([
      checklistRepository.findByEventId(eventId),
      query('SELECT id, event_item_id, status FROM bookings WHERE event_id = $1', [eventId]),
    ]);

    const bookingsByItem = new Map();
    (bookingsRes.rows || []).forEach((b) => {
      if (b.event_item_id) {
        bookingsByItem.set(b.event_item_id, b);
      }
    });

    return items.map((item) => formatChecklistItem(item, bookingsByItem.get(item.id)));
  }

  async addItem(eventId, user, itemData) {
    const event = await eventRepository.findById(eventId);
    if (!event) {
      const err = new Error(`Event not found: ${eventId}`);
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const isAdmin = user.role === 'admin' || user.role === 'superadmin' || user.role === 'supportagent';
    if (!isAdmin && event.customer_id !== user.id) {
      const err = new Error('Forbidden');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    const taskText = itemData.task || `${itemData.categoryName || itemData.category || 'Service'} Requirement`;
    const created = await checklistRepository.createItem(eventId, {
      task: taskText,
      category: itemData.categoryName || itemData.category || 'General',
      due_date: itemData.due_date || null,
      quantity: itemData.quantity || 1,
      duration_hours: itemData.durationHours,
      brand: itemData.brand,
    });

    return formatChecklistItem({
      ...created,
      categoryId: itemData.categoryId,
      quantity: itemData.quantity || 1,
      durationHours: itemData.durationHours,
      brand: itemData.brand,
    });
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
    const isAdmin = user.role === 'admin' || user.role === 'superadmin' || user.role === 'supportagent';
    if (!isAdmin && event && event.customer_id !== user.id) {
      const err = new Error('Forbidden');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    const updated = await checklistRepository.updateItem(taskId, updateData);
    return formatChecklistItem({
      ...updated,
      ...updateData,
    });
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
    const isAdmin = user.role === 'admin' || user.role === 'superadmin' || user.role === 'supportagent';
    if (!isAdmin && event && event.customer_id !== user.id) {
      const err = new Error('Forbidden');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    await checklistRepository.deleteItem(taskId);
    return true;
  }
}

module.exports = new ChecklistService();
