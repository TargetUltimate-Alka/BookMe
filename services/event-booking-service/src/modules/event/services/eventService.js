const { getClient } = require('../../../shared/db/pool');
const eventRepository = require('../repository/eventRepository');
const budgetRepository = require('../repository/budgetRepository');
const checklistRepository = require('../repository/checklistRepository');
const { calculateDefaultBudget } = require('../constants/budgetTemplates');
const { generateDefaultChecklist } = require('../constants/checklistTemplates');
const logger = require('../../../shared/logger');

function formatPlannerEvent(event) {
  const dateFrom =
    event.date_from ||
    (event.dateRange && event.dateRange.startDate) ||
    event.event_date ||
    new Date().toISOString().split('T')[0];
  const dateTo =
    event.date_to ||
    (event.dateRange && event.dateRange.endDate) ||
    dateFrom;

  const venueLocation =
    event.venue_location ||
    (event.city
      ? {
          address: event.city,
          city: event.city,
          latitude: 23.0225,
          longitude: 72.5714,
        }
      : {
          address: 'Main Event Venue',
          city: 'Ahmedabad',
          latitude: 23.0225,
          longitude: 72.5714,
        });

  return {
    id: event.id,
    customerId: event.customer_id,
    name: event.name,
    dateFrom: typeof dateFrom === 'string' ? dateFrom.split('T')[0] : new Date(dateFrom).toISOString().split('T')[0],
    dateTo: typeof dateTo === 'string' ? dateTo.split('T')[0] : new Date(dateTo).toISOString().split('T')[0],
    venueLocation,
    guestCount: Number(event.guest_count || 100),
    status: event.status || 'PLANNING',
    createdAt: event.created_at
      ? (event.created_at.toISOString ? event.created_at.toISOString() : event.created_at)
      : new Date().toISOString(),
    // Legacy fields for backward compatibility with existing tests
    customer_id: event.customer_id,
    event_type: event.event_type || 'Wedding',
    event_date: typeof dateFrom === 'string' ? dateFrom.split('T')[0] : new Date(dateFrom).toISOString().split('T')[0],
    budget: Number(event.budget || 0),
    guest_count: Number(event.guest_count || 100),
    city: event.city || (venueLocation ? venueLocation.city : null),
    budget_items: event.budget_items || [],
    checklist_count: event.checklist_count || 0,
    days_left: event.days_left,
  };
}

