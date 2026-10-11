const crypto = require('crypto');

/**
 * Resilient In-Memory Datastore for event-booking-service
 * Used as standalone dev fallback when local PostgreSQL or Docker is offline.
 */
class InMemoryStore {
  constructor() {
    this.events = new Map();
    this.eventBudget = new Map();
    this.eventChecklist = new Map();
    this.bookings = new Map();
    this.bookingHistory = new Map();
    this.processedEvents = new Set();

    // Pre-populate seed event for instantaneous rich testing in UI
    const seedEventId = 'evt-demo-1001';
    const today = new Date();
    const eventDate = new Date(today.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    this.events.set(seedEventId, {
      id: seedEventId,
      customer_id: 'usr_123',
      name: 'Aarav & Maya Grand Wedding',
      event_type: 'Wedding',
      event_date: eventDate,
      budget: 500000.0,
      guest_count: 200,
      city: 'Ahmedabad',
      status: 'PLANNING',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const budgetCategories = [
      { category: 'Venue & Catering', planned_amount: 250000.0, actual_amount: 120000.0 },
      { category: 'Photography & Video', planned_amount: 75000.0, actual_amount: 0.0 },
      { category: 'Decoration & Floral', planned_amount: 75000.0, actual_amount: 0.0 },
      { category: 'Music & Entertainment', planned_amount: 50000.0, actual_amount: 0.0 },
      { category: 'Makeup & Styling', planned_amount: 25000.0, actual_amount: 0.0 },
      { category: 'Miscellaneous', planned_amount: 25000.0, actual_amount: 0.0 },
    ];

    budgetCategories.forEach((b) => {
      const bId = `bgt-${crypto.randomUUID()}`;
      this.eventBudget.set(bId, {
        id: bId,
        event_id: seedEventId,
        category: b.category,
        planned_amount: b.planned_amount,
        actual_amount: b.actual_amount,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    });

    const tasks = [
      { task: 'Book Banquet Venue & Tasting Menu', category: 'Venue & Catering', done: true, due_days: 10 },
      { task: 'Hire Traditional & Candid Photographer', category: 'Photography & Video', done: false, due_days: 20 },
      { task: 'Finalize Stage Decor & Lighting theme', category: 'Decoration & Floral', done: false, due_days: 30 },
      { task: 'Select DJ & Sound System Vendor', category: 'Music & Entertainment', done: false, due_days: -2 }, // Overdue
      { task: 'Book Bridal & Groom Makeup Artist', category: 'Makeup & Styling', done: false, due_days: 35 },
    ];

    tasks.forEach((t) => {
      const cId = `chk-${crypto.randomUUID()}`;
      const d = new Date(today.getTime() + t.due_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      this.eventChecklist.set(cId, {
        id: cId,
        event_id: seedEventId,
        task: t.task,
        category: t.category,
        due_date: d,
        done: t.done,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    });

    const seedBookingId = 'bkg-demo-2001';
    this.bookings.set(seedBookingId, {
      id: seedBookingId,
      event_id: seedEventId,
      customer_id: 'usr_123',
      vendor_id: 'vnd_456',
      service_id: 'svc_789',
      package_id: 'pkg_111',
      category: 'Venue & Catering',
      booking_date: eventDate,
      vendor_name_snapshot: 'Grand Palace Banquet',
      package_name_snapshot: 'Royal Feast Package',
      price_snapshot: 120000.0,
      status: 'CONFIRMED',
      vendor_response_due_at: null,
      payment_due_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  async executeQuery(text, params = []) {
    const cleanSql = text.replace(/\s+/g, ' ').trim();

    // 1. Transaction markers
    if (/^(BEGIN|COMMIT|ROLLBACK)/i.test(cleanSql)) {
      return { rows: [], rowCount: 0 };
    }

    // 2. EVENTS
    if (/INSERT INTO events/i.test(cleanSql)) {
      const [customerId, name, eventType, eventDate, budget, guestCount, city] = params;
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const event = {
        id,
        customer_id: customerId,
        name,
        event_type: eventType,
        event_date: eventDate,
        budget: Number(budget),
        guest_count: Number(guestCount),
        city: city || null,
        status: 'PLANNING',
        created_at: now,
        updated_at: now,
      };
      this.events.set(id, event);
      return { rows: [event], rowCount: 1 };
    }

    if (/SELECT .* FROM events WHERE id =/i.test(cleanSql)) {
      const id = params[0];
      const event = this.events.get(id);
      return { rows: event ? [event] : [], rowCount: event ? 1 : 0 };
    }

    if (/SELECT COUNT\(\*\) .* FROM events WHERE customer_id/i.test(cleanSql)) {
      const customerId = params[0];
      const status = params[1];
      const count = Array.from(this.events.values()).filter(
        (e) => e.customer_id === customerId && (!status || e.status === status)
      ).length;
      return { rows: [{ total: count.toString() }], rowCount: 1 };
    }

    if (/SELECT .* FROM events WHERE customer_id/i.test(cleanSql)) {
      const customerId = params[0];
      let rows = Array.from(this.events.values()).filter((e) => e.customer_id === customerId);
      if (params.length >= 2 && typeof params[1] === 'string' && !/^\d+$/.test(params[1])) {
        rows = rows.filter((e) => e.status === params[1]);
      }
      rows.sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
      return { rows, rowCount: rows.length };
    }

    if (/UPDATE events SET/i.test(cleanSql)) {
      let id = null;
      if (/WHERE id = \$1\b/i.test(cleanSql)) {
        id = params[0];
      } else {
        id = params[params.length - 1];
      }
      const event = this.events.get(id);
      if (!event) return { rows: [], rowCount: 0 };

      if (/status = 'CANCELLED'/i.test(cleanSql) || /status = \$2/i.test(cleanSql)) {
        event.status = 'CANCELLED';
      }

      const setPartMatch = cleanSql.match(/SET (.+?) WHERE/i);
      if (setPartMatch) {
        const clauses = setPartMatch[1].split(',').map((s) => s.trim());
        clauses.forEach((clause) => {
          const m = clause.match(/([a-zA-Z0-9_]+)\s*=\s*\$(\d+)/);
          if (m) {
            const field = m[1];
            const paramIdx = parseInt(m[2], 10) - 1;
            const val = params[paramIdx];
            if (field === 'name') event.name = val;
            else if (field === 'event_type') event.event_type = val;
            else if (field === 'event_date') event.event_date = val;
            else if (field === 'budget') event.budget = Number(val);
            else if (field === 'guest_count') event.guest_count = Number(val);
            else if (field === 'city') event.city = val;
            else if (field === 'status') event.status = val;
          }
        });
      }

      event.updated_at = new Date().toISOString();
      return { rows: [event], rowCount: 1 };
    }

    // 3. BUDGET
    if (/INSERT INTO event_budget/i.test(cleanSql)) {
      const rows = [];
      const now = new Date().toISOString();
      for (let i = 0; i < params.length; i += 3) {
        const eventId = params[i];
        const category = params[i + 1];
        const plannedAmount = Number(params[i + 2]);
        const id = crypto.randomUUID();
        const b = {
          id,
          event_id: eventId,
          category,
          planned_amount: plannedAmount,
          actual_amount: 0.0,
          created_at: now,
          updated_at: now,
        };
        this.eventBudget.set(id, b);
        rows.push(b);
      }
      return { rows, rowCount: rows.length };
    }

    if (/SELECT .* FROM event_budget WHERE event_id =/i.test(cleanSql)) {
      const eventId = params[0];
      const rows = Array.from(this.eventBudget.values()).filter((b) => b.event_id === eventId);
      return { rows, rowCount: rows.length };
    }

    if (/UPDATE event_budget SET planned_amount/i.test(cleanSql)) {
      const [eventId, category, plannedAmount] = params;
      const b = Array.from(this.eventBudget.values()).find(
        (item) => item.event_id === eventId && item.category === category
      );
      if (b) {
        b.planned_amount = Number(plannedAmount);
        b.updated_at = new Date().toISOString();
        return { rows: [b], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    if (/UPDATE event_budget SET actual_amount = actual_amount \+/i.test(cleanSql)) {
      const [amount, eventId, category] = params;
      const b = Array.from(this.eventBudget.values()).find(
        (item) => item.event_id === eventId && item.category === category
      );
      if (b) {
        b.actual_amount = (Number(b.actual_amount) || 0) + Number(amount);
        b.updated_at = new Date().toISOString();
        return { rows: [b], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    // 4. CHECKLIST
    if (false && /INSERT INTO event_checklist/i.test(cleanSql) && params.length > 4) {
      // Bulk insert
      const rows = [];
      const now = new Date().toISOString();
      for (let i = 0; i < params.length; i += 4) {
        const eventId = params[i];
        const task = params[i + 1];
        const category = params[i + 2];
        const dueDate = params[i + 3];
        const id = crypto.randomUUID();
        const c = {
          id,
          event_id: eventId,
          task,
          category,
          due_date: dueDate,
          done: false,
          created_at: now,
          updated_at: now,
        };
        this.eventChecklist.set(id, c);
        rows.push(c);
      }
      return { rows, rowCount: rows.length };
    }

    if (/INSERT INTO event_checklist/i.test(cleanSql)) {
      const [eventId, task, category, dueDate, done] = params;
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const c = {
        id,
        event_id: eventId,
        task,
        category: category || null,
        due_date: dueDate || null,
        done: Boolean(done),
        created_at: now,
        updated_at: now,
      };
      this.eventChecklist.set(id, c);
      return { rows: [c], rowCount: 1 };
    }

    if (/SELECT.*COUNT\(CASE.*FROM event_checklist WHERE event_id =/i.test(cleanSql)) {
      const eventId = params[0];
      const items = Array.from(this.eventChecklist.values()).filter((c) => c.event_id === eventId);
      const today = new Date().toISOString().split('T')[0];
      const total = items.length;
      const completed = items.filter((c) => c.done).length;
      const pending = items.filter((c) => !c.done).length;
      const overdue = items.filter((c) => !c.done && c.due_date && c.due_date < today).length;
      return {
        rows: [{ total, completed, pending, overdue }],
        rowCount: 1,
      };
    }

    if (/SELECT .* FROM event_checklist WHERE event_id =/i.test(cleanSql)) {
      const eventId = params[0];
      const rows = Array.from(this.eventChecklist.values()).filter((c) => c.event_id === eventId);
      rows.sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));
      return { rows, rowCount: rows.length };
    }

    if (/SELECT .* FROM event_checklist WHERE id =/i.test(cleanSql)) {
      const id = params[0];
      const item = this.eventChecklist.get(id);
      return { rows: item ? [item] : [], rowCount: item ? 1 : 0 };
    }

    if (/UPDATE event_checklist SET/i.test(cleanSql)) {
      let id = null;
      if (/WHERE id = \$1\b/i.test(cleanSql)) {
        id = params[0];
      } else {
        id = params[params.length - 1];
      }

      const item = this.eventChecklist.get(id);
      if (!item) return { rows: [], rowCount: 0 };

      const setPartMatch = cleanSql.match(/SET (.+?) WHERE/i);
      if (setPartMatch) {
        const clauses = setPartMatch[1].split(',').map((s) => s.trim());
        clauses.forEach((clause) => {
          const m = clause.match(/([a-zA-Z0-9_]+)\s*=\s*\$(\d+)/);
          if (m) {
            const field = m[1];
            const paramIdx = parseInt(m[2], 10) - 1;
            const val = params[paramIdx];
            if (field === 'done') item.done = Boolean(val);
            else if (field === 'task') item.task = val;
            else if (field === 'category') item.category = val;
            else if (field === 'due_date') item.due_date = val;
          }
        });
      } else {
        params.forEach((val) => {
          if (typeof val === 'boolean') item.done = val;
        });
      }

      item.updated_at = new Date().toISOString();
      return { rows: [item], rowCount: 1 };
    }

    if (/DELETE FROM event_checklist WHERE id =/i.test(cleanSql)) {
      const id = params[0];
      const existed = this.eventChecklist.delete(id);
      return { rows: existed ? [{ id }] : [], rowCount: existed ? 1 : 0 };
    }

    // 5. BOOKINGS
    if (/INSERT INTO bookings/i.test(cleanSql)) {
      const [
        eventId,
        customerId,
        vendorId,
        serviceId,
        packageId,
        category,
        bookingDate,
        vendorNameSnapshot,
        packageNameSnapshot,
        priceSnapshot,
        vendorResponseDueAt,
      ] = params;
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const booking = {
        id,
        event_id: eventId,
        customer_id: customerId,
        vendor_id: vendorId,
        service_id: serviceId,
        package_id: packageId,
        category,
        booking_date: bookingDate,
        vendor_name_snapshot: vendorNameSnapshot,
        package_name_snapshot: packageNameSnapshot,
        price_snapshot: Number(priceSnapshot),
        status: 'PENDING',
        vendor_response_due_at: vendorResponseDueAt,
        payment_due_at: null,
        cancellation_reason: null,
        rejection_reason: null,
        cancelled_by: null,
        created_at: now,
        updated_at: now,
      };
      this.bookings.set(id, booking);
      return { rows: [booking], rowCount: 1 };
    }

    if (/SELECT .* FROM bookings WHERE id =/i.test(cleanSql)) {
      const id = params[0];
      const b = this.bookings.get(id);
      return { rows: b ? [b] : [], rowCount: b ? 1 : 0 };
    }

    if (/SELECT .* FROM bookings WHERE customer_id/i.test(cleanSql)) {
      const customerId = params[0];
      const rows = Array.from(this.bookings.values()).filter((b) => b.customer_id === customerId);
      return { rows, rowCount: rows.length };
    }

    if (/SELECT .* FROM bookings WHERE event_id =/i.test(cleanSql)) {
      const eventId = params[0];
      const rows = Array.from(this.bookings.values()).filter((b) => b.event_id === eventId);
      return { rows, rowCount: rows.length };
    }

    if (/SELECT .* FROM bookings WHERE vendor_id =/i.test(cleanSql)) {
      const vendorId = params[0];
      const rows = Array.from(this.bookings.values()).filter((b) => b.vendor_id === vendorId);
      return { rows, rowCount: rows.length };
    }

    if (/status = 'PENDING' AND vendor_response_due_at </i.test(cleanSql)) {
      const now = new Date().toISOString();
      const rows = Array.from(this.bookings.values()).filter(
        (b) => b.status === 'PENDING' && b.vendor_response_due_at && b.vendor_response_due_at < now
      );
      return { rows, rowCount: rows.length };
    }

    if (/status = 'ACCEPTED' AND payment_due_at </i.test(cleanSql)) {
      const now = new Date().toISOString();
      const rows = Array.from(this.bookings.values()).filter(
        (b) => b.status === 'ACCEPTED' && b.payment_due_at && b.payment_due_at < now
      );
      return { rows, rowCount: rows.length };
    }

    if (/SELECT .* FROM bookings/i.test(cleanSql)) {
      const rows = Array.from(this.bookings.values());
      return { rows, rowCount: rows.length };
    }

    if (/UPDATE bookings SET status =/i.test(cleanSql)) {
      const id = params[params.length - 1];
      const booking = this.bookings.get(id);
      if (!booking) return { rows: [], rowCount: 0 };

      const status = params[0];
      booking.status = status;
      if (params.length > 2) {
        if (cleanSql.includes('payment_due_at')) booking.payment_due_at = params[1];
        if (cleanSql.includes('rejection_reason')) booking.rejection_reason = params[1];
        if (cleanSql.includes('cancellation_reason')) {
          booking.cancellation_reason = params[1];
          booking.cancelled_by = params[2];
        }
      }
      booking.updated_at = new Date().toISOString();
      return { rows: [booking], rowCount: 1 };
    }

    // 6. HISTORY
    if (/INSERT INTO booking_status_history/i.test(cleanSql)) {
      const [bookingId, fromStatus, toStatus, changedBy, reason] = params;
      const id = crypto.randomUUID();
      const h = {
        id,
        booking_id: bookingId,
        from_status: fromStatus,
        to_status: toStatus,
        changed_by: changedBy,
        reason: reason || null,
        created_at: new Date().toISOString(),
      };
      if (!this.bookingHistory.has(bookingId)) {
        this.bookingHistory.set(bookingId, []);
      }
      this.bookingHistory.get(bookingId).push(h);
      return { rows: [h], rowCount: 1 };
    }

    if (/SELECT .* FROM booking_status_history WHERE booking_id =/i.test(cleanSql)) {
      const bookingId = params[0];
      const rows = this.bookingHistory.get(bookingId) || [];
      return { rows, rowCount: rows.length };
    }

    // Default fallback
    return { rows: [], rowCount: 0 };
  }
}

const memoryStore = new InMemoryStore();
module.exports = memoryStore;
