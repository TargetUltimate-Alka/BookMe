const db = require('../../../shared/db');
const crypto = require('crypto');

function mapVendorRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    businessName: row.business_name,
    category: row.category,
    description: row.description,
    location: row.location,
    verified: row.verified,
    rating: row.rating ? parseFloat(row.rating) : null,
    createdAt: row.created_at,
  };
}

async function createVendor({ userId, businessName, category, description, location }) {
  const id = `vnd_${crypto.randomBytes(4).toString('hex')}`;
  const query = `
    INSERT INTO vendors (id, user_id, business_name, category, description, location, verified, rating)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *;
  `;
  const values = [
    id,
    userId,
    businessName,
    category,
    description || '',
    location || '',
    true, // V1 note: vendors are auto-verified on creation
    null,
  ];

  const result = await db.query(query, values);
  return mapVendorRow(result.rows[0]);
}

async function getVendorById(id) {
  const query = `SELECT * FROM vendors WHERE id = $1;`;
  const result = await db.query(query, [id]);
  return mapVendorRow(result.rows[0]);
}

async function getVendorByUserId(userId) {
  const query = `SELECT * FROM vendors WHERE user_id = $1;`;
  const result = await db.query(query, [userId]);
  return mapVendorRow(result.rows[0]);
}

async function searchVendors({ category, location, verified, page = 1, limit = 10 }) {
  const conditions = [];
  const values = [];
  let paramIndex = 1;

  if (category) {
    conditions.push(`LOWER(category) = LOWER($${paramIndex++})`);
    values.push(category);
  }

  if (location) {
    conditions.push(`location ILIKE $${paramIndex++}`);
    values.push(`%${location}%`);
  }

  if (verified !== undefined && verified !== null && verified !== '') {
    conditions.push(`verified = $${paramIndex++}`);
    values.push(verified === 'true' || verified === true);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count total records
  const countQuery = `SELECT COUNT(*) FROM vendors ${whereClause};`;
  const countResult = await db.query(countQuery, values);
  const totalItems = parseInt(countResult.rows[0].count, 10);
  const totalPages = Math.ceil(totalItems / limit) || 1;

  // Fetch paginated records
  const offset = (page - 1) * limit;
  const dataQuery = `
    SELECT * FROM vendors
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++};
  `;
  const dataValues = [...values, limit, offset];
  const dataResult = await db.query(dataQuery, dataValues);

  return {
    items: dataResult.rows.map(mapVendorRow),
    page: parseInt(page, 10),
    totalPages,
    totalItems,
  };
}

async function updateVendor(id, updateFields) {
  const allowedFields = {
    businessName: 'business_name',
    description: 'description',
    location: 'location',
    category: 'category',
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
    return getVendorById(id);
  }

  values.push(id);
  const query = `
    UPDATE vendors
    SET ${setClauses.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *;
  `;

  const result = await db.query(query, values);
  return mapVendorRow(result.rows[0]);
}

async function updateRating(id, rating) {
  const query = `
    UPDATE vendors
    SET rating = $1
    WHERE id = $2
    RETURNING id, rating;
  `;
  const result = await db.query(query, [rating, id]);
  if (result.rows.length === 0) return null;
  return {
    id: result.rows[0].id,
    rating: parseFloat(result.rows[0].rating),
  };
}

async function getVendorSummary(id) {
  const query = `SELECT id, business_name, verified FROM vendors WHERE id = $1;`;
  const result = await db.query(query, [id]);
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id,
    businessName: row.business_name,
    verified: row.verified,
  };
}

module.exports = {
  createVendor,
  getVendorById,
  getVendorByUserId,
  searchVendors,
  updateVendor,
  updateRating,
  getVendorSummary,
};
