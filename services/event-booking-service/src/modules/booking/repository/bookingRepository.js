const { query } = require('../../../shared/db/pool');

class BookingRepository {
  async createBooking(bookingData, client = null) {
    const {
      eventId,
      eventItemId,
      customerId,
      vendorId,
      serviceId,
      packageId,
      category,
      bookingDate,
      vendorNameSnapshot,
      packageNameSnapshot,
      priceSnapshot,
      agreedAmountPaise,
      depositAmountPaise,
      balanceAmountPaise,
      securityDepositPaise,
      rushSurchargePaise,
      vendorResponseDueAt,
      quantity,
      addonIds,
      notes,
      status,
    } = bookingData;

    const initialStatus = status || 'REQUESTED';

    const sql = `
      INSERT INTO bookings (
        event_id, event_item_id, customer_id, vendor_id, service_id, package_id, category,
        booking_date, vendor_name_snapshot, package_name_snapshot, price_snapshot,
        agreed_amount_paise, deposit_amount_paise, balance_amount_paise,
        security_deposit_paise, rush_surcharge_paise, quantity, addon_ids, notes,
        status, vendor_response_due_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *;
    `;

    const params = [
      eventId || null,
      eventItemId || null,
      customerId,
      vendorId,
      serviceId || packageId,
      packageId,
      category || null,
      bookingDate,
      vendorNameSnapshot || 'Verified Vendor',
      packageNameSnapshot || 'Standard Package',
      priceSnapshot || (agreedAmountPaise ? agreedAmountPaise / 100 : 0),
      agreedAmountPaise || Math.round(Number(priceSnapshot || 0) * 100),
      depositAmountPaise || Math.round(Number(agreedAmountPaise || 0) * 0.4),
      balanceAmountPaise || Math.round(Number(agreedAmountPaise || 0) * 0.6),
      securityDepositPaise || 0,
      rushSurchargePaise || 0,
      quantity || 1,
      JSON.stringify(addonIds || []),
      notes || null,
      initialStatus,
      vendorResponseDueAt || null,
    ];

    const res = client ? await client.query(sql, params) : await query(sql, params);
    const row = res.rows[0];
    if (row && bookingData.items) {
      row.items = bookingData.items;
    }
    return row;
  }

  async findById(id, client = null) {
    const sql = `SELECT * FROM bookings WHERE id = $1;`;
    const res = client ? await client.query(sql, [id]) : await query(sql, [id]);
    return res.rows[0] || null;
  }

  async findByCustomerId(customerId, filter = {}, limit = 20, offset = 0) {
    let sql = `SELECT * FROM bookings WHERE customer_id = $1`;
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
    return parseInt(res.rows[0].total || '0', 10);
  }

  async findByVendorId(vendorId, filter = {}, limit = 20, offset = 0) {
    let sql = `SELECT * FROM bookings WHERE vendor_id = $1`;
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
    return parseInt(res.rows[0].total || '0', 10);
  }

  async findAll(filter = {}, limit = 20, offset = 0) {
    let sql = `SELECT * FROM bookings WHERE 1=1`;
    const params = [];

    if (filter.status) {
      params.push(filter.status);
      sql += ` AND status = $${params.length}`;
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

    const res = await query(sql, params);
    return parseInt(res.rows[0].total || '0', 10);
  }

  async updateStatus(id, status, fields = {}, client = null) {
    const keys = Object.keys(fields);
    const setClauses = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
    const params = [status, id];

    keys.forEach((key) => {
      const dbCol = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      params.push(fields[key]);
      setClauses.push(`${dbCol} = $${params.length}`);
    });

    const sql = `
      UPDATE bookings
      SET ${setClauses.join(', ')}
      WHERE id = $2
      RETURNING *;
    `;

    const res = client ? await client.query(sql, params) : await query(sql, params);
    return res.rows[0] || null;
  }

  async updateFields(id, fields = {}, client = null) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return this.findById(id, client);

    const setClauses = ['updated_at = CURRENT_TIMESTAMP'];
    const params = [id];

    keys.forEach((key) => {
      const dbCol = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      params.push(fields[key]);
      setClauses.push(`${dbCol} = $${params.length}`);
    });

    const sql = `
      UPDATE bookings
      SET ${setClauses.join(', ')}
      WHERE id = $1
      RETURNING *;
    `;

    const res = client ? await client.query(sql, params) : await query(sql, params);
    return res.rows[0] || null;
  }

  async findExpiredPending(client = null) {
    const sql = `
      SELECT * FROM bookings
      WHERE (status = 'PENDING' OR status = 'REQUESTED')
        AND vendor_response_due_at < CURRENT_TIMESTAMP;
    `;
    const res = client ? await client.query(sql) : await query(sql);
    return res.rows;
  }

  async findExpiredAccepted(client = null) {
    const sql = `
      SELECT * FROM bookings
      WHERE status = 'ACCEPTED'
        AND (payment_due_at < CURRENT_TIMESTAMP OR deposit_due_at < CURRENT_TIMESTAMP);
    `;
    const res = client ? await client.query(sql) : await query(sql);
    return res.rows;
  }
}

module.exports = new BookingRepository();
