const crypto = require('crypto');
const db = require('../../../shared/db');
const inMemoryStore = require('../../../shared/inMemoryStore');
const {
  toIntegerPaise,
  paiseToInrNumber,
  calculateDiscountedPricePaise,
  calculateGstBreakdownPaise,
} = require('../../../shared/utils/moneyAndTime');
const { getConfigNumber } = require('./configAuditRepository');
const { checkPackagePublishMediaEligibility } = require('./mediaRepository');

const VALID_TIERS = new Set(['Basic', 'Standard', 'Premium']);
const VALID_PRICE_UNITS = new Set([
  'PER_DAY',
  'PER_HOUR',
  'PER_PLATE',
  'FLAT',
  'per_day',
  'per_hour',
  'per_plate',
  'flat',
]);
const VALID_ADDON_BASES = new Set([
  'FLAT',
  'PER_HOUR',
  'PER_KM',
  'PER_DAY',
  'PER_UNIT',
  'PER_PLATE',
  'flat',
  'per_hour',
  'per_km',
  'per_day',
  'per_unit',
  'per_plate',
]);
const VALID_PACKAGE_STATUSES = new Set(['DRAFT', 'PUBLISHED', 'PAUSED', 'ARCHIVED']);

function normalizePriceUnit(unit) {
  if (!unit) return 'PER_DAY';
  const upper = String(unit).trim().toUpperCase();
  if (['PER_DAY', 'PER_HOUR', 'PER_PLATE', 'FLAT'].includes(upper)) return upper;
  return 'PER_DAY';
}

function normalizeAddonBasis(basis) {
  if (!basis) return 'FLAT';
  const upper = String(basis).trim().toUpperCase();
  if (['FLAT', 'PER_HOUR', 'PER_KM', 'PER_DAY', 'PER_UNIT', 'PER_PLATE'].includes(upper)) {
    return upper;
  }
  return 'FLAT';
}

function mapAddonRow(row) {
  if (!row) return null;
  const pricePaise = Number(row.price_paise ?? 0);
  const basis = normalizeAddonBasis(row.price_unit || row.pricing_basis);
  return {
    id: row.id,
    packageId: row.package_id,
    vendorId: row.vendor_id,
    name: row.name,
    description: row.description || '',
    pricePaise,
    price: paiseToInrNumber(pricePaise),
    priceUnit: basis,
    pricingBasis: basis.toLowerCase(),
    maxQty: row.max_qty !== null && row.max_qty !== undefined ? Number(row.max_qty) : null,
    isActive: row.is_active !== false,
    createdAt: row.created_at,
  };
}

function mapDiscountRow(row) {
  if (!row) return null;
  const rawType = String(row.discount_type || 'PERCENTAGE').toUpperCase();
  const discountType = rawType === 'PERCENT' ? 'PERCENTAGE' : rawType === 'FLAT' ? 'FLAT_PAISE' : rawType;
  return {
    id: row.id,
    vendorId: row.vendor_id,
    packageId: row.package_id || null,
    name: row.name || row.title || 'Promotional Offer',
    title: row.title || row.name || 'Promotional Offer',
    discountType,
    discountValue: Number(row.discount_value ?? 0),
    minOrderPaise: Number(row.min_order_paise ?? 0),
    maxDiscountPaise:
      row.max_discount_paise !== null && row.max_discount_paise !== undefined
        ? Number(row.max_discount_paise)
        : null,
    promoCode: row.promo_code || null,
    startDate: row.start_date || row.starts_at || null,
    endDate: row.end_date || row.ends_at || null,
    startsAt: row.starts_at || row.start_date || null,
    endsAt: row.ends_at || row.end_date || null,
    isActive: row.is_active !== false,
    createdAt: row.created_at,
  };
}

function isDiscountCurrentlyActive(discount, now = new Date()) {
  if (!discount || !discount.isActive) return false;
  const start = discount.startDate || discount.startsAt;
  const end = discount.endDate || discount.endsAt;
  if (start && new Date(start) > now) return false;
  if (end && new Date(end) < now) return false;
  return true;
}

