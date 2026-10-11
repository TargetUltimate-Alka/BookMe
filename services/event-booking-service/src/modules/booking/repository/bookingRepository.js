const { query } = require('../../../shared/db/pool');

class BookingRepository {
  async createBooking(bookingData, client = null) {
    const {
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
    } = bookingData;

    const sql = `
      INSERT INTO bookings (
        event_id, customer_id, vendor_id, service_id, package_id, category,
        booking_date, vendor_name_snapshot, package_name_snapshot, price_snapshot,
        status, vendor_response_due_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PENDING', $11)
      RETURNING id, event_id, customer_id, vendor_id, service_id, package_id, category,
                booking_date, vendor_name_snapshot, package_name_snapshot, price_snapshot,
                status, vendor_response_due_at, payment_due_at, created_at, updated_at;
    `;

    const params = [
      eventId,
      customerId,
      vendorId,
      serviceId,
      packageId,
      category || null,
      bookingDate,
      vendorNameSnapshot,
      packageNameSnapshot || null,
      priceSnapshot,
      vendorResponseDueAt,
    ];

    const res = client ? await client.query(sql, params) : await query(sql, params);
    const row = res.rows[0];
    if (row && bookingData.items) {
      row.items = bookingData.items;
    }
    return row;
  }

  async findById(id, client = null) {
    const sql = `
      SELECT id, event_id, customer_id, vendor_id, service_id, package_id, category,
             booking_date, vendor_name_snapshot, package_name_snapshot, price_snapshot,
             status, vendor_response_due_at, payment_due_at, rejection_reason, cancellation_reason,
             cancelled_by, created_at, updated_at
      FROM bookings
      WHERE id = $1;
    `;
    const res = client ? await client.query(sql, [id]) : await query(sql, [id]);
    return res.rows[0] || null;
  }

  async findByCustomerId(customerId, filter = {}, limit = 20, offset = 0) {
    let sql = `
      SELECT id, event_id, customer_id, vendor_id, service_id, package_id, category,
             booking_date, vendor_name_snapshot, package_name_snapshot, price_snapshot,
             status, vendor_response_due_at, payment_due_at, created_at, updated_at
      FROM bookings
      WHERE customer_id = $1
    `;
    const params = [customerId];

    if (filter.status) {
      params.push(filter.status);
      sql += ` AND status = $${params.length}`;
    }
    if (filter.eventId) {
      params.push(filter.eventId);
      sql += ` AND event_id = $${params.length}`;
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2};`;
    params.push(limit, offset);

    const res = await query(sql, params);
    return res.rows;
  }

  async countByCustomerId(customerId, filter = {}) {
    let sql = `SELECT COUNT(*) AS total FROM bookings WHERE customer_id = $1`;
    const params = [customerId];

    if (filter.status) {
      params.push(filter.status);
      sql += ` AND status = $${params.length}`;
    }
    if (filter.eventId) {
      params.push(filter.eventId);
      sql += ` AND event_id = $${params.length}`;
    }

    const res = await query(sql, params);
    return parseInt(res.rows[0].total, 10);
  }

  async findByVendorId(vendorId, filter = {}, limit = 20, offset = 0) {
    let sql = `
      SELECT id, event_id, customer_id, vendor_id, service_id, package_id, category,
             booking_date, vendor_name_snapshot, package_name_snapshot, price_snapshot,
             status, vendor_response_due_at, payment_due_at, created_at, updated_at
      FROM bookings
      WHERE vendor_id = $1
    `;
    const params = [vendorId];

    if (filter.status) {
      params.push(filter.status);
      sql += ` AND status = $${params.length}`;
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2};`;
    params.push(limit, offset);

    const res = await query(sql, params);
    return res.rows;
  }

  async countByVendorId(vendorId, filter = {}) {
    let sql = `SELECT COUNT(*) AS total FROM bookings WHERE vendor_id = $1`;
    const params = [vendorId];

    if (filter.status) {
      params.push(filter.status);
      sql += ` AND status = $${params.length}`;
    }

    const res = await query(sql, params);
    return parseInt(res.rows[0].total, 10);
  }

