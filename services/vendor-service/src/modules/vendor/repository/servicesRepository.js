const db = require('../../../shared/db');
const inMemoryStore = require('../../../shared/inMemoryStore');
const crypto = require('crypto');

function mapServiceRow(row) {
  if (!row) return null;
  const basePricePaise =
    row.base_price_paise !== undefined && row.base_price_paise !== null
      ? Number(row.base_price_paise)
      : Math.round(parseFloat(row.base_price || 0) * 100);
  const basePrice =
    row.base_price !== undefined && row.base_price !== null
      ? parseFloat(row.base_price)
      : basePricePaise / 100;

  return {
    id: row.id,
    vendorId: row.vendor_id,
    categoryId: row.category_id || null,
    title: row.title,
    description: row.description || '',
    basePrice,
    basePricePaise,
    isActive: row.is_active !== false,
    createdAt: row.created_at,
  };
}

async function createService(vendorId, { title, description, basePrice, basePricePaise, categoryId }) {
  const id = `svc_${crypto.randomBytes(4).toString('hex')}`;
  const resolvedPaise =
    basePricePaise !== undefined
      ? Math.round(Number(basePricePaise))
      : Math.round(parseFloat(basePrice || 0) * 100);
  const resolvedInr = basePrice !== undefined ? parseFloat(basePrice) : resolvedPaise / 100;

  if (!db.isPgActive()) {
    const row = {
      id,
      vendor_id: vendorId,
      category_id: categoryId || null,
      title,
      description: description || '',
      base_price: resolvedInr,
      base_price_paise: BigInt(resolvedPaise),
      is_active: true,
      created_at: new Date(),
    };
    inMemoryStore.services.push(row);
    return mapServiceRow(row);
  }

  const query = `
    INSERT INTO services (id, vendor_id, category_id, title, description, base_price, base_price_paise)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `;
  const result = await db.query(query, [
    id,
    vendorId,
    categoryId || null,
    title,
    description || '',
    resolvedInr,
    resolvedPaise,
  ]);
  return mapServiceRow(result.rows[0]);
}

async function getServicesByVendorId(vendorId) {
  if (!db.isPgActive()) {
    return inMemoryStore.services
      .filter((s) => s.vendor_id === vendorId)
      .map(mapServiceRow);
  }
  const query = `SELECT * FROM services WHERE vendor_id = $1 ORDER BY created_at ASC;`;
  const result = await db.query(query, [vendorId]);
  return result.rows.map(mapServiceRow);
}

async function getServiceById(serviceId) {
  if (!db.isPgActive()) {
    const row = inMemoryStore.services.find((s) => s.id === serviceId);
    return mapServiceRow(row);
  }
  const query = `SELECT * FROM services WHERE id = $1;`;
  const result = await db.query(query, [serviceId]);
  return mapServiceRow(result.rows[0]);
}

async function updateService(serviceId, vendorId, updateFields) {
  if (!db.isPgActive()) {
    const row = inMemoryStore.services.find((s) => s.id === serviceId && s.vendor_id === vendorId);
    if (!row) return null;
    if (updateFields.title !== undefined) row.title = updateFields.title;
    if (updateFields.description !== undefined) row.description = updateFields.description;
    if (updateFields.categoryId !== undefined) row.category_id = updateFields.categoryId;
    if (updateFields.basePrice !== undefined) {
      row.base_price = parseFloat(updateFields.basePrice);
      row.base_price_paise = BigInt(Math.round(row.base_price * 100));
    }
    if (updateFields.basePricePaise !== undefined) {
      row.base_price_paise = BigInt(Math.round(Number(updateFields.basePricePaise)));
      row.base_price = Number(row.base_price_paise) / 100;
    }
    return mapServiceRow(row);
  }

  const allowedFields = {
    title: 'title',
    description: 'description',
    basePrice: 'base_price',
    categoryId: 'category_id',
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
  if (!db.isPgActive()) {
    const idx = inMemoryStore.services.findIndex((s) => s.id === serviceId && s.vendor_id === vendorId);
    if (idx === -1) return false;
    inMemoryStore.services.splice(idx, 1);
    return true;
  }
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