class EventService {
  /**
   * Create an event with transactional default budget and checklist generation
   */
  async createEvent(customerId, eventData) {
    const dateFrom = eventData.dateFrom || eventData.date_from || eventData.event_date || new Date().toISOString().split('T')[0];
    const dateTo = eventData.dateTo || eventData.date_to || dateFrom;
    const eventDate = typeof dateFrom === 'string' ? dateFrom.split('T')[0] : new Date(dateFrom).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    if (eventDate < today) {
      const err = new Error('event_date must be today or in the future');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = [{ field: 'event_date', issue: 'Date cannot be in the past' }];
      throw err;
    }

    const guestCount = Number(eventData.guestCount || eventData.guest_count || 100);
    const budget = Number(eventData.budget || 500000);
    const eventType = eventData.event_type || 'Wedding';
    const city = eventData.city || (eventData.venueLocation ? eventData.venueLocation.city : null);

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // 1. Insert Event
      const event = await eventRepository.createEvent(
        {
          customerId,
          name: eventData.name,
          eventType,
          eventDate,
          budget,
          guestCount,
          city,
        },
        client
      );

      // 2. Generate and Insert Default Budget
      const defaultBudget = calculateDefaultBudget(event.event_type, event.budget);
      const budgetItems = await budgetRepository.insertBatch(event.id, defaultBudget, client);

      // 3. Generate and Insert Default Checklist Tasks (FR-PLAN-01)
      let checklistTasks = generateDefaultChecklist(event.event_type, event.event_date);
      if (Array.isArray(eventData.items) && eventData.items.length > 0) {
        const customTasks = eventData.items.map((it) => ({
          task: it.task || `${it.category || 'Service'} Requirement`,
          category: it.category || 'General',
          dueDate: it.dueDate || it.due_date || event.event_date,
          quantity: it.quantity || 1,
          durationHours: it.durationHours || 4,
          brand: it.brand || null,
        }));
        checklistTasks = [...customTasks, ...checklistTasks];
      }
      const checklistItems = await checklistRepository.insertBatch(event.id, checklistTasks, client);

      await client.query('COMMIT');
      logger.info(`Event created successfully: ${event.id}`, { customerId, eventId: event.id });

      const rawResult = {
        ...event,
        budget_items: budgetItems.map((b) => ({
          category: b.category,
          planned_amount: Number(b.planned_amount),
          actual_amount: Number(b.actual_amount),
        })),
        checklist_count: checklistItems.length,
        venue_location: eventData.venueLocation,
      };

      return formatPlannerEvent(rawResult);
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error(`Failed to create event transaction: ${err.message}`);
      throw err;
    } finally {
      client.release();
    }
  }

  async listEvents(customerId, query = {}) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '10', 10)));
    const offset = (page - 1) * limit;
    const status = query.status || null;

    const [events, total] = await Promise.all([
      eventRepository.findByCustomerId(customerId, status, limit, offset),
      eventRepository.countByCustomerId(customerId, status),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const enriched = events.map((evt) => {
      const eventDate = new Date(evt.event_date);
      eventDate.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));

      return formatPlannerEvent({
        ...evt,
        days_left: Math.max(0, diffDays),
      });
    });

    const hasMore = offset + events.length < total;
    const nextCursor = hasMore ? Buffer.from(String(offset + limit)).toString('base64') : null;

    return {
      items: enriched,
      data: enriched, // legacy alias
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        cursor: query.cursor || null,
        nextCursor,
        hasMore,
      },
    };
  }

  async getEventById(eventId, user) {
    const event = await eventRepository.findById(eventId);
    if (!event) {
      const err = new Error(`Event not found: ${eventId}`);
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const isAdmin = user.role === 'admin' || user.role === 'superadmin' || user.role === 'supportagent';
    if (!isAdmin && event.customer_id !== user.id) {
      const err = new Error('You do not have permission to view this event');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(event.event_date);
    eventDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));

    return formatPlannerEvent({
      ...event,
      days_left: Math.max(0, diffDays),
    });
  }

  async updateEvent(eventId, user, updateData) {
    await this.getEventById(eventId, user);

    if (updateData.event_date) {
      const today = new Date().toISOString().split('T')[0];
      if (updateData.event_date < today) {
        const err = new Error('event_date must be today or in the future');
        err.status = 400;
        err.code = 'VALIDATION_ERROR';
        throw err;
      }
    }

    const payload = {
      ...updateData,
      guest_count: updateData.guestCount || updateData.guest_count,
      city: updateData.city || (updateData.venueLocation ? updateData.venueLocation.city : undefined),
    };

    const updated = await eventRepository.updateEvent(eventId, payload);
    return formatPlannerEvent(updated);
  }

  async cancelEvent(eventId, user) {
    const event = await this.getEventById(eventId, user);
    if (event.status === 'CANCELLED') {
      return { message: 'Event is already cancelled', status: 'CANCELLED' };
    }

    const updated = await eventRepository.softDelete(eventId);
    return { message: 'Event cancelled successfully', status: updated.status, id: eventId };
  }

  async getDashboard(eventId, user) {
    const event = await this.getEventById(eventId, user);

    const [budgetRows, checklistStats, client] = await Promise.all([
      budgetRepository.findByEventId(eventId),
      checklistRepository.getChecklistStats(eventId),
      getClient(),
    ]);

    let bookingRows = [];
    try {
      const bRes = await client.query(
        'SELECT id, service_id, package_id, category, price_snapshot, status FROM bookings WHERE event_id = $1',
        [eventId]
      );
      bookingRows = bRes.rows;
    } finally {
      client.release();
    }

    const totalBudget = Number(event.budget);
    const plannedBudget = budgetRows.reduce((sum, b) => sum + Number(b.planned_amount), 0);
    const actualSpend = budgetRows.reduce((sum, b) => sum + Number(b.actual_amount), 0);

    const budgetSummary = {
      totalBudget,
      plannedBudget,
      actualSpend,
      remainingBudget: totalBudget - actualSpend,
    };

    const checklistSummary = {
      total: checklistStats.total,
      completed: checklistStats.completed,
      percentage: checklistStats.total ? Math.round((checklistStats.completed / checklistStats.total) * 100) : 0,
    };

    return {
      event,
      metrics: {
        total_budget: totalBudget,
        planned_budget: plannedBudget,
        actual_spend: actualSpend,
        remaining_budget: totalBudget - actualSpend,
        checklist_progress: checklistSummary,
        bookings_count: bookingRows.length,
      },
      budgetSummary,
      checklistSummary,
      budget: budgetRows,
      bookings: bookingRows,
    };
  }
}

module.exports = new EventService();
