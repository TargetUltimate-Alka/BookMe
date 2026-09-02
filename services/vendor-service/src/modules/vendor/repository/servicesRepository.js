const db = require('../../../shared/db');
const crypto = require('crypto');

function mapServiceRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    vendorId: row.vendor_id,
    title: row.title,
    description: row.description,
    basePrice: parseFloat(row.base_price),
    createdAt: row.created_at,
  };
}

async function createService(vendorId, { title, description, basePrice }) {
  const id = `svc_${crypto.randomBytes(4).toString('hex')}`;
  const query = `
    INSERT INTO services (id, vendor_id, title, description, base_price)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  const result = await db.query(query, [id, vendorId, title, description || '', basePrice]);
  return mapServiceRow(result.rows[0]);
}

async function getServicesByVendorId(vendorId) {
  const query = `SELECT * FROM services WHERE vendor_id = $1 ORDER BY created_at ASC;`;
  const result = await db.query(query, [vendorId]);
  return result.rows.map(mapServiceRow);
}

async function getServiceById(serviceId) {
  const query = `SELECT * FROM services WHERE id = $1;`;
  const result = await db.query(query, [serviceId]);
  return mapServiceRow(result.rows[0]);
}

async function updateService(serviceId, vendorId, updateFields) {
  const allowedFields = {
    title: 'title',
    description: 'description',
    basePrice: 'base_price',
  };

  const setClauses = [];
  const values = [];
  let paramIndex = 1;

  for (const [key, dbColumn] of Object.entries(allowedFields)) {
    if (updateFields[key] !== undefined) {
      setClauses.push(`${dbColumn} = $${paramIndex++}`);
      values.push(updateFields[key]);
    }
  }

  if (setClauses.length === 0) {
    return getServiceById(serviceId);
  }

  values.push(serviceId);
  values.push(vendorId);
  const query = `
    UPDATE services
    SET ${setClauses.join(', ')}
    WHERE id = $${paramIndex++} AND vendor_id = $${paramIndex}
    RETURNING *;
  `;

  const result = await db.query(query, values);
  return mapServiceRow(result.rows[0]);
}

async function deleteService(serviceId, vendorId) {
  const query = `DELETE FROM services WHERE id = $1 AND vendor_id = $2 RETURNING id;`;
  const result = await db.query(query, [serviceId, vendorId]);
  return result.rowCount > 0;
}

module.exports = {
  createService,
  getServicesByVendorId,
  getServiceById,
  updateService,
  deleteService,
};
