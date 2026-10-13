const db = require('../../../shared/db');
const inMemoryStore = require('../../../shared/inMemoryStore');
const { findCategoryByIdOrSlug } = require('../../../shared/constants/categoriesData');

function mapCategoryRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    parentId: row.parent_id ?? row.parentId ?? null,
    isRegulated: Boolean(row.is_regulated ?? row.isRegulated),
    complianceNote: row.compliance_note ?? row.complianceNote ?? null,
    defaultHsnSac: row.default_hsn_sac ?? row.defaultHsnSac ?? '998596',
    defaultGstRatePercent: Number(row.default_gst_rate_percent ?? row.defaultGstRatePercent ?? 18),
  };
}

async function listCategories({ parentId, flat = false, regulatedOnly = false } = {}) {
  let rows = [];
  if (db.isPgActive()) {
    const res = await db.query('SELECT * FROM categories ORDER BY parent_id NULLS FIRST, id ASC;');
    rows = res.rows.map(mapCategoryRow);
  } else {
    rows = inMemoryStore.categories.map(mapCategoryRow);
  }

  if (parentId !== undefined) {
    rows = rows.filter((c) => c.parentId === parentId);
  }
  if (regulatedOnly) {
    rows = rows.filter((c) => c.isRegulated);
  }

  if (!flat && parentId === undefined && !regulatedOnly) {
    const childrenByParent = new Map();
    for (const c of rows) {
      if (c.parentId) {
        if (!childrenByParent.has(c.parentId)) childrenByParent.set(c.parentId, []);
        childrenByParent.get(c.parentId).push(c);
      }
    }
    return rows.map((c) => ({
      ...c,
      subcategories: c.parentId === null ? childrenByParent.get(c.id) || [] : undefined,
    }));
  }

  return rows;
}

async function getCategoryById(idOrSlug) {
  if (!idOrSlug) return null;
  const needle = String(idOrSlug).trim().toLowerCase();

  if (db.isPgActive()) {
    const res = await db.query(
      'SELECT * FROM categories WHERE LOWER(id) = $1 OR LOWER(slug) = $1 OR LOWER(name) = $1 LIMIT 1;',
      [needle]
    );
    if (res.rows[0]) return mapCategoryRow(res.rows[0]);
  }

  const direct = inMemoryStore.categories.find(
    (c) =>
      String(c.id).toLowerCase() === needle ||
      String(c.slug).toLowerCase() === needle ||
      String(c.name).toLowerCase() === needle
  );
  if (direct) return mapCategoryRow(direct);

  const found = findCategoryByIdOrSlug(idOrSlug);
  if (found) return mapCategoryRow(found);

  return null;
}

async function resolveCategoryIds(inputs = []) {
  const resolved = [];
  const seen = new Set();
  for (const raw of inputs) {
    const cat = await getCategoryById(raw);
    if (cat && !seen.has(cat.id)) {
      seen.add(cat.id);
      resolved.push(cat);
    }
  }
  return resolved;
}

async function getAllCategories() {
  return listCategories({ flat: true });
}

async function getCategoriesHierarchy() {
  const all = await listCategories({ flat: false });
  const groups = all.filter((c) => c.parentId === null);
  const serviceTypes = all.filter((c) => c.parentId !== null);
  return {
    totalParentGroups: groups.length,
    totalServiceTypes: serviceTypes.length,
    groups,
  };
}

module.exports = {
  listCategories,
  getAllCategories,
  getCategoriesHierarchy,
  getCategoryById,
  resolveCategoryBySlugOrId: getCategoryById,
  resolveCategoryIds,
};
