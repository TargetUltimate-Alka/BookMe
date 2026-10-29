const crypto = require('crypto');
const db = require('../../../shared/db');
const inMemoryStore = require('../../../shared/inMemoryStore');
const { getConfigValue, enqueueOutboxEvent } = require('../../vendor/repository/configAuditRepository');

function normalizeDateStr(d) {
  if (!d) return null;
  if (d instanceof Date) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(d).split('T')[0];
}

function mapAvailabilityRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    vendorId: row.vendor_id,
    date: normalizeDateStr(row.date),
    status: row.status,
    reason: row.reason,
    createdAt: row.created_at,
  };
}

function mapPackageAvailRow(row) {
  if (!row) return null;
  const totalUnits = Number(row.total_units ?? 1);
  const heldUnits = Number(row.held_units ?? 0);
  const bookedUnits = Number(row.booked_units ?? 0);
  const availableUnits = Math.max(0, row.status === 'BLOCKED' ? 0 : totalUnits - heldUnits - bookedUnits);
  return {
    id: row.id,
    packageId: row.package_id,
    vendorId: row.vendor_id,
    date: normalizeDateStr(row.avail_date || row.date),
    slotName: row.slot_name || 'ALL_DAY',
    totalUnits,
    heldUnits,
    bookedUnits,
    availableUnits,
    status: row.status || (availableUnits > 0 ? 'AVAILABLE' : 'BOOKED_OUT'),
    reason: row.reason || null,
    updatedAt: row.updated_at || row.created_at,
  };
}

// ============================================================================
// Legacy Vendor-Level Availability (preserved for backward compatibility)
// ============================================================================
async function checkAvailability(vendorId, dateStr) {
  const dateNorm = normalizeDateStr(dateStr);
  if (!db.isPgActive()) {
    const blockedRows = inMemoryStore.availability.filter(
      (a) => a.vendor_id === vendorId && normalizeDateStr(a.date) === dateNorm && a.status === 'BLOCKED'
    );
    return {
      date: dateNorm,
      available: blockedRows.length === 0,
      blockedSlots: blockedRows.map(mapAvailabilityRow),
    };
  }

  const query = `
    SELECT * FROM availability
    WHERE vendor_id = $1 AND date = $2;
  `;
  const result = await db.query(query, [vendorId, dateNorm]);
  if (result.rows.length === 0) {
    return {
      date: dateNorm,
      available: true,
      blockedSlots: [],
    };
  }
  const blockedSlots = result.rows.map(mapAvailabilityRow);
  return {
    date: dateNorm,
    available: false,
    blockedSlots,
  };
}

async function blockDate(vendorId, { date, reason }) {
  const id = `blk_${crypto.randomBytes(4).toString('hex')}`;
  const dateNorm = normalizeDateStr(date);

  if (!db.isPgActive()) {
    let existing = inMemoryStore.availability.find(
      (a) => a.vendor_id === vendorId && normalizeDateStr(a.date) === dateNorm
    );
    if (existing) {
      existing.status = 'BLOCKED';
      existing.reason = reason || 'Blocked by vendor';
      return mapAvailabilityRow(existing);
    }
    const row = {
      id,
      vendor_id: vendorId,
      date: dateNorm,
      status: 'BLOCKED',
      reason: reason || 'Blocked by vendor',
      created_at: new Date(),
    };
    inMemoryStore.availability.push(row);
    return mapAvailabilityRow(row);
  }

  const query = `
    INSERT INTO availability (id, vendor_id, date, status, reason)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (vendor_id, date) DO UPDATE
    SET status = EXCLUDED.status, reason = EXCLUDED.reason
    RETURNING *;
  `;
  const result = await db.query(query, [id, vendorId, dateNorm, 'BLOCKED', reason || 'Blocked by vendor']);
  return mapAvailabilityRow(result.rows[0]);
}

async function unblockDate(vendorId, blockId) {
  if (!db.isPgActive()) {
    const idx = inMemoryStore.availability.findIndex((a) => a.id === blockId && a.vendor_id === vendorId);
    if (idx === -1) return false;
    const removed = inMemoryStore.availability.splice(idx, 1)[0];
    if (removed) {
      await triggerNotifyRequestsForVendorDate(vendorId, normalizeDateStr(removed.date), null);
    }
    return true;
  }

  const query = `
    DELETE FROM availability
    WHERE id = $1 AND vendor_id = $2
    RETURNING id, date;
  `;
  const result = await db.query(query, [blockId, vendorId]);
  if (result.rowCount > 0) {
    await triggerNotifyRequestsForVendorDate(vendorId, normalizeDateStr(result.rows[0].date), null);
    return true;
  }
  return false;
}

