const db = require('../../../shared/db');
const crypto = require('crypto');

function mapPackageRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    vendorId: row.vendor_id,
    name: row.name,
    price: parseFloat(row.price),
    serviceIds: row.service_ids || [],
    createdAt: row.created_at,
  };
}

async function createPackage(vendorId, { name, serviceIds, price }) {
  const id = `pkg_${crypto.randomBytes(4).toString('hex')}`;
  const query = `
    INSERT INTO packages (id, vendor_id, name, service_ids, price)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  const result = await db.query(query, [id, vendorId, name, serviceIds || [], price]);
  return mapPackageRow(result.rows[0]);
}

async function getPackagesByVendorId(vendorId) {
  const query = `SELECT * FROM packages WHERE vendor_id = $1 ORDER BY created_at ASC;`;
  const result = await db.query(query, [vendorId]);
  return result.rows.map(mapPackageRow);
}

async function getPackageById(packageId) {
  const query = `SELECT * FROM packages WHERE id = $1;`;
  const result = await db.query(query, [packageId]);
  return mapPackageRow(result.rows[0]);
}

async function updatePackage(packageId, vendorId, updateFields) {
  const allowedFields = {
    name: 'name',
    serviceIds: 'service_ids',
    price: 'price',
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
    return getPackageById(packageId);
  }

  values.push(packageId);
  values.push(vendorId);
  const query = `
    UPDATE packages
    SET ${setClauses.join(', ')}
    WHERE id = $${paramIndex++} AND vendor_id = $${paramIndex}
    RETURNING *;
  `;

  const result = await db.query(query, values);
  return mapPackageRow(result.rows[0]);
}

async function deletePackage(packageId, vendorId) {
  const query = `DELETE FROM packages WHERE id = $1 AND vendor_id = $2 RETURNING id;`;
  const result = await db.query(query, [packageId, vendorId]);
  return result.rowCount > 0;
}

module.exports = {
  createPackage,
  getPackagesByVendorId,
  getPackageById,
  updatePackage,
  deletePackage,
};
