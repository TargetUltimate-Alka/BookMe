const db = require('../../../shared/db');
const crypto = require('crypto');

function mapAvailabilityRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    vendorId: row.vendor_id,
    date: row.date ? row.date.toISOString().split('T')[0] : null,
    status: row.status,
    reason: row.reason,
    createdAt: row.created_at,
  };
}

async function checkAvailability(vendorId, dateStr) {
  const query = `
    SELECT * FROM availability
    WHERE vendor_id = $1 AND date = $2;
  `;
  const result = await db.query(query, [vendorId, dateStr]);

  if (result.rows.length === 0) {
    return {
      date: dateStr,
      available: true,
      blockedSlots: [],
    };
  }

  const blockedSlots = result.rows.map(mapAvailabilityRow);
  return {
    date: dateStr,
    available: false,
    blockedSlots,
  };
}

async function blockDate(vendorId, { date, reason }) {
  const id = `blk_${crypto.randomBytes(4).toString('hex')}`;
  const query = `
    INSERT INTO availability (id, vendor_id, date, status, reason)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (vendor_id, date) DO UPDATE
    SET status = EXCLUDED.status, reason = EXCLUDED.reason
    RETURNING *;
  `;
  const result = await db.query(query, [id, vendorId, date, 'BLOCKED', reason || 'Blocked by vendor']);
  return mapAvailabilityRow(result.rows[0]);
}

async function unblockDate(vendorId, blockId) {
  const query = `
    DELETE FROM availability
    WHERE id = $1 AND vendor_id = $2
    RETURNING id;
  `;
  const result = await db.query(query, [blockId, vendorId]);
  return result.rowCount > 0;
}

async function getVendorBlockedDates(vendorId) {
  const query = `
    SELECT * FROM availability
    WHERE vendor_id = $1
    ORDER BY date ASC;
  `;
  const result = await db.query(query, [vendorId]);
  return result.rows.map(mapAvailabilityRow);
}

module.exports = {
  checkAvailability,
  blockDate,
  unblockDate,
  getVendorBlockedDates,
};