async function getVendorBlockedDates(vendorId) {
  if (!db.isPgActive()) {
    return inMemoryStore.availability
      .filter((a) => a.vendor_id === vendorId)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .map(mapAvailabilityRow);
  }

  const query = `
    SELECT * FROM availability
    WHERE vendor_id = $1
    ORDER BY date ASC;
  `;
  const result = await db.query(query, [vendorId]);
  return result.rows.map(mapAvailabilityRow);
}

// ============================================================================
// Notify Me Trigger When Capacity Opens (FR-SRCH-05, FR-NOT-02)
// ============================================================================
async function triggerNotifyRequestsForVendorDate(vendorId, dateStr, packageId = null) {
  const dateNorm = normalizeDateStr(dateStr);
  if (!dateNorm) return [];

  if (!db.isPgActive()) {
    const triggered = [];
    for (const req of inMemoryStore.notifyRequests) {
      if (
        req.vendor_id === vendorId &&
        req.status === 'PENDING' &&
        normalizeDateStr(req.requested_date) === dateNorm &&
        (!packageId || !req.package_id || req.package_id === packageId)
      ) {
        req.status = 'NOTIFIED';
        req.notified_at = new Date();
        triggered.push(req);
        await enqueueOutboxEvent('vendor.availability.opened', {
          notifyRequestId: req.id,
          userId: req.user_id,
          vendorId: req.vendor_id,
          packageId: req.package_id,
          requestedDate: dateNorm,
          notifiedAt: req.notified_at.toISOString(),
        });
      }
    }
    return triggered;
  }

  const res = await db.query(
    `UPDATE notify_requests
     SET status = 'NOTIFIED', notified_at = NOW()
     WHERE vendor_id = $1
       AND requested_date = $2
       AND status = 'PENDING'
       AND ($3::varchar IS NULL OR package_id IS NULL OR package_id = $3)
     RETURNING *`,
    [vendorId, dateNorm, packageId]
  );

  for (const row of res.rows) {
    await enqueueOutboxEvent('vendor.availability.opened', {
      notifyRequestId: row.id,
      userId: row.user_id,
      vendorId: row.vendor_id,
      packageId: row.package_id,
      requestedDate: dateNorm,
      notifiedAt: new Date().toISOString(),
    });
  }
  return res.rows;
}

// ============================================================================
// Package-Level Availability & Capacity (FR-VEN-06, FR-VEN-07)
// ============================================================================
async function getPackageDefaultCapacity(packageId) {
  if (!db.isPgActive()) {
    const pkg = inMemoryStore.packages.find((p) => p.id === packageId);
    if (!pkg) return { vendorId: null, defaultUnits: 1 };
    return {
      vendorId: pkg.vendor_id,
      defaultUnits: Number(pkg.total_capacity_units ?? 1),
    };
  }
  const res = await db.query(`SELECT vendor_id, total_capacity_units FROM packages WHERE id = $1`, [packageId]);
  if (res.rows.length === 0) return { vendorId: null, defaultUnits: 1 };
  return {
    vendorId: res.rows[0].vendor_id,
    defaultUnits: Number(res.rows[0].total_capacity_units ?? 1),
  };
}

async function getPackageAvailability(packageId, { startDate, endDate, slotName } = {}) {
  const startNorm = normalizeDateStr(startDate);
  const endNorm = normalizeDateStr(endDate);

  if (!db.isPgActive()) {
    return inMemoryStore.packageAvailability
      .filter((row) => {
        if (row.package_id !== packageId) return false;
        const d = normalizeDateStr(row.avail_date);
        if (startNorm && d < startNorm) return false;
        if (endNorm && d > endNorm) return false;
        if (slotName && row.slot_name !== slotName) return false;
        return true;
      })
      .sort((a, b) => String(a.avail_date).localeCompare(String(b.avail_date)))
      .map(mapPackageAvailRow);
  }

  const conditions = [`package_id = $1`];
  const params = [packageId];
  let idx = 2;
  if (startNorm) {
    conditions.push(`avail_date >= $${idx++}`);
    params.push(startNorm);
  }
  if (endNorm) {
    conditions.push(`avail_date <= $${idx++}`);
    params.push(endNorm);
  }
  if (slotName) {
    conditions.push(`slot_name = $${idx++}`);
    params.push(slotName);
  }

  const res = await db.query(
    `SELECT * FROM package_availability WHERE ${conditions.join(' AND ')} ORDER BY avail_date ASC, slot_name ASC`,
    params
  );
  return res.rows.map(mapPackageAvailRow);
}

