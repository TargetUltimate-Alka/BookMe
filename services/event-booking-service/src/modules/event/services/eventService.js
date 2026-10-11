const { getClient } = require('../../../shared/db/pool');
const eventRepository = require('../repository/eventRepository');
const budgetRepository = require('../repository/budgetRepository');
const checklistRepository = require('../repository/checklistRepository');
const { calculateDefaultBudget } = require('../constants/budgetTemplates');
const { generateDefaultChecklist } = require('../constants/checklistTemplates');
const logger = require('../../../shared/logger');

class EventService {
  /**
   * Create an event with transactional default budget and checklist generation
   */
  async createEvent(customerId, eventData) {
    const today = new Date().toISOString().split('T')[0];
    if (eventData.event_date < today) {
      const err = new Error('event_date must be today or in the future');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = [{ field: 'event_date', issue: 'Date cannot be in the past' }];
      throw err;
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // 1. Insert Event
      const event = await eventRepository.createEvent(
        {
          customerId,
          name: eventData.name,
          eventType: eventData.event_type,
          eventDate: eventData.event_date,
          budget: Number(eventData.budget),
          guestCount: Number(eventData.guest_count),
          city: eventData.city,
        },
        client
      );

      // 2. Generate and Insert Default Budget
      const defaultBudget = calculateDefaultBudget(event.event_type, event.budget);
      const budgetItems = await budgetRepository.insertBatch(event.id, defaultBudget, client);

      // 3. Generate and Insert Default Checklist Tasks
      const defaultChecklist = generateDefaultChecklist(event.event_type, event.event_date);
      const checklistItems = await checklistRepository.insertBatch(event.id, defaultChecklist, client);

      await client.query('COMMIT');

      logger.info(`Event created successfully: ${event.id}`, { customerId, eventId: event.id });

      return {
        ...event,
        budget_items: budgetItems.map((b) => ({
          category: b.category,
          planned_amount: Number(b.planned_amount),
          actual_amount: Number(b.actual_amount),
        })),
        checklist_count: checklistItems.length,
      };
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

      return {
        ...evt,
        budget: Number(evt.budget),
        days_left: Math.max(0, diffDays),
      };
    });

    return {
      data: enriched,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
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

    if (user.role !== 'admin' && event.customer_id !== user.id) {
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

    return {
      ...event,
      budget: Number(event.budget),
      days_left: Math.max(0, diffDays),
    };
  }

  async updateEvent(eventId, user, updateData) {
    // 1. Verify access
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

    const updated = await eventRepository.updateEvent(eventId, updateData);
    return {
      ...updated,
      budget: Number(updated.budget),
    };
  }

  async cancelEvent(eventId, user) {
    const event = await this.getEventById(eventId, user);
    if (event.status === 'CANCELLED') {
      return { message: 'Event is already cancelled', status: 'CANCELLED' };
    }

    const updated = await eventRepository.softDelete(eventId);
    return { message: 'Event cancelled successfully', status: updated.status };
  }

  async getDashboard(eventId, user) {
    const event = await this.getEventById(eventId, user);

    const [budgetRows, checklistStats, client] = await Promise.all([
      budgetRepository.findByEventId(eventId),
      checklistRepository.getChecklistStats(eventId),
      getClient(),
    ]);

    // Query bookings for this event (safe direct read in same service database)
    let bookingRows = [];
    try {
      const bRes = await client.query(
        `SELECT id, vendor_id, service_id, package_id, category, booking_date, 
                vendor_name_snapshot, package_name_snapshot, price_snapshot, status
         FROM bookings
         WHERE event_id = $1
         ORDER BY created_at DESC;`,
        [eventId]
      );
      bookingRows = bRes.rows;
    } finally {
      client.release();
    }

    // Budget aggregation
    let plannedTotal = 0;
    let actualTotal = 0;
    for (const b of budgetRows) {
      plannedTotal += Number(b.planned_amount);
      actualTotal += Number(b.actual_amount);
    }

    const remaining = Math.max(0, event.budget - actualTotal);
    const overBudget = actualTotal > event.budget;

    // Progress percentage calculation:
    // (distinct categories with a CONFIRMED booking) ÷ (budget categories count) × 100
    const confirmedCategories = new Set(
      bookingRows
        .filter((b) => b.status === 'CONFIRMED' || b.status === 'COMPLETED')
        .map((b) => b.category)
        .filter(Boolean)
    );

    const totalCategoriesCount = Math.max(1, budgetRows.length);
    const progressPercentage = Math.min(
      100,
      parseFloat(((confirmedCategories.size / totalCategoriesCount) * 100).toFixed(1))
    );

    return {
      event: {
        id: event.id,
        name: event.name,
        event_type: event.event_type,
        event_date: event.event_date,
        days_left: event.days_left,
        status: event.status,
      },
      progress: {
        percentage: progressPercentage,
        confirmed_categories: confirmedCategories.size,
        total_budget_categories: totalCategoriesCount,
      },
      budget: {
        total: event.budget,
        planned: plannedTotal,
        actual: actualTotal,
        remaining,
        overBudget,
      },
      checklist: {
        total: checklistStats.total || 0,
        completed: checklistStats.completed || 0,
        pending: checklistStats.pending || 0,
        overdue: checklistStats.overdue || 0,
      },
      bookings: bookingRows.map((b) => ({
        id: b.id,
        vendor_id: b.vendor_id,
        vendor_name: b.vendor_name_snapshot,
        package_name: b.package_name_snapshot,
        category: b.category,
        amount: Number(b.price_snapshot),
        status: b.status,
        booking_date: b.booking_date,
      })),
    };
  }
}

module.exports = new EventService();