  async updateStatus(id, newStatus, extra = {}, client = null) {
    const setClauses = ['status = $2', 'updated_at = CURRENT_TIMESTAMP'];
    const params = [id, newStatus];

    if (extra.paymentDueAt !== undefined) {
      params.push(extra.paymentDueAt);
      setClauses.push(`payment_due_at = $${params.length}`);
    }
    if (extra.rejectionReason !== undefined) {
      params.push(extra.rejectionReason);
      setClauses.push(`rejection_reason = $${params.length}`);
    }
    if (extra.cancellationReason !== undefined) {
      params.push(extra.cancellationReason);
      setClauses.push(`cancellation_reason = $${params.length}`);
    }
    if (extra.cancelledBy !== undefined) {
      params.push(extra.cancelledBy);
      setClauses.push(`cancelled_by = $${params.length}`);
    }

    const sql = `
      UPDATE bookings
      SET ${setClauses.join(', ')}
      WHERE id = $1
      RETURNING id, event_id, customer_id, vendor_id, service_id, package_id, category,
                booking_date, vendor_name_snapshot, package_name_snapshot, price_snapshot,
                status, vendor_response_due_at, payment_due_at, rejection_reason,
                cancellation_reason, cancelled_by, created_at, updated_at;
    `;

    const res = client ? await client.query(sql, params) : await query(sql, params);
    return res.rows[0] || null;
  }

  async findExpiredPending(client = null) {
    const sql = `
      SELECT id, event_id, customer_id, vendor_id, service_id, booking_date, status
      FROM bookings
      WHERE status = 'PENDING' AND vendor_response_due_at < CURRENT_TIMESTAMP;
    `;
    const res = client ? await client.query(sql) : await query(sql);
    return res.rows;
  }

  async findExpiredAccepted(client = null) {
    const sql = `
      SELECT id, event_id, customer_id, vendor_id, service_id, booking_date, status
      FROM bookings
      WHERE status = 'ACCEPTED' AND payment_due_at < CURRENT_TIMESTAMP;
    `;
    const res = client ? await client.query(sql) : await query(sql);
    return res.rows;
  }

  async findAll(filter = {}, limit = 20, offset = 0) {
    let sql = `
      SELECT id, event_id, customer_id, vendor_id, service_id, package_id, category,
             booking_date, vendor_name_snapshot, package_name_snapshot, price_snapshot,
             status, vendor_response_due_at, payment_due_at, created_at, updated_at
      FROM bookings
      WHERE 1=1
    `;
    const params = [];

    if (filter.status) {
      params.push(filter.status);
      sql += ` AND status = $${params.length}`;
    }
    if (filter.vendorId) {
      params.push(filter.vendorId);
      sql += ` AND vendor_id = $${params.length}`;
    }
    if (filter.customerId) {
      params.push(filter.customerId);
      sql += ` AND customer_id = $${params.length}`;
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2};`;
    params.push(limit, offset);

    const res = await query(sql, params);
    return res.rows;
  }

  async countAll(filter = {}) {
    let sql = `SELECT COUNT(*) AS total FROM bookings WHERE 1=1`;
    const params = [];

    if (filter.status) {
      params.push(filter.status);
      sql += ` AND status = $${params.length}`;
    }
    if (filter.vendorId) {
      params.push(filter.vendorId);
      sql += ` AND vendor_id = $${params.length}`;
    }
    if (filter.customerId) {
      params.push(filter.customerId);
      sql += ` AND customer_id = $${params.length}`;
    }

    const res = await query(sql, params);
    return parseInt(res.rows[0].total, 10);
  }

  async getPlatformStats() {
    const countSql = `
      SELECT status, COUNT(*)::integer AS count
      FROM bookings
      GROUP BY status;
    `;
    const volumeSql = `
      SELECT COALESCE(SUM(price_snapshot), 0)::numeric AS gross_volume
      FROM bookings
      WHERE status IN ('CONFIRMED', 'COMPLETED');
    `;

    const [countRes, volumeRes] = await Promise.all([query(countSql), query(volumeSql)]);

    const byStatus = {
      PENDING: 0,
      ACCEPTED: 0,
      CONFIRMED: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      REJECTED: 0,
    };

    let totalBookings = 0;
    countRes.rows.forEach((r) => {
      byStatus[r.status] = r.count;
      totalBookings += r.count;
    });

    return {
      total_bookings: totalBookings,
      by_status: byStatus,
      total_gross_volume: parseFloat(volumeRes.rows[0].gross_volume),
    };
  }
}

module.exports = new BookingRepository();