async function setPackageAvailability(vendorId, packageId, { date, slotName = 'ALL_DAY', totalUnits, status, reason }) {
  const dateNorm = normalizeDateStr(date);
  if (!dateNorm) {
    const err = new Error('date (YYYY-MM-DD) is required');
    err.status = 400;
    throw err;
  }

  const { vendorId: pkgVendorId, defaultUnits } = await getPackageDefaultCapacity(packageId);
  if (pkgVendorId && pkgVendorId !== vendorId) {
    const err = new Error('Package does not belong to vendor');
    err.status = 403;
    throw err;
  }

  const resolvedTotal = totalUnits !== undefined ? Math.max(0, Number(totalUnits)) : defaultUnits;
  const resolvedStatus = status || (resolvedTotal > 0 ? 'AVAILABLE' : 'BLOCKED');

  if (!db.isPgActive()) {
    let row = inMemoryStore.packageAvailability.find(
      (r) => r.package_id === packageId && normalizeDateStr(r.avail_date) === dateNorm && r.slot_name === slotName
    );
    if (row) {
      const minRequired = Number(row.held_units || 0) + Number(row.booked_units || 0);
      if (resolvedTotal < minRequired) {
        const err = new Error(`Cannot reduce totalUnits (${resolvedTotal}) below currently held + booked units (${minRequired})`);
        err.status = 409;
        err.code = 'CONFLICT';
        throw err;
      }
      row.total_units = resolvedTotal;
      row.status = resolvedStatus;
      if (reason !== undefined) row.reason = reason;
      row.updated_at = new Date();
    } else {
      row = {
        id: `pka_${crypto.randomBytes(6).toString('hex')}`,
        package_id: packageId,
        vendor_id: vendorId,
        avail_date: dateNorm,
        slot_name: slotName,
        total_units: resolvedTotal,
        held_units: 0,
        booked_units: 0,
        status: resolvedStatus,
        reason: reason || null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      inMemoryStore.packageAvailability.push(row);
    }

    const mapped = mapPackageAvailRow(row);
    if (mapped.availableUnits > 0 && mapped.status === 'AVAILABLE') {
      await triggerNotifyRequestsForVendorDate(vendorId, dateNorm, packageId);
    }
    return mapped;
  }

  const id = `pka_${crypto.randomBytes(6).toString('hex')}`;
  const res = await db.query(
    `INSERT INTO package_availability (id, package_id, vendor_id, avail_date, slot_name, total_units, held_units, booked_units, status, reason)
     VALUES ($1, $2, $3, $4, $5, $6, 0, 0, $7, $8)
     ON CONFLICT (package_id, avail_date, slot_name)
     DO UPDATE SET
       total_units = EXCLUDED.total_units,
       status = EXCLUDED.status,
       reason = COALESCE(EXCLUDED.reason, package_availability.reason),
       updated_at = NOW()
     WHERE EXCLUDED.total_units >= (package_availability.held_units + package_availability.booked_units)
     RETURNING *`,
    [id, packageId, vendorId, dateNorm, slotName, resolvedTotal, resolvedStatus, reason || null]
  );

  if (res.rows.length === 0) {
    const err = new Error('Cannot reduce totalUnits below currently held + booked units');
    err.status = 409;
    err.code = 'CONFLICT';
    throw err;
  }

  const mapped = mapPackageAvailRow(res.rows[0]);
  if (mapped.availableUnits > 0 && mapped.status === 'AVAILABLE') {
    await triggerNotifyRequestsForVendorDate(vendorId, dateNorm, packageId);
  }
  return mapped;
}

async function bulkSetPackageAvailability(vendorId, packageId, { startDate, endDate, slotName = 'ALL_DAY', totalUnits, status, reason }) {
  const startNorm = normalizeDateStr(startDate);
  const endNorm = normalizeDateStr(endDate || startDate);
  if (!startNorm || !endNorm || startNorm > endNorm) {
    const err = new Error('Valid startDate and endDate (startDate <= endDate) are required');
    err.status = 400;
    throw err;
  }

  const results = [];
  const cur = new Date(`${startNorm}T00:00:00Z`);
  const end = new Date(`${endNorm}T00:00:00Z`);
  let daysCount = 0;

  while (cur <= end && daysCount < 366) {
    const dateStr = cur.toISOString().split('T')[0];
    const updated = await setPackageAvailability(vendorId, packageId, {
      date: dateStr,
      slotName,
      totalUnits,
      status,
      reason,
    });
    results.push(updated);
    cur.setUTCDate(cur.getUTCDate() + 1);
    daysCount++;
  }
  return results;
}

/**
 * Checks whether a package (or vendor) has sufficient capacity on a date or date range.
 * Used by Customer Search (FR-SRCH-01..04), Public Availability API, and Booking Validation.
 */
async function checkPackageCapacityForRange({
  vendorId,
  packageId,
  startDate,
  endDate,
  slotName = 'ALL_DAY',
  requiredQty = 1,
}) {
  const startNorm = normalizeDateStr(startDate);
  const endNorm = normalizeDateStr(endDate || startDate);
  const qty = Math.max(1, Number(requiredQty || 1));

  if (!startNorm) {
    return { available: true, dates: [] };
  }

  const { vendorId: resolvedVendorId, defaultUnits } = packageId
    ? await getPackageDefaultCapacity(packageId)
    : { vendorId, defaultUnits: 1 };
  const targetVendorId = vendorId || resolvedVendorId;

  const cur = new Date(`${startNorm}T00:00:00Z`);
  const end = new Date(`${endNorm}T00:00:00Z`);
  const datesSummary = [];
  let allAvailable = true;

  let daysChecked = 0;
  while (cur <= end && daysChecked < 90) {
    const dStr = cur.toISOString().split('T')[0];

    // 1. Check vendor-level block
    const vendorBlock = await checkAvailability(targetVendorId, dStr);
    if (!vendorBlock.available) {
      allAvailable = false;
      datesSummary.push({
        date: dStr,
        slotName,
        totalUnits: defaultUnits,
        heldUnits: 0,
        bookedUnits: 0,
        availableUnits: 0,
        status: 'BLOCKED',
        availableForQty: false,
      });
      cur.setUTCDate(cur.getUTCDate() + 1);
      daysChecked++;
      continue;
    }

    // 2. Check package-level capacity if packageId provided
    if (packageId) {
      const rows = await getPackageAvailability(packageId, { startDate: dStr, endDate: dStr, slotName });
      if (rows.length > 0) {
        const row = rows[0];
        const ok = row.status !== 'BLOCKED' && row.availableUnits >= qty;
        if (!ok) allAvailable = false;
        datesSummary.push({
          ...row,
          availableForQty: ok,
        });
      } else {
        const availUnits = defaultUnits;
        const ok = availUnits >= qty;
        if (!ok) allAvailable = false;
        datesSummary.push({
          packageId,
          vendorId: targetVendorId,
          date: dStr,
          slotName,
          totalUnits: defaultUnits,
          heldUnits: 0,
          bookedUnits: 0,
          availableUnits: availUnits,
          status: availUnits > 0 ? 'AVAILABLE' : 'BOOKED_OUT',
          availableForQty: ok,
        });
      }
    } else {
      datesSummary.push({
        vendorId: targetVendorId,
        date: dStr,
        slotName,
        availableUnits: 1,
        status: 'AVAILABLE',
        availableForQty: true,
      });
    }

    cur.setUTCDate(cur.getUTCDate() + 1);
    daysChecked++;
  }

  return {
    available: allAvailable,
    requiredQty: qty,
    dates: datesSummary,
  };
}

// ============================================================================
// Atomic Hold / Release / Book Capacity (FR-VEN-06, SRS §11.4 Concurrency)
// ============================================================================
async function holdCapacity({
  vendorId,
  packageId,
  bookingId,
  date,
  slotName = 'ALL_DAY',
  quantity = 1,
}) {
  const dateNorm = normalizeDateStr(date);
  const qty = Math.max(1, Number(quantity || 1));
  const holdMinutes = Number(await getConfigValue('AVAILABILITY_HOLD_MINUTES', 15));
  const expiresAt = new Date(Date.now() + holdMinutes * 60 * 1000);

  // If no packageId was passed (legacy vendor-level hold), resolve the vendor's first active package or create a vendor-level hold
  let targetPackageId = packageId;
  if (!targetPackageId) {
    if (!db.isPgActive()) {
      const firstPkg = inMemoryStore.packages.find((p) => p.vendor_id === vendorId);
      targetPackageId = firstPkg ? firstPkg.id : `pkg_default_${vendorId}`;
    } else {
      const pkgRes = await db.query(`SELECT id FROM packages WHERE vendor_id = $1 LIMIT 1`, [vendorId]);
      targetPackageId = pkgRes.rows[0]?.id || `pkg_default_${vendorId}`;
    }
  }

  const lockKey = `${targetPackageId}:${dateNorm}:${slotName}`;

  if (!db.isPgActive()) {
    return inMemoryStore.withCapacityLock(lockKey, async () => {
      // Check vendor-level block first
      const vendorBlocked = inMemoryStore.availability.some(
        (a) => a.vendor_id === vendorId && normalizeDateStr(a.date) === dateNorm && a.status === 'BLOCKED'
      );
      if (vendorBlocked) {
        const err = new Error('Vendor has blocked this date');
        err.status = 409;
        err.code = 'CAPACITY_EXHAUSTED';
        throw err;
      }

      const { defaultUnits } = await getPackageDefaultCapacity(targetPackageId);
      let availRow = inMemoryStore.packageAvailability.find(
        (r) =>
          r.package_id === targetPackageId &&
          normalizeDateStr(r.avail_date) === dateNorm &&
          r.slot_name === slotName
      );

      if (!availRow) {
        availRow = {
          id: `pka_${crypto.randomBytes(6).toString('hex')}`,
          package_id: targetPackageId,
          vendor_id: vendorId,
          avail_date: dateNorm,
          slot_name: slotName,
          total_units: defaultUnits,
          held_units: 0,
          booked_units: 0,
          status: 'AVAILABLE',
          reason: null,
          created_at: new Date(),
          updated_at: new Date(),
        };
        inMemoryStore.packageAvailability.push(availRow);
      }

      if (availRow.status === 'BLOCKED') {
        const err = new Error('Package slot is blocked on this date');
        err.status = 409;
        err.code = 'CAPACITY_EXHAUSTED';
        throw err;
      }

      const remaining = availRow.total_units - availRow.held_units - availRow.booked_units;
      if (remaining < qty) {
        const err = new Error(`Insufficient package capacity on ${dateNorm} (requested ${qty}, remaining ${Math.max(0, remaining)})`);
        err.status = 409;
        err.code = 'CAPACITY_EXHAUSTED';
        throw err;
      }

      availRow.held_units += qty;
      availRow.status =
        availRow.total_units - availRow.held_units - availRow.booked_units === 0 ? 'BOOKED_OUT' : 'AVAILABLE';
      availRow.updated_at = new Date();

      const reservation = {
        id: `res_${crypto.randomBytes(6).toString('hex')}`,
        booking_id: bookingId || null,
        vendor_id: vendorId,
        package_id: targetPackageId,
        avail_date: dateNorm,
        slot_name: slotName,
        quantity: qty,
        status: 'HELD',
        expires_at: expiresAt,
        created_at: new Date(),
        updated_at: new Date(),
      };
      inMemoryStore.capacityReservations.push(reservation);

      return {
        reservationId: reservation.id,
        vendorId,
        packageId: targetPackageId,
        date: dateNorm,
        slotName,
        quantity: qty,
        status: 'HELD',
        expiresAt: expiresAt.toISOString(),
        availability: mapPackageAvailRow(availRow),
      };
    });
  }

  // PostgreSQL atomic transaction
  return db.withTransaction(async (client) => {
    const { defaultUnits } = await getPackageDefaultCapacity(targetPackageId);
    const seedId = `pka_${crypto.randomBytes(6).toString('hex')}`;

    await client.query(
      `INSERT INTO package_availability (id, package_id, vendor_id, avail_date, slot_name, total_units, held_units, booked_units, status)
       VALUES ($1, $2, $3, $4, $5, $6, 0, 0, 'AVAILABLE')
       ON CONFLICT (package_id, avail_date, slot_name) DO NOTHING`,
      [seedId, targetPackageId, vendorId, dateNorm, slotName, defaultUnits]
    );

    const upd = await client.query(
      `UPDATE package_availability
       SET held_units = held_units + $1,
           status = CASE WHEN (total_units - (held_units + $1) - booked_units) <= 0 THEN 'BOOKED_OUT' ELSE 'AVAILABLE' END,
           updated_at = NOW()
       WHERE package_id = $2
         AND avail_date = $3
         AND slot_name = $4
         AND status <> 'BLOCKED'
         AND (total_units - held_units - booked_units) >= $1
       RETURNING *`,
      [qty, targetPackageId, dateNorm, slotName]
    );

    if (upd.rows.length === 0) {
      const err = new Error(`Insufficient package capacity on ${dateNorm}`);
      err.status = 409;
      err.code = 'CAPACITY_EXHAUSTED';
      throw err;
    }

    const resId = `res_${crypto.randomBytes(6).toString('hex')}`;
    await client.query(
      `INSERT INTO capacity_reservations (id, booking_id, vendor_id, package_id, avail_date, slot_name, quantity, status, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'HELD', $8)`,
      [resId, bookingId || null, vendorId, targetPackageId, dateNorm, slotName, qty, expiresAt]
    );

    return {
      reservationId: resId,
      vendorId,
      packageId: targetPackageId,
      date: dateNorm,
      slotName,
      quantity: qty,
      status: 'HELD',
      expiresAt: expiresAt.toISOString(),
      availability: mapPackageAvailRow(upd.rows[0]),
    };
  });
}

async function bookCapacity({
  reservationId,
  bookingId,
  vendorId,
  packageId,
  date,
  slotName = 'ALL_DAY',
  quantity = 1,
}) {
  const dateNorm = normalizeDateStr(date);
  const qty = Math.max(1, Number(quantity || 1));

  if (!db.isPgActive()) {
    let reservation = null;
    if (reservationId) {
      reservation = inMemoryStore.capacityReservations.find((r) => r.id === reservationId);
    } else if (bookingId) {
      reservation = inMemoryStore.capacityReservations.find((r) => r.booking_id === bookingId && r.status === 'HELD');
    }

    const targetPackageId = reservation ? reservation.package_id : packageId || `pkg_default_${vendorId}`;
    const targetDate = reservation ? normalizeDateStr(reservation.avail_date) : dateNorm;
    const targetSlot = reservation ? reservation.slot_name : slotName;
    const targetQty = reservation ? Number(reservation.quantity) : qty;
    const targetVendorId = reservation ? reservation.vendor_id : vendorId;

    const lockKey = `${targetPackageId}:${targetDate}:${targetSlot}`;

    return inMemoryStore.withCapacityLock(lockKey, async () => {
      const { defaultUnits } = await getPackageDefaultCapacity(targetPackageId);
      let availRow = inMemoryStore.packageAvailability.find(
        (r) =>
          r.package_id === targetPackageId &&
          normalizeDateStr(r.avail_date) === targetDate &&
          r.slot_name === targetSlot
      );

      if (!availRow) {
        availRow = {
          id: `pka_${crypto.randomBytes(6).toString('hex')}`,
          package_id: targetPackageId,
          vendor_id: targetVendorId,
          avail_date: targetDate,
          slot_name: targetSlot,
          total_units: defaultUnits,
          held_units: 0,
          booked_units: 0,
          status: 'AVAILABLE',
          reason: null,
          created_at: new Date(),
          updated_at: new Date(),
        };
        inMemoryStore.packageAvailability.push(availRow);
      }

      if (reservation && reservation.status === 'HELD') {
        availRow.held_units = Math.max(0, availRow.held_units - targetQty);
        availRow.booked_units += targetQty;
        reservation.status = 'BOOKED';
        reservation.updated_at = new Date();
      } else {
        const remaining = availRow.total_units - availRow.held_units - availRow.booked_units;
        if (remaining < targetQty) {
          const err = new Error(`Insufficient package capacity to confirm booking on ${targetDate}`);
          err.status = 409;
          err.code = 'CAPACITY_EXHAUSTED';
          throw err;
        }
        availRow.booked_units += targetQty;
      }

      availRow.status =
        availRow.total_units - availRow.held_units - availRow.booked_units <= 0 ? 'BOOKED_OUT' : 'AVAILABLE';
      availRow.updated_at = new Date();

      return {
        reservationId: reservation ? reservation.id : null,
        vendorId: targetVendorId,
        packageId: targetPackageId,
        date: targetDate,
        slotName: targetSlot,
        quantity: targetQty,
        status: 'BOOKED',
        availability: mapPackageAvailRow(availRow),
      };
    });
  }

  return db.withTransaction(async (client) => {
    let targetPackageId = packageId || `pkg_default_${vendorId}`;
    let targetDate = dateNorm;
    let targetSlot = slotName;
    let targetQty = qty;
    let targetVendorId = vendorId;

    if (reservationId || bookingId) {
      const resLookup = await client.query(
        `SELECT * FROM capacity_reservations
         WHERE ($1::varchar IS NOT NULL AND id = $1)
            OR ($2::varchar IS NOT NULL AND booking_id = $2 AND status = 'HELD')
         LIMIT 1`,
        [reservationId || null, bookingId || null]
      );
      if (resLookup.rows.length > 0) {
        const r = resLookup.rows[0];
        targetPackageId = r.package_id;
        targetDate = normalizeDateStr(r.avail_date);
        targetSlot = r.slot_name;
        targetQty = Number(r.quantity);
        targetVendorId = r.vendor_id;

        await client.query(`UPDATE capacity_reservations SET status = 'BOOKED', updated_at = NOW() WHERE id = $1`, [r.id]);
        const upd = await client.query(
          `UPDATE package_availability
           SET held_units = GREATEST(0, held_units - $1),
               booked_units = booked_units + $1,
               status = CASE WHEN (total_units - GREATEST(0, held_units - $1) - (booked_units + $1)) <= 0 THEN 'BOOKED_OUT' ELSE 'AVAILABLE' END,
               updated_at = NOW()
           WHERE package_id = $2 AND avail_date = $3 AND slot_name = $4
           RETURNING *`,
          [targetQty, targetPackageId, targetDate, targetSlot]
        );
        return {
          reservationId: r.id,
          vendorId: targetVendorId,
          packageId: targetPackageId,
          date: targetDate,
          slotName: targetSlot,
          quantity: targetQty,
          status: 'BOOKED',
          availability: mapPackageAvailRow(upd.rows[0]),
        };
      }
    }

    const { defaultUnits } = await getPackageDefaultCapacity(targetPackageId);
    const seedId = `pka_${crypto.randomBytes(6).toString('hex')}`;
    await client.query(
      `INSERT INTO package_availability (id, package_id, vendor_id, avail_date, slot_name, total_units, held_units, booked_units, status)
       VALUES ($1, $2, $3, $4, $5, $6, 0, 0, 'AVAILABLE')
       ON CONFLICT (package_id, avail_date, slot_name) DO NOTHING`,
      [seedId, targetPackageId, targetVendorId, targetDate, targetSlot, defaultUnits]
    );

    const upd = await client.query(
      `UPDATE package_availability
       SET booked_units = booked_units + $1,
           status = CASE WHEN (total_units - held_units - (booked_units + $1)) <= 0 THEN 'BOOKED_OUT' ELSE 'AVAILABLE' END,
           updated_at = NOW()
       WHERE package_id = $2 AND avail_date = $3 AND slot_name = $4
         AND (total_units - held_units - booked_units) >= $1
       RETURNING *`,
      [targetQty, targetPackageId, targetDate, targetSlot]
    );

    if (upd.rows.length === 0) {
      const err = new Error(`Insufficient package capacity to confirm booking on ${targetDate}`);
      err.status = 409;
      err.code = 'CAPACITY_EXHAUSTED';
      throw err;
    }

    return {
      reservationId: null,
      vendorId: targetVendorId,
      packageId: targetPackageId,
      date: targetDate,
      slotName: targetSlot,
      quantity: targetQty,
      status: 'BOOKED',
      availability: mapPackageAvailRow(upd.rows[0]),
    };
  });
}

async function releaseCapacity({
  reservationId,
  bookingId,
  vendorId,
  packageId,
  date,
  slotName = 'ALL_DAY',
  quantity = 1,
}) {
  const dateNorm = normalizeDateStr(date);
  const qty = Math.max(1, Number(quantity || 1));

  if (!db.isPgActive()) {
    let reservation = null;
    if (reservationId) {
      reservation = inMemoryStore.capacityReservations.find((r) => r.id === reservationId);
    } else if (bookingId) {
      reservation = inMemoryStore.capacityReservations.find((r) => r.booking_id === bookingId);
    }

    const targetPackageId = reservation ? reservation.package_id : packageId || `pkg_default_${vendorId}`;
    const targetDate = reservation ? normalizeDateStr(reservation.avail_date) : dateNorm;
    const targetSlot = reservation ? reservation.slot_name : slotName;
    const targetQty = reservation ? Number(reservation.quantity) : qty;
    const targetVendorId = reservation ? reservation.vendor_id : vendorId;

    const lockKey = `${targetPackageId}:${targetDate}:${targetSlot}`;

    return inMemoryStore.withCapacityLock(lockKey, async () => {
      const availRow = inMemoryStore.packageAvailability.find(
        (r) =>
          r.package_id === targetPackageId &&
          normalizeDateStr(r.avail_date) === targetDate &&
          r.slot_name === targetSlot
      );

      if (availRow) {
        if (reservation && reservation.status === 'BOOKED') {
          availRow.booked_units = Math.max(0, availRow.booked_units - targetQty);
        } else {
          availRow.held_units = Math.max(0, availRow.held_units - targetQty);
        }
        if (availRow.status !== 'BLOCKED') {
          const rem = availRow.total_units - availRow.held_units - availRow.booked_units;
          availRow.status = rem > 0 ? 'AVAILABLE' : 'BOOKED_OUT';
        }
        availRow.updated_at = new Date();
      }

      if (reservation) {
        reservation.status = 'RELEASED';
        reservation.updated_at = new Date();
      }

      await triggerNotifyRequestsForVendorDate(targetVendorId, targetDate, targetPackageId);

      return {
        released: true,
        vendorId: targetVendorId,
        packageId: targetPackageId,
        date: targetDate,
        slotName: targetSlot,
        quantity: targetQty,
        availability: availRow ? mapPackageAvailRow(availRow) : null,
      };
    });
  }

  return db.withTransaction(async (client) => {
    let targetPackageId = packageId || `pkg_default_${vendorId}`;
    let targetDate = dateNorm;
    let targetSlot = slotName;
    let targetQty = qty;
    let targetVendorId = vendorId;
    let wasBooked = false;

    if (reservationId || bookingId) {
      const resLookup = await client.query(
        `SELECT * FROM capacity_reservations
         WHERE ($1::varchar IS NOT NULL AND id = $1)
            OR ($2::varchar IS NOT NULL AND booking_id = $2)
         LIMIT 1`,
        [reservationId || null, bookingId || null]
      );
      if (resLookup.rows.length > 0) {
        const r = resLookup.rows[0];
        targetPackageId = r.package_id;
        targetDate = normalizeDateStr(r.avail_date);
        targetSlot = r.slot_name;
        targetQty = Number(r.quantity);
        targetVendorId = r.vendor_id;
        wasBooked = r.status === 'BOOKED';
        await client.query(`UPDATE capacity_reservations SET status = 'RELEASED', updated_at = NOW() WHERE id = $1`, [r.id]);
      } else if (targetPackageId && targetDate && targetSlot) {
        const activeRes = await client.query(
          `SELECT * FROM capacity_reservations
           WHERE package_id = $1 AND avail_date = $2 AND slot_name = $3 AND status = 'HELD'
           ORDER BY created_at ASC LIMIT 1`,
          [targetPackageId, targetDate, targetSlot]
        );
        if (activeRes.rows.length > 0) {
          const r = activeRes.rows[0];
          wasBooked = r.status === 'BOOKED';
          await client.query(`UPDATE capacity_reservations SET status = 'RELEASED', updated_at = NOW() WHERE id = $1`, [r.id]);
        }
      }
    }

    const col = wasBooked ? 'booked_units' : 'held_units';
    const upd = await client.query(
      `UPDATE package_availability
       SET ${col} = GREATEST(0, ${col} - $1),
           status = CASE WHEN status = 'BLOCKED' THEN 'BLOCKED'
                         WHEN (total_units - held_units - booked_units + $1) > 0 THEN 'AVAILABLE'
                         ELSE 'BOOKED_OUT' END,
           updated_at = NOW()
       WHERE package_id = $2 AND avail_date = $3 AND slot_name = $4
       RETURNING *`,
      [targetQty, targetPackageId, targetDate, targetSlot]
    );

    let availRow = upd.rows[0];
    if (!availRow) {
      const checkRes = await client.query(
        `SELECT * FROM package_availability WHERE package_id = $1 AND avail_date = $2 AND slot_name = $3`,
        [targetPackageId, targetDate, targetSlot]
      );
      availRow = checkRes.rows[0];
    }

    await triggerNotifyRequestsForVendorDate(targetVendorId, targetDate, targetPackageId);

    return {
      released: true,
      vendorId: targetVendorId,
      packageId: targetPackageId,
      date: targetDate,
      slotName: targetSlot,
      quantity: targetQty,
      availability: availRow ? mapPackageAvailRow(availRow) : null,
    };
  });
}

module.exports = {
  checkAvailability,
  blockDate,
  unblockDate,
  getVendorBlockedDates,
  getPackageAvailability,
  setPackageAvailability,
  bulkSetPackageAvailability,
  checkPackageCapacityForRange,
  holdCapacity,
  bookCapacity,
  releaseCapacity,
  triggerNotifyRequestsForVendorDate,
};