function mapPackageRow(row, addons = [], activeDiscounts = []) {
  if (!row) return null;
  const basePricePaise = Number(row.base_price_paise ?? Math.round(Number(row.price || 0) * 100));
  const overtimeRatePaise = Number(row.overtime_rate_paise ?? 0);
  const securityDepositPaise = Number(row.security_deposit_paise ?? 0);
  const gstRateBps =
    row.gst_rate_bps !== undefined && row.gst_rate_bps !== null
      ? Number(row.gst_rate_bps)
      : Math.round(Number(row.gst_rate_percent ?? 18) * 100);
  const gstRatePercent = gstRateBps / 100;
  const taxInclusive = Boolean(row.tax_inclusive ?? row.is_tax_inclusive);
  const totalCapacityUnits = Number(row.total_capacity_units ?? row.capacity_units ?? 1);
  const priceUnit = normalizePriceUnit(row.price_unit || row.pricing_unit);

  const applicableDiscounts = activeDiscounts.filter(
    (d) => (d.packageId === row.id || d.packageId === null) && isDiscountCurrentlyActive(d)
  );

  const discCalc = calculateDiscountedPricePaise(basePricePaise, applicableDiscounts);
  const bestFinalPaise = discCalc.discountedPricePaise;
  const bestDiscountPaise = discCalc.discountAmountPaise;
  const appliedDiscount = discCalc.appliedDiscount;

  const taxBreakdown = calculateGstBreakdownPaise(bestFinalPaise, gstRatePercent, taxInclusive);

  return {
    id: row.id,
    vendorId: row.vendor_id,
    categoryId: row.category_id || null,
    name: row.name,
    tier: row.tier || 'Standard',
    description: row.description || '',
    serviceIds: Array.isArray(row.service_ids) ? row.service_ids : [],
    basePricePaise,
    pricePaise: basePricePaise,
    price: paiseToInrNumber(basePricePaise),
    discountedPricePaise: bestFinalPaise,
    discountedPrice: paiseToInrNumber(bestFinalPaise),
    discountAmountPaise: bestDiscountPaise,
    appliedDiscount,
    priceUnit,
    pricingUnit: priceUnit.toLowerCase(),
    inclusions: Array.isArray(row.inclusions) ? row.inclusions : [],
    exclusions: Array.isArray(row.exclusions) ? row.exclusions : [],
    brandAttributes: row.brand_attributes || {},
    minGuests: row.min_guests !== null && row.min_guests !== undefined ? Number(row.min_guests) : null,
    maxGuests: row.max_guests !== null && row.max_guests !== undefined ? Number(row.max_guests) : null,
    durationHours:
      row.duration_hours !== null && row.duration_hours !== undefined ? Number(row.duration_hours) : null,
    overtimeRatePaise,
    overtimeRate: paiseToInrNumber(overtimeRatePaise),
    totalCapacityUnits,
    capacityUnits: totalCapacityUnits,
    securityDepositPaise,
    securityDeposit: paiseToInrNumber(securityDepositPaise),
    gstRateBps,
    gstRatePercent,
    hsnSacCode: row.hsn_sac_code || '998596',
    taxInclusive,
    isTaxInclusive: taxInclusive,
    taxBreakdown,
    cancellationPolicy: row.cancellation_policy || 'MODERATE',
    status: row.status || 'DRAFT',
    addons,
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
}

function resolveInputPaise(paiseField, inrField, defaultPaise = 0) {
  if (paiseField !== undefined && paiseField !== null && paiseField !== '') {
    return toIntegerPaise(paiseField, undefined);
  }
  if (inrField !== undefined && inrField !== null && inrField !== '') {
    return toIntegerPaise(undefined, inrField);
  }
  return defaultPaise;
}

async function createPackage(vendorId, payload = {}) {
  const id = `pkg_${crypto.randomBytes(6).toString('hex')}`;
  const tier = payload.tier || 'Standard';
  if (!VALID_TIERS.has(tier)) {
    const err = new Error('Package tier must be Basic, Standard, or Premium');
    err.status = 400;
    err.code = 'INVALID_PACKAGE_TIER';
    throw err;
  }

  const rawPriceUnit = payload.priceUnit || payload.pricingUnit || 'PER_DAY';
  if (!VALID_PRICE_UNITS.has(rawPriceUnit)) {
    const err = new Error('priceUnit must be PER_DAY, PER_HOUR, PER_PLATE, or FLAT');
    err.status = 400;
    err.code = 'INVALID_PRICING_UNIT';
    throw err;
  }
  const priceUnit = normalizePriceUnit(rawPriceUnit);

  const basePricePaise = resolveInputPaise(payload.basePricePaise, payload.price, 0);
  const overtimeRatePaise = resolveInputPaise(payload.overtimeRatePaise, payload.overtimeRate, 0);
  const securityDepositPaise = resolveInputPaise(payload.securityDepositPaise, payload.securityDeposit, 0);

  const maxDepositCapPaise = await getConfigNumber(
    'MAX_SECURITY_DEPOSIT_CAP_PAISE',
    await getConfigNumber('MAX_SECURITY_DEPOSIT_PAISE', 5000000)
  );
  if (securityDepositPaise > maxDepositCapPaise) {
    const err = new Error(
      `securityDepositPaise (${securityDepositPaise}) exceeds configurable cap (${maxDepositCapPaise} paise)`
    );
    err.status = 400;
    err.code = 'SECURITY_DEPOSIT_CAP_EXCEEDED';
    throw err;
  }

  const totalCapacityUnits = Math.max(
    1,
    Number(payload.totalCapacityUnits ?? payload.capacityUnits ?? 1)
  );
  const gstRateBps =
    payload.gstRateBps !== undefined && payload.gstRateBps !== null
      ? Number(payload.gstRateBps)
      : Math.round(Number(payload.gstRatePercent ?? 18) * 100);
  const taxInclusive = Boolean(payload.taxInclusive ?? payload.isTaxInclusive ?? false);

  const requestedStatus = payload.status || 'DRAFT';
  if (!VALID_PACKAGE_STATUSES.has(requestedStatus)) {
    const err = new Error('Invalid package status');
    err.status = 400;
    err.code = 'INVALID_PACKAGE_STATUS';
    throw err;
  }

  if (requestedStatus === 'PUBLISHED') {
    const eligibility = await checkPackagePublishMediaEligibility(vendorId, id);
    if (!eligibility.eligible) {
      const err = new Error(`Package cannot be published: ${eligibility.reasons.join(' ')}`);
      err.status = 400;
      err.code = 'PUBLISH_MEDIA_REQUIREMENT_UNMET';
      err.mediaEligibility = eligibility;
      throw err;
    }
  }

  const now = new Date().toISOString();
  const row = {
    id,
    vendor_id: vendorId,
    category_id: payload.categoryId || null,
    name: payload.name,
    tier,
    description: payload.description || '',
    service_ids: Array.isArray(payload.serviceIds) ? payload.serviceIds : [],
    price: paiseToInrNumber(basePricePaise),
    base_price_paise: basePricePaise,
    price_unit: priceUnit,
    pricing_unit: priceUnit.toLowerCase(),
    inclusions: Array.isArray(payload.inclusions) ? payload.inclusions : [],
    exclusions: Array.isArray(payload.exclusions) ? payload.exclusions : [],
    brand_attributes: payload.brandAttributes || {},
    min_guests: payload.minGuests !== undefined ? Number(payload.minGuests) : null,
    max_guests: payload.maxGuests !== undefined ? Number(payload.maxGuests) : null,
    duration_hours: payload.durationHours !== undefined ? Number(payload.durationHours) : null,
    overtime_rate_paise: overtimeRatePaise,
    total_capacity_units: totalCapacityUnits,
    capacity_units: totalCapacityUnits,
    security_deposit_paise: securityDepositPaise,
    gst_rate_bps: gstRateBps,
    gst_rate_percent: gstRateBps / 100,
    hsn_sac_code: payload.hsnSacCode || '998596',
    tax_inclusive: taxInclusive,
    is_tax_inclusive: taxInclusive,
    cancellation_policy: payload.cancellationPolicy || 'MODERATE',
    status: requestedStatus,
    created_at: now,
    updated_at: now,
  };

  if (!db.isPgActive()) {
    inMemoryStore.packages.push(row);
  } else {
    await db.query(
      `INSERT INTO packages (
        id, vendor_id, category_id, name, tier, description, service_ids, price,
        base_price_paise, price_unit, inclusions, exclusions, brand_attributes,
        min_guests, max_guests, duration_hours, overtime_rate_paise, total_capacity_units,
        security_deposit_paise, gst_rate_bps, hsn_sac_code, tax_inclusive, status, created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25
      );`,
      [
        row.id,
        row.vendor_id,
        row.category_id,
        row.name,
        row.tier,
        row.description,
        row.service_ids,
        row.price,
        row.base_price_paise,
        row.price_unit,
        JSON.stringify(row.inclusions),
        JSON.stringify(row.exclusions),
        JSON.stringify(row.brand_attributes),
        row.min_guests,
        row.max_guests,
        row.duration_hours,
        row.overtime_rate_paise,
        row.total_capacity_units,
        row.security_deposit_paise,
        row.gst_rate_bps,
        row.hsn_sac_code,
        row.tax_inclusive,
        row.status,
        row.created_at,
        row.updated_at,
      ]
    );
  }

  if (Array.isArray(payload.addons)) {
    for (const addonInput of payload.addons) {
      await addPackageAddon(vendorId, id, addonInput);
    }
  }

  return getPackageById(id);
}

async function getPackageAddons(packageId) {
  if (db.isPgActive()) {
    const res = await db.query(
      'SELECT * FROM package_addons WHERE package_id = $1 AND is_active = TRUE ORDER BY created_at ASC;',
      [packageId]
    );
    return res.rows.map(mapAddonRow);
  }
  return inMemoryStore.packageAddons
    .filter((a) => a.package_id === packageId && a.is_active !== false)
    .map(mapAddonRow);
}

async function addPackageAddon(vendorId, packageId, payload = {}) {
  const rawBasis = payload.priceUnit || payload.pricingBasis || 'FLAT';
  if (!VALID_ADDON_BASES.has(rawBasis)) {
    const err = new Error('Add-on priceUnit/pricingBasis must be FLAT, PER_HOUR, PER_KM, PER_DAY, PER_UNIT, or PER_PLATE');
    err.status = 400;
    err.code = 'INVALID_ADDON_BASIS';
    throw err;
  }
  const priceUnit = normalizeAddonBasis(rawBasis);
  const pricePaise = resolveInputPaise(payload.pricePaise, payload.price, 0);
  const id = `add_${crypto.randomBytes(6).toString('hex')}`;
  const now = new Date().toISOString();

  const row = {
    id,
    package_id: packageId,
    vendor_id: vendorId,
    name: payload.name,
    description: payload.description || '',
    price_paise: pricePaise,
    price_unit: priceUnit,
    pricing_basis: priceUnit.toLowerCase(),
    max_qty: payload.maxQty !== undefined ? Number(payload.maxQty) : null,
    is_active: payload.isActive !== undefined ? Boolean(payload.isActive) : true,
    created_at: now,
  };

  if (db.isPgActive()) {
    await db.query(
      `INSERT INTO package_addons (
         id, package_id, vendor_id, name, description, price_paise, price_unit, max_qty, is_active, created_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10);`,
      [
        row.id,
        row.package_id,
        row.vendor_id,
        row.name,
        row.description,
        row.price_paise,
        row.price_unit,
        row.max_qty,
        row.is_active,
        row.created_at,
      ]
    );
  } else {
    inMemoryStore.packageAddons.push(row);
  }

  return mapAddonRow(row);
}

async function deletePackageAddon(addonId, vendorId) {
  if (!db.isPgActive()) {
    const idx = inMemoryStore.packageAddons.findIndex(
      (a) => a.id === addonId && (!vendorId || a.vendor_id === vendorId)
    );
    if (idx === -1) return false;
    inMemoryStore.packageAddons.splice(idx, 1);
    return true;
  }
  const res = await db.query(
    'DELETE FROM package_addons WHERE id = $1 AND ($2::varchar IS NULL OR vendor_id = $2) RETURNING id;',
    [addonId, vendorId || null]
  );
  return res.rowCount > 0;
}

async function createDiscount(vendorId, payload = {}) {
  const rawType = String(payload.discountType || 'PERCENTAGE').toUpperCase();
  if (!['PERCENTAGE', 'PERCENT', 'FLAT_PAISE', 'FLAT'].includes(rawType)) {
    const err = new Error('discountType must be PERCENTAGE or FLAT_PAISE');
    err.status = 400;
    err.code = 'INVALID_DISCOUNT_TYPE';
    throw err;
  }
  const discountType = rawType === 'PERCENT' ? 'PERCENTAGE' : rawType === 'FLAT' ? 'FLAT_PAISE' : rawType;

  let discountValue = Number(payload.discountValue);
  if (discountType === 'PERCENTAGE') {
    // Support both whole percent (1..90) and basis points (100..9000)
    if (!Number.isFinite(discountValue) || discountValue <= 0 || discountValue > 9000) {
      const err = new Error('PERCENTAGE discountValue must be between 1 and 90 (or 100..9000 bps)');
      err.status = 400;
      err.code = 'INVALID_DISCOUNT_VALUE';
      throw err;
    }
    discountValue = Math.round(discountValue);
  } else {
    discountValue = resolveInputPaise(payload.discountValuePaise ?? payload.discountValue, payload.discountValueInr, 0);
    if (discountValue <= 0) {
      const err = new Error('FLAT_PAISE discountValue must be greater than 0 paise');
      err.status = 400;
      err.code = 'INVALID_DISCOUNT_VALUE';
      throw err;
    }
  }

  const minOrderPaise = resolveInputPaise(payload.minOrderPaise, payload.minOrder, 0);
  const maxDiscountPaise =
    payload.maxDiscountPaise !== undefined || payload.maxDiscount !== undefined
      ? resolveInputPaise(payload.maxDiscountPaise, payload.maxDiscount, 0)
      : null;

  const id = `dsc_${crypto.randomBytes(6).toString('hex')}`;
  const now = new Date().toISOString();
  const name = payload.name || payload.title || 'Special Event Discount';

  const row = {
    id,
    vendor_id: vendorId,
    package_id: payload.packageId || null,
    name,
    title: name,
    discount_type: discountType,
    discount_value: discountValue,
    min_order_paise: minOrderPaise,
    max_discount_paise: maxDiscountPaise,
    promo_code: payload.promoCode ? String(payload.promoCode).toUpperCase().trim() : null,
    start_date: payload.startDate || payload.startsAt || null,
    end_date: payload.endDate || payload.endsAt || null,
    starts_at: payload.startsAt || payload.startDate || null,
    ends_at: payload.endsAt || payload.endDate || null,
    is_active: payload.isActive !== undefined ? Boolean(payload.isActive) : true,
    created_at: now,
  };

  if (db.isPgActive()) {
    await db.query(
      `INSERT INTO package_discounts (
         id, vendor_id, package_id, name, discount_type, discount_value,
         min_order_paise, promo_code, start_date, end_date, is_active, created_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12);`,
      [
        row.id,
        row.vendor_id,
        row.package_id,
        row.name,
        row.discount_type,
        row.discount_value,
        row.min_order_paise,
        row.promo_code,
        row.start_date,
        row.end_date,
        row.is_active,
        row.created_at,
      ]
    );
  } else {
    inMemoryStore.packageDiscounts.push(row);
    inMemoryStore.discounts.push(row);
  }

  return mapDiscountRow(row);
}

async function getVendorDiscounts(vendorId, { packageId, activeOnly = false } = {}) {
  let rows = [];
  if (db.isPgActive()) {
    const res = await db.query(
      'SELECT * FROM package_discounts WHERE vendor_id = $1 ORDER BY created_at DESC;',
      [vendorId]
    );
    rows = res.rows.map(mapDiscountRow);
  } else {
    rows = inMemoryStore.packageDiscounts
      .filter((d) => d.vendor_id === vendorId)
      .map(mapDiscountRow);
  }

  if (packageId) {
    rows = rows.filter((d) => d.packageId === packageId || d.packageId === null);
  }
  if (activeOnly) {
    rows = rows.filter((d) => isDiscountCurrentlyActive(d));
  }
  return rows;
}

async function deleteDiscount(discountId, vendorId) {
  if (!db.isPgActive()) {
    const idx = inMemoryStore.packageDiscounts.findIndex(
      (d) => d.id === discountId && (!vendorId || d.vendor_id === vendorId)
    );
    if (idx === -1) return false;
    inMemoryStore.packageDiscounts.splice(idx, 1);
    const dIdx = inMemoryStore.discounts.findIndex((d) => d.id === discountId);
    if (dIdx !== -1) inMemoryStore.discounts.splice(dIdx, 1);
    return true;
  }
  const res = await db.query(
    'DELETE FROM package_discounts WHERE id = $1 AND ($2::varchar IS NULL OR vendor_id = $2) RETURNING id;',
    [discountId, vendorId || null]
  );
  return res.rowCount > 0;
}

async function getPackageById(packageId) {
  let row = null;
  if (db.isPgActive()) {
    const res = await db.query('SELECT * FROM packages WHERE id = $1;', [packageId]);
    row = res.rows[0] || null;
  } else {
    row = inMemoryStore.packages.find((p) => p.id === packageId) || null;
  }
  if (!row) return null;

  const addons = await getPackageAddons(row.id);
  const discounts = await getVendorDiscounts(row.vendor_id, { activeOnly: true });
  return mapPackageRow(row, addons, discounts);
}

async function getVendorPackages(vendorId, { status, categoryId } = {}) {
  let rows = [];
  if (db.isPgActive()) {
    const res = await db.query('SELECT * FROM packages WHERE vendor_id = $1 ORDER BY created_at ASC;', [
      vendorId,
    ]);
    rows = res.rows;
  } else {
    rows = inMemoryStore.packages.filter((p) => p.vendor_id === vendorId);
  }

  if (status) {
    rows = rows.filter((r) => r.status === status);
  }
  if (categoryId) {
    rows = rows.filter((r) => r.category_id === categoryId);
  }

  const discounts = await getVendorDiscounts(vendorId, { activeOnly: true });
  const mapped = [];
  for (const r of rows) {
    const addons = await getPackageAddons(r.id);
    mapped.push(mapPackageRow(r, addons, discounts));
  }
  return mapped;
}

async function updatePackage(packageId, vendorIdOrFields, maybeUpdateFields) {
  const hasVendorIdArg = typeof vendorIdOrFields === 'string';
  const vendorId = hasVendorIdArg ? vendorIdOrFields : undefined;
  const updateFields = hasVendorIdArg ? maybeUpdateFields || {} : vendorIdOrFields || {};

  const existing = !db.isPgActive()
    ? inMemoryStore.packages.find((p) => p.id === packageId && (!vendorId || p.vendor_id === vendorId))
    : (
        await db.query(
          'SELECT * FROM packages WHERE id = $1 AND ($2::varchar IS NULL OR vendor_id = $2);',
          [packageId, vendorId || null]
        )
      ).rows[0];

  if (!existing) return null;

  if (updateFields.tier !== undefined && !VALID_TIERS.has(updateFields.tier)) {
    const err = new Error('Package tier must be Basic, Standard, or Premium');
    err.status = 400;
    err.code = 'INVALID_PACKAGE_TIER';
    throw err;
  }

  const rawUnit = updateFields.priceUnit ?? updateFields.pricingUnit;
  if (rawUnit !== undefined && !VALID_PRICE_UNITS.has(rawUnit)) {
    const err = new Error('priceUnit must be PER_DAY, PER_HOUR, PER_PLATE, or FLAT');
    err.status = 400;
    err.code = 'INVALID_PRICING_UNIT';
    throw err;
  }

  if (updateFields.status === 'PUBLISHED') {
    const eligibility = await checkPackagePublishMediaEligibility(existing.vendor_id, packageId);
    if (!eligibility.eligible) {
      const err = new Error(`Package cannot be published: ${eligibility.reasons.join(' ')}`);
      err.status = 400;
      err.code = 'PUBLISH_MEDIA_REQUIREMENT_UNMET';
      err.mediaEligibility = eligibility;
      throw err;
    }
  }

  let nextBasePaise = Number(existing.base_price_paise ?? Math.round(Number(existing.price || 0) * 100));
  if (updateFields.basePricePaise !== undefined || updateFields.price !== undefined) {
    nextBasePaise = resolveInputPaise(updateFields.basePricePaise, updateFields.price, nextBasePaise);
  }

  let nextDepositPaise = Number(existing.security_deposit_paise || 0);
  if (updateFields.securityDepositPaise !== undefined || updateFields.securityDeposit !== undefined) {
    nextDepositPaise = resolveInputPaise(
      updateFields.securityDepositPaise,
      updateFields.securityDeposit,
      nextDepositPaise
    );
    const maxDepositCapPaise = await getConfigNumber(
      'MAX_SECURITY_DEPOSIT_CAP_PAISE',
      await getConfigNumber('MAX_SECURITY_DEPOSIT_PAISE', 5000000)
    );
    if (nextDepositPaise > maxDepositCapPaise) {
      const err = new Error(`securityDepositPaise exceeds cap of ${maxDepositCapPaise} paise`);
      err.status = 400;
      err.code = 'SECURITY_DEPOSIT_CAP_EXCEEDED';
      throw err;
    }
  }

  const nextOvertimePaise =
    updateFields.overtimeRatePaise !== undefined || updateFields.overtimeRate !== undefined
      ? resolveInputPaise(
          updateFields.overtimeRatePaise,
          updateFields.overtimeRate,
          Number(existing.overtime_rate_paise || 0)
        )
      : Number(existing.overtime_rate_paise || 0);

  const nextCapacity =
    updateFields.totalCapacityUnits !== undefined || updateFields.capacityUnits !== undefined
      ? Math.max(1, Number(updateFields.totalCapacityUnits ?? updateFields.capacityUnits))
      : Number(existing.total_capacity_units ?? existing.capacity_units ?? 1);

  const nextGstBps =
    updateFields.gstRateBps !== undefined
      ? Number(updateFields.gstRateBps)
      : updateFields.gstRatePercent !== undefined
        ? Math.round(Number(updateFields.gstRatePercent) * 100)
        : Number(existing.gst_rate_bps ?? 1800);

  const nextTaxInclusive =
    updateFields.taxInclusive !== undefined || updateFields.isTaxInclusive !== undefined
      ? Boolean(updateFields.taxInclusive ?? updateFields.isTaxInclusive)
      : Boolean(existing.tax_inclusive ?? existing.is_tax_inclusive);

  const nextPriceUnit = rawUnit ? normalizePriceUnit(rawUnit) : existing.price_unit || 'PER_DAY';
  const now = new Date().toISOString();

  existing.name = updateFields.name !== undefined ? updateFields.name : existing.name;
  existing.category_id = updateFields.categoryId !== undefined ? updateFields.categoryId : existing.category_id;
  existing.tier = updateFields.tier !== undefined ? updateFields.tier : existing.tier;
  existing.description = updateFields.description !== undefined ? updateFields.description : existing.description;
  existing.service_ids = Array.isArray(updateFields.serviceIds) ? updateFields.serviceIds : existing.service_ids;
  existing.base_price_paise = nextBasePaise;
  existing.price = paiseToInrNumber(nextBasePaise);
  existing.price_unit = nextPriceUnit;
  existing.pricing_unit = nextPriceUnit.toLowerCase();
  existing.inclusions = Array.isArray(updateFields.inclusions) ? updateFields.inclusions : existing.inclusions;
  existing.exclusions = Array.isArray(updateFields.exclusions) ? updateFields.exclusions : existing.exclusions;
  existing.brand_attributes =
    updateFields.brandAttributes !== undefined ? updateFields.brandAttributes : existing.brand_attributes;
  existing.min_guests =
    updateFields.minGuests !== undefined ? Number(updateFields.minGuests) : existing.min_guests;
  existing.max_guests =
    updateFields.maxGuests !== undefined ? Number(updateFields.maxGuests) : existing.max_guests;
  existing.duration_hours =
    updateFields.durationHours !== undefined ? Number(updateFields.durationHours) : existing.duration_hours;
  existing.overtime_rate_paise = nextOvertimePaise;
  existing.total_capacity_units = nextCapacity;
  existing.capacity_units = nextCapacity;
  existing.security_deposit_paise = nextDepositPaise;
  existing.gst_rate_bps = nextGstBps;
  existing.gst_rate_percent = nextGstBps / 100;
  existing.hsn_sac_code =
    updateFields.hsnSacCode !== undefined ? updateFields.hsnSacCode : existing.hsn_sac_code;
  existing.tax_inclusive = nextTaxInclusive;
  existing.is_tax_inclusive = nextTaxInclusive;
  existing.status = updateFields.status !== undefined ? updateFields.status : existing.status;
  existing.updated_at = now;

  if (db.isPgActive()) {
    await db.query(
      `UPDATE packages SET
         name = $1, category_id = $2, tier = $3, description = $4, service_ids = $5,
         price = $6, base_price_paise = $7, price_unit = $8, inclusions = $9, exclusions = $10,
         brand_attributes = $11, min_guests = $12, max_guests = $13, duration_hours = $14,
         overtime_rate_paise = $15, total_capacity_units = $16, security_deposit_paise = $17,
         gst_rate_bps = $18, hsn_sac_code = $19, tax_inclusive = $20, status = $21, updated_at = $22
       WHERE id = $23;`,
      [
        existing.name,
        existing.category_id,
        existing.tier,
        existing.description,
        existing.service_ids,
        existing.price,
        existing.base_price_paise,
        existing.price_unit,
        JSON.stringify(existing.inclusions),
        JSON.stringify(existing.exclusions),
        JSON.stringify(existing.brand_attributes),
        existing.min_guests,
        existing.max_guests,
        existing.duration_hours,
        existing.overtime_rate_paise,
        existing.total_capacity_units,
        existing.security_deposit_paise,
        existing.gst_rate_bps,
        existing.hsn_sac_code,
        existing.tax_inclusive,
        existing.status,
        existing.updated_at,
        packageId,
      ]
    );
  }

  return getPackageById(packageId);
}

async function deletePackage(packageId, vendorId) {
  if (!db.isPgActive()) {
    const idx = inMemoryStore.packages.findIndex(
      (p) => p.id === packageId && (!vendorId || p.vendor_id === vendorId)
    );
    if (idx === -1) return false;
    inMemoryStore.packages.splice(idx, 1);
    return true;
  }
  const res = await db.query(
    'DELETE FROM packages WHERE id = $1 AND ($2::varchar IS NULL OR vendor_id = $2) RETURNING id;',
    [packageId, vendorId || null]
  );
  return res.rowCount > 0;
}

module.exports = {
  createPackage,
  getPackagesByVendorId: getVendorPackages,
  getVendorPackages,
  getPackageById,
  updatePackage,
  deletePackage,
  addPackageAddon,
  createPackageAddon: addPackageAddon,
  getPackageAddons,
  listPackageAddons: getPackageAddons,
  deletePackageAddon,
  createDiscount,
  getVendorDiscounts,
  listVendorDiscounts: getVendorDiscounts,
  deleteDiscount,
};
